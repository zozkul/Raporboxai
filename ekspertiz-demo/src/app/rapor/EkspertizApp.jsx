'use client'
import { useState, useRef, useEffect } from "react";
import { Bot, Send, Copy, Download, Eye, EyeOff, RotateCcw, Settings, MessageSquare, CheckCircle2, FileText, Zap, Building2 } from "lucide-react";

const SESSION_USER = typeof window !== "undefined" && window.__EKSPERTIZ_USER__
  ? window.__EKSPERTIZ_USER__
  : { ad:"Zekeriyya Özkul", sicilNo:"GAY-2024-00142", sirket:"İnternorm Gayrimenkul Değerleme", lisans:"SPK Lisanslı Değerleme Uzmanı", tel:"0212 555 01 01", email:"z.ozkul@internorm.com.tr" };

const BANKS = [
  {id:"YapiKredi",label:"Yapı Kredi",color:"#F59E0B"},
  {id:"Akbank",label:"Akbank",color:"#EF4444"},
  {id:"Ziraat",label:"Ziraat",color:"#10B981"},
  {id:"IsBankasi",label:"İş Bankası",color:"#3B82F6"},
  {id:"Garanti",label:"Garanti",color:"#F97316"},
  {id:"Halkbank",label:"Halkbank",color:"#8B5CF6"},
];

const EXTRACT_PROMPT = `TAKBİS belgesinden tüm tapu bilgilerini çıkar. SADECE JSON döndür:
{"il":"","ilce":"","mahalle":"","mevkii":"","ada":"","parsel":"","atYuzolcum":"","nitelik":"","blok":"","kat":"","bbNo":"","arsaPay":"","zemin":"","kimlikNo":"","ciltSayfa":"","malik":"","tapuTarihi":"","edinme":"","anaTasinmazNitelik":"","beyanlar":[],"serhler":[],"irtifaklar":[],"rehinler":[]}`;

const QA_SYSTEM = (bank, tapu) => `Sen Türkiye'de lisanslı gayrimenkul değerleme uzmanı asistanısın. ${bank} bankası için SPK uyumlu ekspertiz raporu hazırlanıyor.
UZMAN: ${SESSION_USER.ad} | Sicil: ${SESSION_USER.sicilNo}
TAKBİS VERİSİ: ${JSON.stringify(tapu)}

ÖNEMLİ KURAL — WEB ARAŞTIRMASI:
TAKBİS'te il, ilçe, mahalle, ada, parsel bilgileri var. Önce web_search ile şunları kendin araştır:
1. Ada/parsel koordinatları → "${tapu?.il||''} ${tapu?.ilce||''} ${tapu?.mahalle||''} ada ${tapu?.ada||''} parsel ${tapu?.parsel||''} koordinat"
2. Bölge özellikleri, ulaşım, çevre → "${tapu?.mahalle||''} ${tapu?.ilce||''} ulaşım metro otobüs"
3. Yakın önemli noktalar → "${tapu?.mahalle||''} ${tapu?.ilce||''} hastane okul AVM"

Araştırma sonucunda bulduklarını özetle ve SADECE bulamadığın veya doğrulama gerektiren bilgileri uzmanına sor.

ARAŞTIRMA SONRASI — 2 GRUPTA SOR:

GRUP 1 (web araştırmasından sonra eksik kalanlar + bunlar):
- Taşınmazın tam sokak adresi ve iç kapı numarası (UAVT varsa)
- Bölge karakterini onayla veya düzelt

GRUP 2 — İMAR, RUHSAT & YAPI (hepsini tek mesajda sor):
TAKS, KAKS, imar plan tarihi, fonksiyon / Yapı ruhsatı ve iskan tarihleri / EKB sınıfı / Bina: kat sayısı, cephe, ısıtma, asansör, otopark / BB: brüt+net alan, oda sayısı, zemin/duvar/doğrama/kapı malzemeleri

GRUP 3 — DEĞERLEME & EMSALLER (hepsini tek mesajda sor):
Mevcut kullanım durumu / Birim değer TL/m² ve toplam değer TL / Emsaller (tanım, fiyat, tel, link) / Olumlu faktörler / Olumsuz faktörler

Tüm gruplar tamamlanınca RAPOR_HAZIR komutunu ver:
RAPOR_HAZIR
\`\`\`json
{"koordinat":"","adres":"","uavt":"","bolgeKarakter":"","topluTasima":"","cevreNoktalar":"","anaAkslar":"","taks":"","kaks":"","imarTarihi":"","imarFonksiyon":"","ruhsatlar":[],"ekb":"","binaKatSayisi":"","cephe":"","isitma":"","asansor":"","otopark":"","bbAlan":"","bbNet":"","bbOda":"","bbZemin":"","bbDuvar":"","bbDograma":"","bbKapi":"","kullanimDurumu":"","birimDeger":"","sonucDeger":"","emsaller":[{"aciklama":"","fiyat":"","tel":"","link":""}],"olumlu":[],"olumsuz":[],"qualityScore":90,"warnings":[]}
\`\`\``;

const REPORT_GEN_SYSTEM = `Sen SPK lisanslı gayrimenkul değerleme uzmanısın. Verilen ham verileri kullanarak profesyonel, resmi Türkçe ekspertiz raporu bölümleri yaz. Her bölüm için 2-4 cümlelik DETAYLI paragraf yaz. SADECE JSON döndür.`;

async function callAPI(system, messages, useSearch=false) {
  const r = await fetch("/api/claude", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514", max_tokens:2000, system, messages, use_search:useSearch})
  });
  if (!r.ok) throw new Error("API "+r.status);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message||JSON.stringify(d.error));
  if (Array.isArray(d.content)) {
    return d.content.filter(b=>b.type==="text").map(b=>b.text).join("\n") || "";
  }
  return "";
}

async function generateSections(tapu, soru, bank) {
  const prompt = `${bank} için ekspertiz raporu bölümleri yaz.\nTAKBİS: ${JSON.stringify(tapu)}\nSORUCEVAP: ${JSON.stringify(soru)}\nSADECE JSON:\n{"konumMetni":"","imarMetni":"","projeMaddeleri":["","",""],"yapiMetni":"","bbMetni":"","degerlemeMetni":"","sonucMetni":"","emsalGiris":""}`;
  const resp = await callAPI(REPORT_GEN_SYSTEM, [{role:"user",content:prompt}]);
  try { return JSON.parse(resp.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim()); } catch { return {}; }
}

function buildReport(bank, tapu, soru, sec, tarih) {
  const u=SESSION_USER; const t=tapu||{}; const s=soru||{}; const x=sec||{};
  const L=(a=[])=>a.map(b=>`-${b}`).join("\n")||"-Yok.";
  const ruhsatlar=(s.ruhsatlar||[]).join("\n")||"-Bilgi girilmedi.";
  const proj=(x.projeMaddeleri||[]).map(m=>`* ${m}`).join("\n\n");
  const emsaller=(s.emsaller||[]).map((e,i)=>`Emsal ${i+1}:\n${e.aciklama}${e.fiyat?` — ${e.fiyat}`:""}${e.tel?`\nTel: ${e.tel}`:""}${e.link?`\n${e.link}`:""}`).join("\n\n");
  const alan=parseFloat((s.bbAlan||"0").replace(/[^0-9.]/g,""))||0;
  const birim=parseFloat((s.birimDeger||"0").replace(/[^0-9.]/g,""))||0;
  const hesap=alan&&birim?`${alan} m² × ${birim.toLocaleString("tr-TR")} TL/m² = ${s.sonucDeger}`:s.sonucDeger||"—";
  return `GAYRİMENKUL DEĞERLEME RAPORU\n${"═".repeat(65)}\nRapor Tarihi        : ${tarih}\nDeğerleme Tarihi    : ${tarih}\nHedef Banka         : ${bank}\n\nDEĞERLEME UZMANI\n${"─".repeat(65)}\nAd / Soyad          : ${u.ad}\nSicil No            : ${u.sicilNo}\nŞirket              : ${u.sirket}\nLisans Türü         : ${u.lisans}\nTelefon             : ${u.tel}\nE-Posta             : ${u.email}\n\n${"─".repeat(65)}\nTAPU KAYIT BİLGİLERİ\n${"─".repeat(65)}\nİl / İlçe           : ${t.il||"—"} / ${t.ilce||"—"}\nMahalle / Mevkii    : ${t.mahalle||"—"} / ${t.mevkii||"—"}\nAda / Parsel        : ${t.ada||"—"} / ${t.parsel||"—"}\nBlok / Kat / BB No  : ${t.blok||"—"} / ${t.kat||"—"}. Kat / İç Kapı: ${t.bbNo||"—"}\nArsa Payı           : ${t.arsaPay||"—"}\nAT Yüzölçümü        : ${t.atYuzolcum||"—"}\nBağ. Bölüm Niteliği : ${t.nitelik||"—"}\nZemin Tipi          : ${t.zemin||"—"}\nTaşınmaz Kimlik No  : ${t.kimlikNo||"—"}\nCilt / Sayfa No     : ${t.ciltSayfa||"—"}\nAna Taşınmaz        : ${t.anaTasinmazNitelik||"—"}\nMalik               : ${t.malik||"—"}\nTapu Tarihi         : ${t.tapuTarihi||"—"}\nEdinme Sebebi       : ${t.edinme||"—"}\n\n${"─".repeat(65)}\nKONUM\n${"─".repeat(65)}\n${x.konumMetni||""}\n\nKoordinat           : ${s.koordinat||"—"}\nAdres               : ${s.adres||"—"}\nUAVT                : ${s.uavt||"—"}\n\n${"─".repeat(65)}\nİMAR DURUM BİLGİLERİ\n${"─".repeat(65)}\n${x.imarMetni||""}\n\n${"─".repeat(65)}\nPROJE BİLGİLERİ\n${"─".repeat(65)}\n${proj||"Proje bilgisi girilmedi."}\n\n${"─".repeat(65)}\nRUHSAT / İSKAN BİLGİLERİ\n${"─".repeat(65)}\n${ruhsatlar}${s.ekb?`\n\nEnerji Kimlik Belgesi: ${s.ekb}`:""}\n\n${"─".repeat(65)}\nTAKYİDATLAR\n${"─".repeat(65)}\nBeyanlar:\n${L(t.beyanlar)}\n\nŞerhler:\n${L(t.serhler)}\n\nHak ve Mükellefiyetler:\n${L(t.irtifaklar)}\n\nRehinler:\n${L(t.rehinler)}\n\n${"─".repeat(65)}\nYAPIYIN GENEL ÖZELLİKLERİ\n${"─".repeat(65)}\n${x.yapiMetni||""}\n\n${"─".repeat(65)}\nBAĞIMSIZ BÖLÜM ÖZELLİKLERİ\n${"─".repeat(65)}\n${x.bbMetni||""}\nMevcut Kullanım: ${s.kullanimDurumu||"—"}\n\n${"─".repeat(65)}\nDEĞERLEME METNİ\n${"─".repeat(65)}\n${x.degerlemeMetni||""}\n\nDeğerleme Emsal Karşılaştırma Yöntemi kullanılmıştır.\n${hesap} takdir edilmiştir.\n\n${x.sonucMetni||""}\n\n${(s.olumlu||[]).length>0?`Olumlu Faktörler\n${(s.olumlu||[]).map(o=>`+ ${o}`).join("\n")}`:""} ${(s.olumsuz||[]).length>0?`\n\nOlumsuz Faktörler\n${(s.olumsuz||[]).map(o=>`- ${o}`).join("\n")}`:""}\n\n${"─".repeat(65)}\nEMSALLER\n${"─".repeat(65)}\n${x.emsalGiris||""}\n\n${emsaller||"Emsal bilgisi girilmedi."}\n\n${"═".repeat(65)}\nSONUÇ DEĞERİ   : ${s.sonucDeger||"—"}\n${"═".repeat(65)}\nDeğerleme Uzmanı  : ${u.ad}\nSicil No          : ${u.sicilNo}\nTarih             : ${tarih}\n${"═".repeat(65)}`;
}

async function toBase64(file) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
}

export default function App({ onReportComplete }) {
  const [bank,setBank]=useState(null);
  const [takbisFile,setTakbisFile]=useState(null);
  const [msgs,setMsgs]=useState([{role:"ai",type:"welcome"}]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [busyMsg,setBusyMsg]=useState("");
  const [phase,setPhase]=useState("setup");
  const [pct,setPct]=useState(0);
  const [tapuData,setTapuData]=useState(null);
  const [soruData,setSoruData]=useState({});
  const [rapor,setRapor]=useState("");
  const [copied,setCopied]=useState(false);
  const [mobileTab,setMobileTab]=useState("setup");
  const [isMobile,setIsMobile]=useState(false);
  const hist=useRef([]);
  const bottom=useRef(null);
  const user=(typeof window!=="undefined"&&window.__EKSPERTIZ_USER__)||SESSION_USER;

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<=768);
    check();
    window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);

  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[msgs,busy]);

  function addMsg(role,type,text,extra){setMsgs(p=>[...p,{role,type,text,...extra}]);}

  async function startAnalysis(){
    if(!bank||!takbisFile)return;
    setMobileTab("chat");
    setPhase("analyzing");setBusy(true);setBusyMsg("TAKBİS belgesi okunuyor…");
    try{
      const b64=await toBase64(takbisFile);
      const mime=takbisFile.type||"application/pdf";
      const extractMsgs=[{role:"user",content:[
        {type:"text",text:"TAKBİS belgesindeki tüm tapu bilgilerini çıkar."},
        mime==="application/pdf"?{type:"document",source:{type:"base64",media_type:mime,data:b64}}:{type:"image",source:{type:"base64",media_type:mime,data:b64}}
      ]}];
      const extractResp=await callAPI(EXTRACT_PROMPT,extractMsgs);
      let parsed={};
      try{parsed=JSON.parse(extractResp.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim());}catch{}
      setTapuData(parsed);setPct(30);
      hist.current=[{role:"user",content:`TAKBİS okundu. Banka: ${bank}. Veriler: ${JSON.stringify(parsed)}. İlk grubu sor.`}];
      setBusyMsg("Konum ve bölge araştırılıyor…");
      const qaResp=await callAPI(QA_SYSTEM(bank,parsed),hist.current,true);
      hist.current.push({role:"assistant",content:qaResp});
      setPhase("qa");setBusy(false);setBusyMsg("");
      addMsg("ai","extracted",qaResp.replace(/```json[\s\S]*?```/g,"").trim(),{tapu:parsed});
    }catch(e){setBusy(false);setBusyMsg("");addMsg("ai","text",`Hata: ${e.message}`);setPhase("setup");}
  }

  async function sendMsg(txt){
    if(!txt.trim()||busy)return;
    setInput("");addMsg("user","text",txt);
    hist.current.push({role:"user",content:txt});
    setBusy(true);
    try{
      const resp=await callAPI(QA_SYSTEM(bank,tapuData),hist.current,false);
      hist.current.push({role:"assistant",content:resp});
      if(resp.includes("RAPOR_HAZIR")){
        setBusyMsg("Rapor metinleri yazılıyor…");
        let rdata={qualityScore:88,warnings:[]};
        const jm=resp.match(/```json\s*([\s\S]*?)```/);
        if(jm){try{rdata=JSON.parse(jm[1]);}catch{}}
        setSoruData(rdata);
        const sections=await generateSections(tapuData,rdata,bank);
        const tarih=new Date().toLocaleDateString("tr-TR");
        const raporMetni=buildReport(bank,tapuData,rdata,sections,tarih);
        setRapor(raporMetni);
        if(onReportComplete)onReportComplete(bank,tapuData,rdata,raporMetni,rdata.qualityScore||88);
        setPct(rdata.qualityScore||88);setPhase("done");
        addMsg("ai","report","",{data:{...rdata,sections},rapor:raporMetni});
        setBusy(false);setBusyMsg("");
      }else{
        addMsg("ai","text",resp.replace(/```json[\s\S]*?```/g,"").trim());
        setPct(p=>Math.min(85,p+15));setBusy(false);
      }
    }catch(e){addMsg("ai","text",`Hata: ${e.message}`);setBusy(false);}
  }

  function copyRapor(){navigator.clipboard.writeText(rapor).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});}

  function reset(){
    setPhase("setup");setBank(null);setTakbisFile(null);
    setMsgs([{role:"ai",type:"welcome"}]);hist.current=[];
    setPct(0);setTapuData(null);setSoruData({});setRapor("");setCopied(false);setBusyMsg("");setMobileTab("setup");
  }

  const canStart=bank&&takbisFile&&phase==="setup";

  return(
    <div style={{fontFamily:"'Sora',system-ui,sans-serif",background:"#080C18",height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,500&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;}
        ::-webkit-scrollbar-thumb{background:rgba(245,158,11,.25);border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes appSpin{to{transform:rotate(360deg)}}
        @keyframes dot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        .bank-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 4px 14px rgba(0,0,0,.3);}
        .bank-btn{transition:all .15s;}
        .primary-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
        .primary-btn{transition:all .15s;}
        textarea{transition:border-color .2s,box-shadow .2s;}
        textarea:focus{outline:none;}
      `}</style>

      {/* Header */}
      <header style={{background:"rgba(8,12,24,.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(245,158,11,.1)",padding:"0 18px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#F59E0B,#B45309)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 12px rgba(245,158,11,.35)"}}>
            <Building2 size={15} color="#080C18" strokeWidth={2} />
          </div>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:19,color:"#fff",letterSpacing:"-.3px"}}>Ekspertiz<span style={{color:"#F59E0B",fontStyle:"italic"}}>AI</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {phase==="done"&&<span style={{fontSize:11,fontWeight:600,background:"rgba(16,185,129,.12)",color:"#34D399",border:"1px solid rgba(16,185,129,.2)",padding:"3px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:5}}><CheckCircle2 size={11}/> Rapor Hazır</span>}
          <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.08)",borderRadius:22,padding:"4px 10px 4px 5px"}}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#B45309)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>{user.ad.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
            <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.65)",maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.ad}</span>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      {isMobile&&<div style={{display:"flex",background:"#0D1427",borderBottom:"1px solid rgba(255,255,255,.06)",flexShrink:0}}>
        {[["setup",<Settings size={13}/>, "Ayarlar"],["chat",<MessageSquare size={13}/>, "Sohbet"]].map(([t,icon,l])=>(
          <button key={t} onClick={()=>setMobileTab(t)}
            style={{flex:1,padding:"11px",border:"none",background:"transparent",color:mobileTab===t?"#F59E0B":"rgba(255,255,255,.35)",fontFamily:"inherit",fontSize:12,fontWeight:mobileTab===t?700:400,cursor:"pointer",borderBottom:mobileTab===t?"2px solid #F59E0B":"2px solid transparent",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {icon} {l}
          </button>
        ))}
      </div>}

      {/* Main */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>

        {/* Sidebar — desktop always visible, mobile only on setup tab */}
        <div
          style={{width:isMobile?"100%":264,flexShrink:0,background:"#0D1427",borderRight:"1px solid rgba(255,255,255,.05)",flexDirection:"column",overflowY:"auto",
            display: isMobile&&mobileTab==="chat"?"none":"flex"
          }}>
          <div style={{padding:"16px 14px",display:"flex",flexDirection:"column",gap:14,flex:1}}>

            {/* User */}
            <div style={{background:"linear-gradient(135deg,rgba(245,158,11,.07),rgba(245,158,11,.02))",border:"1px solid rgba(245,158,11,.12)",borderRadius:12,padding:"11px 13px"}}>
              <div style={{fontSize:9,fontWeight:700,color:"rgba(245,158,11,.5)",textTransform:"uppercase",letterSpacing:"1.8px",marginBottom:7}}>Aktif Uzman</div>
              <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:2}}>{user.ad}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginBottom:2}}>{user.sicilNo}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.25)",lineHeight:1.4}}>{user.sirket}</div>
            </div>

            {/* Banks */}
            <div>
              <SLabel num="1">Hedef Banka</SLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {BANKS.map(b=>(
                  <button key={b.id} className="bank-btn" onClick={()=>setBank(b.label)} disabled={phase!=="setup"}
                    style={{background:bank===b.label?`${b.color}15`:"rgba(255,255,255,.03)",border:`1.5px solid ${bank===b.label?b.color:"rgba(255,255,255,.07)"}`,borderRadius:10,padding:"9px 5px",cursor:phase==="setup"?"pointer":"not-allowed",color:bank===b.label?"#fff":"rgba(255,255,255,.4)",fontFamily:"inherit",fontSize:11,fontWeight:600,textAlign:"center",opacity:phase!=="setup"?.5:1}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:b.color,margin:"0 auto 5px",opacity:bank===b.label?1:.35}}/>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File */}
            <div>
              <SLabel num="2">TAKBİS Belgesi <span style={{color:"#EF4444",fontSize:9}}>*</span></SLabel>
              <label style={{border:`2px dashed ${takbisFile?"#10B981":"rgba(255,255,255,.1)"}`,borderRadius:11,padding:"16px 10px",textAlign:"center",cursor:phase==="setup"?"pointer":"not-allowed",display:"block",background:takbisFile?"rgba(16,185,129,.04)":"transparent",transition:"all .2s",opacity:phase!=="setup"&&!takbisFile?.45:1}}>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}} disabled={phase!=="setup"} onChange={e=>{if(e.target.files[0])setTakbisFile(e.target.files[0]);}}/>
                <div style={{display:"flex",justifyContent:"center",marginBottom:6,color:takbisFile?"#10B981":"rgba(255,255,255,.3)"}}>
                  {takbisFile ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                </div>
                <div style={{fontSize:11,fontWeight:600,color:takbisFile?"#10B981":"rgba(255,255,255,.4)",wordBreak:"break-all",lineHeight:1.4}}>{takbisFile?takbisFile.name:"TAKBİS / Tapu Belgesi"}</div>
                {!takbisFile&&<div style={{fontSize:10,color:"rgba(255,255,255,.2)",marginTop:3}}>PDF veya JPG / PNG</div>}
              </label>
            </div>

            {/* Start */}
            <button className="primary-btn" onClick={startAnalysis} disabled={!canStart}
              style={{background:canStart?"linear-gradient(135deg,#F59E0B,#B45309)":"rgba(255,255,255,.06)",color:canStart?"#080C18":"rgba(255,255,255,.2)",border:"none",borderRadius:12,padding:"13px",fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:canStart?"pointer":"not-allowed",boxShadow:canStart?"0 4px 20px rgba(245,158,11,.3)":"none",letterSpacing:"-.2px",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
              <Zap size={15} /> Analizi Başlat
            </button>

            {/* Steps */}
            <div>
              <SLabel>İlerleme</SLabel>
              {[["TAKBİS Okuma",pct>=30],["Veri Çıkarma",pct>=45],["Soru-Cevap",pct>=75],["Rapor Yazımı",pct>=90]].map(([l,done],i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:11,fontWeight:500,color:done?"#34D399":"rgba(255,255,255,.2)"}}>
                  <div style={{width:17,height:17,borderRadius:"50%",border:`1.5px solid ${done?"#10B981":"rgba(255,255,255,.12)"}`,background:done?"rgba(16,185,129,.12)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {done&&<CheckCircle2 size={9} color="#10B981" />}
                  </div>
                  {l}
                </div>
              ))}
              {pct>0&&<div style={{marginTop:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,.25)",marginBottom:4}}>
                  <span>Tamamlanma</span><span style={{color:"#F59E0B",fontWeight:600}}>{pct}%</span>
                </div>
                <div style={{height:3,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#F59E0B,#10B981)",borderRadius:2,transition:"width .7s ease"}}/>
                </div>
              </div>}
            </div>

            {phase!=="setup"&&<button onClick={reset} style={{background:"transparent",color:"rgba(255,255,255,.25)",border:"1px solid rgba(255,255,255,.07)",borderRadius:9,padding:"9px",fontFamily:"inherit",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <RotateCcw size={12} /> Yeni Rapor
            </button>}
          </div>
        </div>

        {/* Chat */}
        <div style={{flex:1,display:isMobile&&mobileTab==="setup"?"none":"flex",flexDirection:"column",background:"#080C18",overflow:"hidden",minHeight:0}}>
          {/* Chat header */}
          <div style={{background:"rgba(13,20,39,.85)",backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,.04)",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#F59E0B,#B45309)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(245,158,11,.3)"}}>
              <Bot size={17} color="#080C18" strokeWidth={2} />
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#fff",letterSpacing:"-.2px"}}>EkspertizAI</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>
                {phase==="done"?"Rapor tamamlandı":phase==="qa"?"Bilgiler tamamlanıyor…":phase==="analyzing"?"Belge analiz ediliyor…":"Banka seç ve belge yükle"}
              </div>
            </div>
            {bank&&<div style={{marginLeft:"auto",fontSize:11,fontWeight:600,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",padding:"3px 10px",borderRadius:20,color:"rgba(255,255,255,.4)"}}>{bank}</div>}
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
            {msgs.map((m,i)=><ChatBubble key={i} msg={m} onSend={sendMsg} onCopy={copyRapor} copied={copied} bank={bank} user={user}/>)}
            {busy&&(
              <div style={{display:"flex",gap:8,alignSelf:"flex-start",animation:"fadeUp .2s ease"}}>
                <BotAv/>
                <div style={{padding:"10px 14px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:"4px 14px 14px 14px",display:"flex",alignItems:"center",gap:10}}>
                  {busyMsg&&<span style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>{busyMsg}</span>}
                  <div style={{display:"flex",gap:4}}>{[0,150,300].map(d=><div key={d} style={{width:5,height:5,borderRadius:"50%",background:"#F59E0B",animation:`dot .9s ${d}ms ease infinite`}}/>)}</div>
                </div>
              </div>
            )}
            <div ref={bottom}/>
          </div>

          {/* Input */}
          <div style={{padding:"12px 16px 14px",background:"rgba(13,20,39,.9)",borderTop:"1px solid rgba(255,255,255,.04)",flexShrink:0}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <textarea value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(input);}}}
                disabled={phase==="setup"||phase==="analyzing"||busy}
                placeholder={phase==="setup"||phase==="analyzing"?"Analiz başladıktan sonra yazabilirsiniz…":"Yanıtınızı yazın… (Enter = gönder)"}
                rows={1}
                style={{flex:1,padding:"11px 14px",borderRadius:12,border:`1.5px solid ${input.trim()&&phase==="qa"?"rgba(245,158,11,.3)":"rgba(255,255,255,.08)"}`,background:"rgba(255,255,255,.04)",color:"#fff",fontFamily:"inherit",fontSize:13,resize:"none",lineHeight:1.55,opacity:phase==="setup"||phase==="analyzing"?.35:1,minHeight:42,maxHeight:110}}/>
              <button className="primary-btn" onClick={()=>sendMsg(input)} disabled={phase==="setup"||phase==="analyzing"||busy||!input.trim()}
                style={{width:42,height:42,borderRadius:12,flexShrink:0,background:input.trim()&&phase==="qa"?"linear-gradient(135deg,#F59E0B,#B45309)":"rgba(255,255,255,.07)",color:input.trim()&&phase==="qa"?"#080C18":"#fff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:(!input.trim()||phase==="setup"||phase==="analyzing")?.3:1,boxShadow:input.trim()&&phase==="qa"?"0 2px 12px rgba(245,158,11,.25)":"none"}}>
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SLabel({num,children}){return <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.25)",textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>{num&&<span style={{color:"#F59E0B",fontSize:10}}>{num}.</span>}{children}</div>;}
function BotAv(){return <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#F59E0B,#B45309)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}><Bot size={13} color="#080C18" strokeWidth={2} /></div>;}

function ChatBubble({msg,onSend,onCopy,copied,bank,user}){
  const isAi=msg.role==="ai";
  const [showFull,setShowFull]=useState(false);
  const t=msg.tapu||{};
  const bs={padding:"11px 15px",borderRadius:isAi?"4px 14px 14px 14px":"14px 4px 14px 14px",fontSize:13,lineHeight:1.75,background:isAi?"rgba(255,255,255,.05)":"linear-gradient(135deg,#F59E0B,#B45309)",border:isAi?"1px solid rgba(255,255,255,.07)":"none",color:"#fff",boxShadow:isAi?"none":"0 3px 14px rgba(245,158,11,.2)",maxWidth:"min(520px,85vw)",animation:"fadeUp .2s ease",wordBreak:"break-word"};
  let content;
  if(msg.type==="welcome"){
    content=<>Merhaba <strong>{(user||SESSION_USER).ad.split(" ")[0]}</strong>! Uzman bilgileriniz alındı.<br/><br/><strong>Banka seç → TAKBİS yükle → Analizi Başlat</strong><br/><br/>Konum, imar ve değerleme bilgilerini <strong>3 grupta</strong> soracağım. Her grubu tek mesajda cevaplayabilirsiniz.</>;
  } else if(msg.type==="extracted"){
    const chips=[
      t.ada&&t.parsel?{k:"Ada/Parsel",v:`${t.ada}/${t.parsel}`,c:"g"}:null,
      t.il&&t.ilce?{k:"İl/İlçe",v:`${t.il}/${t.ilce}`,c:"g"}:null,
      t.malik?{k:"Malik",v:t.malik.length>16?t.malik.substring(0,16)+"…":t.malik,c:"n"}:null,
      t.nitelik?{k:"Nitelik",v:t.nitelik.length>18?t.nitelik.substring(0,18)+"…":t.nitelik,c:"n"}:null,
      {k:"İpotek",v:t.rehinler?.length>0?`${t.rehinler.length} kayıt`:"Yok",c:t.rehinler?.length>0?"w":"g"},
    ].filter(Boolean);
    const cc={g:"rgba(52,211,153,.9)",w:"rgba(245,158,11,.9)",n:"rgba(255,255,255,.6)"};
    const cb={g:"rgba(16,185,129,.08)",w:"rgba(245,158,11,.08)",n:"rgba(255,255,255,.04)"};
    const cbr={g:"rgba(16,185,129,.15)",w:"rgba(245,158,11,.15)",n:"rgba(255,255,255,.08)"};
    content=<>
      <div dangerouslySetInnerHTML={{__html:msg.text.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}}/>
      {chips.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginTop:10}}>
        {chips.map((c,i)=><div key={i} style={{background:cb[c.c],border:`1px solid ${cbr[c.c]}`,borderRadius:8,padding:"5px 9px"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,.3)",fontWeight:600,letterSpacing:".5px",textTransform:"uppercase"}}>{c.k}</div>
          <div style={{fontSize:11,fontWeight:700,color:cc[c.c],marginTop:1}}>{c.v}</div>
        </div>)}
      </div>}
    </>;
  } else if(msg.type==="report"){
    content=<ReportCard data={msg.data} bank={bank} rapor={msg.rapor} onCopy={onCopy} copied={copied} showFull={showFull} setShowFull={setShowFull}/>;
  } else {
    content=<div dangerouslySetInnerHTML={{__html:(msg.text||"").replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}}/>;
  }
  return(
    <div style={{display:"flex",gap:8,alignSelf:isAi?"flex-start":"flex-end",flexDirection:isAi?"row":"row-reverse",maxWidth:"92%"}}>
      {isAi?<BotAv/>:<div style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"rgba(255,255,255,.4)",fontWeight:700,flexShrink:0,marginTop:2}}>SZ</div>}
      <div style={bs}>{content}</div>
    </div>
  );
}

function ReportCard({data,bank,rapor,onCopy,copied,showFull,setShowFull}){
  const score=data?.qualityScore||88;
  const warns=data?.warnings||[];
  function downloadRapor(){
    const blob=new Blob([rapor],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`ekspertiz-raporu-${new Date().toLocaleDateString("tr-TR").replace(/\./g,"-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return(
    <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(245,158,11,.18)",borderRadius:14,overflow:"hidden",minWidth:"min(300px,80vw)",maxWidth:"min(460px,90vw)"}}>
      <div style={{background:"linear-gradient(135deg,rgba(245,158,11,.12),rgba(180,83,9,.08))",padding:"12px 15px",borderBottom:"1px solid rgba(245,158,11,.12)"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:"#F59E0B",marginBottom:2}}>Gayrimenkul Değerleme Raporu</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>{bank} · {new Date().toLocaleDateString("tr-TR")}</div>
      </div>
      <div style={{padding:"12px 15px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:50,height:50,borderRadius:"50%",position:"relative",flexShrink:0,background:`conic-gradient(${score>=85?"#10B981":"#F59E0B"} ${score*3.6}deg, rgba(255,255,255,.06) 0)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:"#0D1427",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#fff",lineHeight:1}}>{score}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,.3)"}}>/100</div>
          </div>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600,color:score>=85?"#34D399":"#F59E0B"}}>Kalite: {score>=90?"Çok İyi":score>=75?"İyi":"Orta"}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>AI tarafından yazıldı · {bank}</div>
        </div>
      </div>
      {warns.length>0&&<div style={{margin:"0 12px 10px",padding:"7px 11px",background:"rgba(245,158,11,.07)",border:"1px solid rgba(245,158,11,.14)",borderRadius:8,fontSize:11,color:"#F59E0B"}}>⚠ {warns.join(" · ")}</div>}
      {showFull&&<div style={{margin:"0 12px 10px"}}>
        <pre style={{padding:"12px",background:"rgba(0,0,0,.4)",border:"1px solid rgba(255,255,255,.06)",borderRadius:9,fontSize:10,color:"rgba(255,255,255,.65)",lineHeight:1.8,whiteSpace:"pre-wrap",fontFamily:"'Courier New',monospace",maxHeight:360,overflowY:"auto"}}>{rapor}</pre>
      </div>}
      <div style={{padding:"10px 12px",borderTop:"1px solid rgba(255,255,255,.05)",display:"flex",gap:6,flexWrap:"wrap"}}>
        <button onClick={onCopy} style={{flex:1,minWidth:120,padding:"10px",borderRadius:10,border:"none",background:copied?"#10B981":"linear-gradient(135deg,#F59E0B,#B45309)",color:copied?"#fff":"#080C18",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",transition:"background .2s",letterSpacing:"-.2px",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <Copy size={13} /> {copied?"Kopyalandı":"Kopyala"}
        </button>
        <button onClick={downloadRapor} style={{flex:1,minWidth:100,padding:"10px",borderRadius:10,border:"1px solid rgba(59,130,246,.3)",background:"rgba(59,130,246,.1)",color:"#60a5fa",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <Download size={13} /> İndir
        </button>
        <button onClick={()=>setShowFull(p=>!p)} style={{padding:"10px 13px",borderRadius:10,border:"1px solid rgba(255,255,255,.09)",background:"transparent",color:"rgba(255,255,255,.4)",fontFamily:"inherit",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {showFull?<EyeOff size={14}/>:<Eye size={14}/>}
        </button>
      </div>
    </div>
  );
}
