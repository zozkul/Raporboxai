'use client'
import { useState, useRef, useEffect } from "react";

const SESSION_USER = typeof window !== "undefined" && window.__EKSPERTIZ_USER__
  ? window.__EKSPERTIZ_USER__
  : {
      ad: "Zekeriyya Özkul",
      sicilNo: "GAY-2024-00142",
      sirket: "İnternorm Gayrimenkul Değerleme ve Danışmanlık A.Ş.",
      lisans: "SPK Lisanslı Değerleme Uzmanı",
      tel: "0212 555 01 01",
      email: "z.ozkul@internorm.com.tr",
    };

const BANKS = [
  {id:"YapiKredi",label:"Yapı Kredi",icon:"💛"},
  {id:"Akbank",label:"Akbank",icon:"🏦"},
  {id:"Ziraat",label:"Ziraat",icon:"🌿"},
  {id:"IsBankasi",label:"İş Bankası",icon:"🔵"},
  {id:"Garanti",label:"Garanti",icon:"🟠"},
  {id:"Halkbank",label:"Halkbank",icon:"🟣"},
];

// TAKBİS'ten sadece ham veri çıkar
const EXTRACT_PROMPT = `TAKBİS belgesinden tüm tapu bilgilerini çıkar. SADECE JSON döndür, başka hiçbir şey yazma:
{
  "il": "", "ilce": "", "mahalle": "", "mevkii": "",
  "ada": "", "parsel": "", "atYuzolcum": "",
  "nitelik": "", "blok": "", "kat": "", "bbNo": "",
  "arsaPay": "", "zemin": "", "kimlikNo": "", "ciltSayfa": "",
  "malik": "", "tapuTarihi": "", "edinme": "",
  "anaTasinmazNitelik": "",
  "beyanlar": [], "serhler": [], "irtifaklar": [], "rehinler": []
}`;

// Q&A system prompt — 3 grupta sorar, AI uzun paragraf üretir
const QA_SYSTEM = (bank, tapu) => `Sen Türkiye'de lisanslı gayrimenkul değerleme uzmanı asistanısın. ${bank} bankası için SPK uyumlu ekspertiz raporu hazırlanıyor.

UZMAN: ${SESSION_USER.ad} | Sicil: ${SESSION_USER.sicilNo} | Şirket: ${SESSION_USER.sirket}

TAKBİS'TEN ÇIKARILAN VERİ:
${JSON.stringify(tapu, null, 2)}

GÖREV: Aşağıdaki 3 GRUBU SIRAYLA sor. Her grubu tek mesajda sor, cevap alınca sonrakine geç.

GRUP 1 — KONUM & ADRES:
- Koordinat (enlem, boylam)
- Tam adres (sokak, bina no, iç kapı no, UAVT varsa)
- Bölgenin genel karakteri (merkezi mi, sakin mi, işlek mi)
- En yakın toplu taşıma (metro, metrobüs, otobüs — kaç dk yürüme)
- Çevredeki önemli noktalar (AVM, hastane, okul, park vb.)
- Ana ulaşım aksları (hangi cadde/bulvar üzerinde)

GRUP 2 — İMAR, RUHSAT & YAPI:
- İmar durumu (TAKS, KAKS, plan tarihi, fonksiyon)
- Yapı ruhsatı tarihi ve sayısı
- İskan belgesi tarihi
- EKB sınıfı ve numarası
- Binanın genel özellikleri (kat sayısı, cephe, ısıtma, asansör, otopark)
- Bağımsız bölüm özellikleri (alan, oda sayısı, zemin, duvar, doğrama, kapı)

GRUP 3 — DEĞERLEME & EMSALLER:
- Mevcut kullanım durumu (boş/kiracı/malik)
- Belirlenen birim değer (TL/m²)
- Toplam piyasa değeri (TL)
- Emsaller (her emsal için: kısa tanım, fiyat, telefon, link varsa)
- Olumlu faktörler (liste)
- Olumsuz faktörler (liste)

Tüm gruplar tamamlanınca RAPOR_HAZIR komutunu ver.

RAPOR_HAZIR formatı — JSON içinde kısa notlar ver, uzun metinleri AI üretecek:
RAPOR_HAZIR
\`\`\`json
{
  "koordinat": "...",
  "adres": "...",
  "uavt": "...",
  "bolgeKarakter": "...",
  "topluTasima": "...",
  "cevreNoktalar": "...",
  "anaAkslar": "...",
  "taks": "...", "kaks": "...", "imarTarihi": "...", "imarFonksiyon": "...",
  "ruhsatlar": ["..."],
  "ekb": "...",
  "binaKatSayisi": "...", "cephe": "...", "isitma": "...", "asansor": "...", "otopark": "...",
  "bbAlan": "...", "bbOda": "...", "bbZemin": "...", "bbDuvar": "...", "bbDoğrama": "...", "bbKapi": "...",
  "kullanimDurumu": "...",
  "birimDeger": "...",
  "sonucDeger": "...",
  "emsaller": [{"aciklama":"...","fiyat":"...","tel":"...","link":"..."}],
  "olumlu": ["..."],
  "olumsuz": ["..."],
  "qualityScore": 90,
  "warnings": []
}
\`\`\``;

// Rapor metin üretici — AI'ya uzun paragraf yazdırır
const REPORT_GEN_SYSTEM = `Sen Türkiye'de SPK lisanslı gayrimenkul değerleme uzmanısın. Verilen ham verileri kullanarak profesyonel, resmi Türkçe ile ekspertiz raporu bölümleri yaz. 

Her bölüm için UZUN, DETAYLI paragraflar yaz — tıpkı gerçek bir ekspertiz raporundaki gibi. Kısa bullet point YAZMA. Resmî, akıcı Türkçe kullan.`;

async function callAPI(system, messages) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system, messages }),
  });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  return d.content?.[0]?.text || "";
}

async function generateReportSections(tapu, soru, bank) {
  const prompt = `Aşağıdaki verilerle ${bank} bankası için ekspertiz raporu bölümlerini yaz.

TAKBİS VERİSİ: ${JSON.stringify(tapu)}
SORU-CEVAP VERİSİ: ${JSON.stringify(soru)}
UZMAN: ${SESSION_USER.ad}, Sicil: ${SESSION_USER.sicilNo}

Şu bölümleri yaz (her biri için 2-4 cümlelik profesyonel paragraf):

1. KONUM_METNI: Taşınmazın konumunu anlatan paragraf. İl, ilçe, mahalle, ulaşım aksları, çevre, toplu taşıma, altyapı durumunu içermeli.

2. IMAR_METNI: İmar durumunu anlatan paragraf. Belediye, plan tarihi, TAKS/KAKS, fonksiyon, yola terk durumunu içermeli.

3. PROJE_MADDELERI: Proje bilgilerini anlatan 3-4 madde (madde başına * işareti koy)

4. YAPI_METNI: Yapının genel özelliklerini anlatan paragraf. Blok sayısı, kat adedi, cephe, ısıtma, asansör, otopark, bina girişi.

5. BB_METNI: Bağımsız bölüm özelliklerini anlatan iki paragraf. Kat konumu, oda düzeni, alan; sonra zemin/duvar/doğrama/kapı malzemeleri.

6. DEGERLEME_METNI: Değerleme metodolojisini anlatan paragraf.

7. SONUC_METNI: Sonuç ve genel değerlendirme paragrafı.

8. EMSAL_GIRIS: Emsal bölümü giriş paragrafı.

SADECE JSON döndür:
{
  "konumMetni": "...",
  "imarMetni": "...",
  "projeMaddeleri": ["...", "...", "..."],
  "yapiMetni": "...",
  "bbMetni": "...",
  "degerlemeMetni": "...",
  "sonucMetni": "...",
  "emsalGiris": "..."
}`;

  const resp = await callAPI(REPORT_GEN_SYSTEM, [{ role: "user", content: prompt }]);
  try {
    const clean = resp.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

function buildReport(bank, tapu, soru, sections, tarih) {
  const u = SESSION_USER;
  const t = tapu || {};
  const s = soru || {};
  const sec = sections || {};

  const beyanlar = (t.beyanlar||[]).map(b=>`-${b}`).join("\n") || "-Beyan bulunmamaktadır.";
  const serhler = (t.serhler||[]).map(b=>`-${b}`).join("\n") || "-Şerh bulunmamaktadır.";
  const irtifaklar = (t.irtifaklar||[]).map(b=>`-M: ${b}`).join("\n") || "-İrtifak bulunmamaktadır.";
  const rehinler = (t.rehinler||[]).map(b=>`-${b}`).join("\n") || "-Rehin bulunmamaktadır.";

  const ruhsatlar = (s.ruhsatlar||[]).join("\n") || "-Ruhsat bilgisi girilmedi.";
  const projeMaddeleri = (sec.projeMaddeleri||[]).map(m=>`* ${m}`).join("\n\n");
  const emsaller = (s.emsaller||[]).map((e,i)=>`Emsal ${i+1}:\n${e.aciklama}${e.fiyat?` — ${e.fiyat}`:""}${e.tel?`\nEmlak Ofisinden: ${e.tel}`:""}${e.link?`\n${e.link}`:""}`).join("\n\n");
  const olumlu = (s.olumlu||[]).map(o=>`+ ${o}`).join("\n");
  const olumsuz = (s.olumsuz||[]).map(o=>`- ${o}`).join("\n");

  // Birim hesap
  const alan = parseFloat((s.bbAlan||"0").replace(/[^0-9.]/g,"")) || 0;
  const birim = parseFloat((s.birimDeger||"0").replace(/[^0-9.]/g,"")) || 0;
  const hesap = alan && birim ? `${alan} m² × ${birim.toLocaleString("tr-TR")} TL/m² = ${s.sonucDeger}` : s.sonucDeger || "—";

  return `GAYRİMENKUL DEĞERLEME RAPORU
${"═".repeat(65)}
Rapor Tarihi        : ${tarih}
Değerleme Tarihi    : ${tarih}
Hedef Banka         : ${bank}

DEĞERLEME UZMANI
${"─".repeat(65)}
Ad / Soyad          : ${u.ad}
Sicil No            : ${u.sicilNo}
Şirket              : ${u.sirket}
Lisans Türü         : ${u.lisans}
Telefon             : ${u.tel}
E-Posta             : ${u.email}

${"─".repeat(65)}
TAPU KAYIT BİLGİLERİ
${"─".repeat(65)}
İl / İlçe           : ${t.il||"—"} / ${t.ilce||"—"}
Mahalle / Mevkii    : ${t.mahalle||"—"} / ${t.mevkii||"—"}
Ada / Parsel        : ${t.ada||"—"} / ${t.parsel||"—"}
Blok / Kat / BB No  : ${t.blok||"—"} Blok / ${t.kat||"—"}. Kat / İç Kapı No: ${t.bbNo||"—"}
Arsa Payı           : ${t.arsaPay||"—"}
AT Yüzölçümü        : ${t.atYuzolcum||"—"}
Bağ. Bölüm Niteliği : ${t.nitelik||"—"}
Zemin Tipi          : ${t.zemin||"—"}
Taşınmaz Kimlik No  : ${t.kimlikNo||"—"}
Cilt / Sayfa No     : ${t.ciltSayfa||"—"}
Ana Taşınmaz        : ${t.anaTasinmazNitelik||"—"}
Malik               : ${t.malik||"—"}
Tapu Tarihi         : ${t.tapuTarihi||"—"}
Edinme Sebebi       : ${t.edinme||"—"}

${"─".repeat(65)}
KONUM
${"─".repeat(65)}
${sec.konumMetni || "Konum bilgisi girilmedi."}

Koordinat Bilgileri : ${s.koordinat||"—"}
Adres               : ${s.adres||"—"}
UAVT                : ${s.uavt||"—"}

${"─".repeat(65)}
İMAR DURUM BİLGİLERİ
${"─".repeat(65)}
${sec.imarMetni || "İmar durumu bilgisi girilmedi."}

${"─".repeat(65)}
PROJE BİLGİLERİ
${"─".repeat(65)}
${projeMaddeleri || "Proje bilgisi girilmedi."}

${"─".repeat(65)}
RUHSAT / İSKAN BİLGİLERİ
${"─".repeat(65)}
${ruhsatlar}
${s.ekb ? `\nEnerji Kimlik Belgesi: ${s.ekb}` : ""}

${"─".repeat(65)}
TAKYİDATLAR
${"─".repeat(65)}
Beyanlar Bölümü:
${beyanlar}

Şerhler Hanesinde:
${serhler}

Hak ve Mükellefiyetler Hanesinde:
${irtifaklar}

Rehinler Hanesinde:
${rehinler}

${"─".repeat(65)}
YAPININ GENEL ÖZELLİKLERİ
${"─".repeat(65)}
${sec.yapiMetni || "Yapı genel özellikleri girilmedi."}

${"─".repeat(65)}
BAĞIMSIZ BÖLÜM ÖZELLİKLERİ
${"─".repeat(65)}
İç Özellik Detayları / Tefrişat Metni
${sec.bbMetni || "Bağımsız bölüm özellikleri girilmedi."}
Mevcut Kullanım Durumu: ${s.kullanimDurumu || "—"}

${"─".repeat(65)}
DEĞERLEME METNİ / SORUMLU UZMAN SONUÇ CÜMLESİ
${"─".repeat(65)}
${sec.degerlemeMetni || "Değerleme metni girilmedi."}

Değerleme Emsal Karşılaştırma Yöntemi kullanılarak yapılmıştır.
Değerleme aşamasında Maliyet Yönteminden faydalanılmamıştır.
Değerleme aşamasında Gelir Yönteminden faydalanılmamıştır.

Emsal Karşılaştırma Yöntemi kullanılarak taşınmazın Yasal ve Mevcut Durum Değeri:
${hesap} takdir edilmiştir.

SONUÇ
${sec.sonucMetni || ""}

${olumlu ? `Olumlu Faktörler\n${olumlu}` : ""}

${olumsuz ? `\nOlumsuz Faktörler\n${olumsuz}` : ""}

${"─".repeat(65)}
EMSALLER
${"─".repeat(65)}
${sec.emsalGiris || ""}

${emsaller || "Emsal bilgisi girilmedi."}

${"═".repeat(65)}
SONUÇ DEĞERİ   : ${s.sonucDeger||"—"}
${"═".repeat(65)}
Değerleme Uzmanı  : ${u.ad}
Sicil No          : ${u.sicilNo}
Şirket            : ${u.sirket}
Tarih             : ${tarih}
${"═".repeat(65)}`;
}

async function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function App({ onReportComplete }) {
  const [bank, setBank] = useState(null);
  const [takbisFile, setTakbisFile] = useState(null);
  const [msgs, setMsgs] = useState([{ role: "ai", type: "welcome" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [phase, setPhase] = useState("setup");
  const [steps, setSteps] = useState([0,0,0,0]);
  const [pct, setPct] = useState(0);
  const [tapuData, setTapuData] = useState(null);
  const [soruData, setSoruData] = useState({});
  const [rapor, setRapor] = useState("");
  const [copied, setCopied] = useState(false);
  const hist = useRef([]);
  const bottom = useRef(null);

  // Oturum verisi varsa güncelle
  const user = (typeof window !== "undefined" && window.__EKSPERTIZ_USER__) || SESSION_USER;

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  function stepSet(i, v) { setSteps(p => { const n = [...p]; n[i] = v; return n; }); }
  function addMsg(role, type, text, extra) { setMsgs(p => [...p, { role, type, text, ...extra }]); }

  async function startAnalysis() {
    if (!bank || !takbisFile) return;
    setPhase("analyzing"); setBusy(true); stepSet(0, 1);
    setBusyMsg("TAKBİS belgesi AI tarafından okunuyor…");

    try {
      const b64 = await toBase64(takbisFile);
      const mime = takbisFile.type || "application/pdf";

      const extractMsgs = [{
        role: "user",
        content: [
          { type: "text", text: "Bu TAKBİS belgesindeki tüm tapu bilgilerini çıkar." },
          mime === "application/pdf"
            ? { type: "document", source: { type: "base64", media_type: mime, data: b64 } }
            : { type: "image", source: { type: "base64", media_type: mime, data: b64 } }
        ]
      }];

      const extractResp = await callAPI(EXTRACT_PROMPT, extractMsgs);
      stepSet(0, 2); stepSet(1, 2); stepSet(2, 1);

      let parsed = {};
      try {
        const clean = extractResp.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
        parsed = JSON.parse(clean);
      } catch { parsed = {}; }
      setTapuData(parsed);
      setPct(35);

      // Q&A başlat
      const initMsg = `TAKBİS okundu. Banka: ${bank}. Çıkarılan veriler: ${JSON.stringify(parsed)}. İlk grubu sor.`;
      hist.current = [{ role: "user", content: initMsg }];

      setBusyMsg("Sorular hazırlanıyor…");
      const qaResp = await callAPI(QA_SYSTEM(bank, parsed), hist.current);
      hist.current.push({ role: "assistant", content: qaResp });

      setPhase("qa"); setBusy(false); setBusyMsg("");
      addMsg("ai", "extracted", qaResp.replace(/```json[\s\S]*?```/g,"").trim(), { tapu: parsed });
    } catch(e) {
      setBusy(false); setBusyMsg("");
      addMsg("ai", "text", `Hata: ${e.message}`);
      setPhase("setup");
    }
  }

  async function sendMsg(txt) {
    if (!txt.trim() || busy) return;
    setInput("");
    addMsg("user", "text", txt);
    hist.current.push({ role: "user", content: txt });
    setBusy(true);

    try {
      const resp = await callAPI(QA_SYSTEM(bank, tapuData), hist.current);
      hist.current.push({ role: "assistant", content: resp });

      if (resp.includes("RAPOR_HAZIR")) {
        stepSet(2, 2); stepSet(3, 1); setBusyMsg("Rapor metinleri AI tarafından yazılıyor…");
        let rdata = { qualityScore: 88, warnings: [] };
        const jm = resp.match(/```json\s*([\s\S]*?)```/);
        if (jm) { try { rdata = JSON.parse(jm[1]); } catch {} }
        setSoruData(rdata);

        // AI ile uzun paragraf metinler üret
        const sections = await generateReportSections(tapuData, rdata, bank);
        const tarih = new Date().toLocaleDateString("tr-TR");
        const raporMetni = buildReport(bank, tapuData, rdata, sections, tarih);
        setRapor(raporMetni);

        if (onReportComplete) {
          onReportComplete(bank, tapuData, rdata, raporMetni, rdata.qualityScore || 88);
        }

        setTimeout(() => {
          stepSet(3, 2); setPhase("done");
          setPct(rdata.qualityScore || 88);
          addMsg("ai", "report", "", { data: { ...rdata, sections }, rapor: raporMetni });
          setBusy(false); setBusyMsg("");
        }, 600);
      } else {
        const clean = resp.replace(/```json[\s\S]*?```/g,"").trim();
        addMsg("ai", "text", clean);
        setPct(p => Math.min(85, p + 15));
        setBusy(false);
      }
    } catch(e) {
      addMsg("ai", "text", `Hata: ${e.message}`);
      setBusy(false);
    }
  }

  function copyRapor() {
    navigator.clipboard.writeText(rapor).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  function reset() {
    setPhase("setup"); setBank(null); setTakbisFile(null);
    setMsgs([{ role: "ai", type: "welcome" }]); hist.current = [];
    setPct(0); setSteps([0,0,0,0]); setTapuData(null);
    setSoruData({}); setRapor(""); setCopied(false); setBusyMsg("");
  }

  const canStart = bank && takbisFile && phase === "setup";

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#0F172A", height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ borderBottom:"1px solid rgba(255,255,255,.07)", padding:"0 18px", height:50, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"#0F172A" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:18, color:"#fff" }}>Ekspertiz<span style={{color:"#3B82F6"}}>AI</span></div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {bank && <Chip color="blue">{bank}</Chip>}
          {takbisFile && <Chip color="green">TAKBİS ✓</Chip>}
          {phase==="done" && <Chip color="green">Rapor Hazır ✓</Chip>}
          <UserChip user={user}/>
        </div>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:248, flexShrink:0, background:"#1E293B", borderRight:"1px solid rgba(255,255,255,.07)", display:"flex", flexDirection:"column", padding:"14px 12px", gap:12, overflowY:"auto" }}>
          <UserCard user={user}/>

          <div>
            <SLabel>1. Hedef Banka</SLabel>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
              {BANKS.map(b=>(
                <button key={b.id} onClick={()=>setBank(b.label)} disabled={phase!=="setup"}
                  style={{ background:bank===b.label?"rgba(59,130,246,.2)":"rgba(255,255,255,.05)", border:`1.5px solid ${bank===b.label?"#3B82F6":"rgba(255,255,255,.08)"}`, borderRadius:8, padding:"7px 4px", cursor:phase==="setup"?"pointer":"not-allowed", color:bank===b.label?"#fff":"rgba(255,255,255,.5)", fontFamily:"inherit", fontSize:10, fontWeight:600, textAlign:"center", opacity:phase!=="setup"?.6:1 }}>
                  <div style={{ fontSize:14, marginBottom:2 }}>{b.icon}</div>{b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SLabel>2. TAKBİS Belgesi <span style={{color:"#EF4444",fontSize:9}}>zorunlu</span></SLabel>
            <FileZone file={takbisFile} onChange={setTakbisFile} icon="📋" label="TAKBİS / Tapu" sub="PDF veya JPG/PNG" color="green" disabled={phase!=="setup"}/>
          </div>

          <button onClick={startAnalysis} disabled={!canStart}
            style={{ background:canStart?"linear-gradient(135deg,#3B82F6,#1D4ED8)":"rgba(255,255,255,.08)", color:"#fff", border:"none", borderRadius:10, padding:12, fontFamily:"inherit", fontSize:14, fontWeight:600, cursor:canStart?"pointer":"not-allowed", opacity:canStart?1:.4 }}>
            🚀 Analizi Başlat
          </button>

          <div>
            <SLabel>İlerleme</SLabel>
            {["TAKBİS okuma","Veri çıkarma","Soru-cevap","Rapor yazımı"].map((lbl,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 8px", borderRadius:6, marginBottom:3, fontSize:11, fontWeight:500, background:steps[i]===2?"rgba(16,185,129,.1)":steps[i]===1?"rgba(59,130,246,.1)":"rgba(255,255,255,.03)", color:steps[i]===2?"#10B981":steps[i]===1?"rgba(255,255,255,.8)":"rgba(255,255,255,.3)" }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:"currentColor", flexShrink:0, animation:steps[i]===1?"blink 1s ease infinite":"none" }}/>
                {steps[i]===2?"✓ ":""}{lbl}
              </div>
            ))}
          </div>

          {pct>0&&(
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, fontWeight:600, color:"rgba(255,255,255,.4)", marginBottom:4 }}>
                <span>Doluluk</span><span>{pct}%</span>
              </div>
              <div style={{ height:4, background:"rgba(255,255,255,.1)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:pct+"%", background:"linear-gradient(90deg,#3B82F6,#10B981)", borderRadius:2, transition:"width .5s" }}/>
              </div>
            </div>
          )}

          {phase!=="setup"&&(
            <button onClick={reset} style={{ background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.4)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, padding:8, fontFamily:"inherit", fontSize:12, cursor:"pointer" }}>
              ↺ Yeni Rapor
            </button>
          )}
        </div>

        {/* Chat */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#F0F4F8", overflow:"hidden" }}>
          <div style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", padding:"10px 16px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#3B82F6,#1D4ED8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>🤖</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>EkspertizAI Asistan</div>
              <div style={{ fontSize:11, color:"#94A3B8" }}>
                {phase==="done"?"✓ Rapor tamamlandı":phase==="qa"?"Bilgiler tamamlanıyor…":phase==="analyzing"?"Belge okunuyor…":"Banka seç ve TAKBİS yükle"}
              </div>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"14px 16px 10px", display:"flex", flexDirection:"column", gap:10 }}>
            {msgs.map((m,i)=>(
              <MsgBubble key={i} msg={m} onSend={sendMsg} onCopy={copyRapor} copied={copied} bank={bank} user={user}/>
            ))}
            {busy&&(
              <div style={{ display:"flex", gap:8, alignSelf:"flex-start" }}>
                <Av ai/>
                <div style={{ padding:"10px 14px", background:"#fff", border:"1px solid #E2E8F0", borderRadius:"4px 12px 12px 12px", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#64748B" }}>
                  {busyMsg&&<span>{busyMsg}</span>}
                  <div style={{ display:"flex", gap:3 }}>
                    {[0,150,300].map(d=><div key={d} style={{ width:6, height:6, borderRadius:"50%", background:"#CBD5E1", animation:`typing .9s ${d}ms ease infinite` }}/>)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottom}/>
          </div>

          <div style={{ padding:"10px 16px 12px", background:"#fff", borderTop:"1px solid #E2E8F0", flexShrink:0 }}>
            <div style={{ display:"flex", gap:8 }}>
              <textarea value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(input);}}}
                disabled={phase==="setup"||phase==="analyzing"||busy}
                placeholder={phase==="setup"||phase==="analyzing"?"Analiz başladıktan sonra kullanılabilir…":"Yanıtınızı yazın… (Enter = gönder)"}
                rows={1}
                style={{ flex:1, padding:"9px 12px", borderRadius:10, border:"1.5px solid #E2E8F0", fontFamily:"inherit", fontSize:13, color:"#0F172A", resize:"none", outline:"none", opacity:(phase==="setup"||phase==="analyzing")?.5:1, minHeight:38 }}/>
              <button onClick={()=>sendMsg(input)} disabled={phase==="setup"||phase==="analyzing"||busy||!input.trim()}
                style={{ width:38, height:38, borderRadius:10, background:"#3B82F6", color:"#fff", border:"none", cursor:"pointer", fontSize:14, opacity:(!input.trim()||phase==="setup"||phase==="analyzing")?.4:1 }}>➤</button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <RightPanel tapuData={tapuData} soruData={soruData} phase={phase} pct={pct} bank={bank} user={user}/>
      </div>

      <style>{`
        @keyframes typing{0%,60%,100%{transform:none}30%{transform:translateY(-5px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes msgIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#E2E8F0;border-radius:3px}
      `}</style>
    </div>
  );
}

function SLabel({children}) {
  return <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:"1.2px", marginBottom:6 }}>{children}</div>;
}
function UserCard({user}) {
  return (
    <div style={{ background:"rgba(59,130,246,.08)", border:"1px solid rgba(59,130,246,.15)", borderRadius:9, padding:"9px 11px" }}>
      <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>Aktif Uzman</div>
      <div style={{ fontSize:12, fontWeight:600, color:"#fff", marginBottom:1 }}>{user.ad}</div>
      <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", marginBottom:1 }}>{user.sicilNo}</div>
      <div style={{ fontSize:9, color:"rgba(255,255,255,.3)", lineHeight:1.4 }}>{user.sirket}</div>
    </div>
  );
}
function UserChip({user}) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.07)", borderRadius:20, padding:"3px 10px 3px 5px" }}>
      <div style={{ width:22, height:22, borderRadius:"50%", background:"linear-gradient(135deg,#3B82F6,#1D4ED8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff" }}>
        {user.ad.split(" ").map(n=>n[0]).join("").slice(0,2)}
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:"#fff" }}>{user.ad}</div>
    </div>
  );
}
function Chip({color,children}) {
  const c={blue:["rgba(59,130,246,.15)","#3B82F6","rgba(59,130,246,.25)"],green:["rgba(16,185,129,.15)","#10B981","rgba(16,185,129,.25)"]}[color];
  return <span style={{ fontSize:10, fontWeight:600, background:c[0], color:c[1], border:`1px solid ${c[2]}`, padding:"2px 8px", borderRadius:20 }}>{children}</span>;
}
function Av({ai}) {
  return <div style={{ width:26, height:26, borderRadius:7, background:ai?"linear-gradient(135deg,#3B82F6,#1D4ED8)":"#334155", display:"flex", alignItems:"center", justifyContent:"center", fontSize:ai?12:9, color:"#fff", fontWeight:700, flexShrink:0, marginTop:2 }}>{ai?"🤖":"SZ"}</div>;
}
function FileZone({file,onChange,icon,label,sub,color,disabled}) {
  const c={green:["#10B981","rgba(16,185,129,.06)"],amber:["#F59E0B","rgba(245,158,11,.06)"]}[color];
  return (
    <label style={{ border:`2px dashed ${file?c[0]:"rgba(255,255,255,.12)"}`, borderRadius:9, padding:"10px 8px", textAlign:"center", cursor:disabled?"not-allowed":"pointer", display:"block", background:file?c[1]:"transparent", opacity:disabled&&!file?.6:1 }}>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }} disabled={disabled}
        onChange={e=>{if(e.target.files[0])onChange(e.target.files[0]);}}/>
      <div style={{ fontSize:17, marginBottom:3 }}>{file?"✅":icon}</div>
      <div style={{ fontSize:10, fontWeight:600, color:file?c[0]:"rgba(255,255,255,.55)", wordBreak:"break-all" }}>{file?file.name:label}</div>
      {!file&&<div style={{ fontSize:9, color:"rgba(255,255,255,.3)" }}>{sub}</div>}
    </label>
  );
}

function MsgBubble({msg, onSend, onCopy, copied, bank, user}) {
  const isAi = msg.role==="ai";
  const [showFull, setShowFull] = useState(false);
  const bs = { padding:"10px 14px", borderRadius:isAi?"4px 12px 12px 12px":"12px 4px 12px 12px", fontSize:13, lineHeight:1.7, background:isAi?"#fff":"linear-gradient(135deg,#3B82F6,#1D4ED8)", border:isAi?"1px solid #E2E8F0":"none", color:isAi?"#1E293B":"#fff", boxShadow:isAi?"0 1px 3px rgba(15,23,42,.06)":"0 2px 8px rgba(59,130,246,.3)", maxWidth:580, animation:"msgIn .2s ease" };
  const t = msg.tapu||{};

  let content;
  if (msg.type==="welcome") {
    content=<>Merhaba <b>{(user||SESSION_USER).ad.split(" ")[0]}</b>! Uzman bilgileriniz sistemden alındı.<br/><br/><b>Banka seç → TAKBİS yükle → Analizi Başlat</b><br/><br/>AI belgeyi okuyacak, tapu verilerini çıkaracak. Konum, imar, yapı ve değerleme bilgilerini <b>3 grupta</b> soracağım. Her grup için tek mesajla cevap verebilirsiniz.</>;
  } else if (msg.type==="extracted") {
    const fields = [
      ["Ada/Parsel", t.ada&&t.parsel?`${t.ada}/${t.parsel}`:null, "ok"],
      ["İl/İlçe", t.il&&t.ilce?`${t.il}/${t.ilce}`:null, ""],
      ["Malik", t.malik?t.malik.substring(0,22)+(t.malik?.length>22?"…":""):null, ""],
      ["Nitelik", t.nitelik?t.nitelik.substring(0,20)+"…":null, ""],
      ["İpotek", t.rehinler?.length>0?`${t.rehinler.length} kayıt`:(tapuData!==null?"Yok":null), t.rehinler?.length>0?"warn":"ok"],
    ].filter(([,v])=>v);
    content=<>
      <div dangerouslySetInnerHTML={{__html:msg.text.replace(/\n/g,"<br/>")}}/>
      {fields.length>0&&(
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginTop:8 }}>
          {fields.map(([k,v,c],i)=>(
            <div key={i} style={{ background:c==="ok"?"#ECFDF5":c==="warn"?"#FFFBEB":"#EFF6FF", border:`1px solid ${c==="ok"?"#A7F3D0":c==="warn"?"#FDE68A":"#BFDBFE"}`, borderRadius:5, padding:"3px 7px", fontSize:11 }}>
              <div style={{ color:"#64748B", fontWeight:500 }}>{k}</div>
              <div style={{ color:c==="ok"?"#065F46":c==="warn"?"#92400E":"#1D4ED8", fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </>;
  } else if (msg.type==="report") {
    content=<ReportCard data={msg.data} bank={bank} rapor={msg.rapor} onCopy={onCopy} copied={copied} showFull={showFull} setShowFull={setShowFull}/>;
  } else {
    content=<div dangerouslySetInnerHTML={{__html:(msg.text||"").replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}}/>;
  }

  return (
    <div style={{ display:"flex", gap:8, alignSelf:isAi?"flex-start":"flex-end", flexDirection:isAi?"row":"row-reverse", maxWidth:"92%" }}>
      <Av ai={isAi}/>
      <div style={bs}>{content}</div>
    </div>
  );
}

// tapuData ref for extracted chips
let tapuData = null;

function ReportCard({data, bank, rapor, onCopy, copied, showFull, setShowFull}) {
  const score = data?.qualityScore||88;
  const warns = data?.warnings||[];
  return (
    <div style={{ background:"#fff", border:"1.5px solid #E2E8F0", borderRadius:12, overflow:"hidden", marginTop:6, boxShadow:"0 3px 16px rgba(15,23,42,.09)", minWidth:300 }}>
      <div style={{ background:"linear-gradient(135deg,#3B82F6,#1D4ED8)", padding:"12px 16px", color:"#fff" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:15, marginBottom:1 }}>Gayrimenkul Değerleme Raporu</div>
        <div style={{ fontSize:11, opacity:.8 }}>{bank} · {new Date().toLocaleDateString("tr-TR")}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:score>=85?"#ECFDF5":"#FFFBEB", borderBottom:`1px solid ${score>=85?"#D1FAE5":"#FDE68A"}` }}>
        <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${score>=85?"#10B981,#059669":"#F59E0B,#D97706"})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff", flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:700, lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:8, opacity:.85 }}>/100</div>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:score>=85?"#065F46":"#92400E" }}>Kalite: {score>=90?"Çok İyi":score>=75?"İyi":"Orta"}</div>
          <div style={{ fontSize:11, color:score>=85?"#047857":"#B45309" }}>AI tarafından yazıldı · {bank} formatı</div>
        </div>
      </div>

      {warns.length>0&&(
        <div style={{ margin:"10px 16px 0", padding:"8px 12px", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:7, fontSize:11, color:"#92400E" }}>
          ⚠ {warns.join(" · ")}
        </div>
      )}

      <div style={{ margin:"10px 16px 12px" }}>
        <button onClick={()=>setShowFull(p=>!p)} style={{ background:"none", border:"1px solid #E2E8F0", borderRadius:6, padding:"6px 12px", fontFamily:"inherit", fontSize:12, color:"#64748B", cursor:"pointer", width:"100%" }}>
          {showFull?"▲ Kapat":"▼ Tam rapor metnini gör"}
        </button>
        {showFull&&(
          <pre style={{ marginTop:8, padding:"12px", background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:8, fontSize:10, color:"#1E293B", lineHeight:1.75, whiteSpace:"pre-wrap", fontFamily:"'Courier New',monospace", maxHeight:420, overflowY:"auto" }}>
            {rapor}
          </pre>
        )}
      </div>

      <div style={{ padding:"10px 16px", borderTop:"1px solid #F1F5F9", display:"flex", gap:7 }}>
        <button onClick={onCopy} style={{ flex:1, padding:9, borderRadius:7, border:"none", background:copied?"#10B981":"#3B82F6", color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", transition:"background .2s" }}>
          {copied?"✓ Kopyalandı!":"📋 Raporu Kopyala"}
        </button>
        <button onClick={()=>setShowFull(p=>!p)} style={{ padding:"9px 13px", borderRadius:7, border:"none", background:"#F1F5F9", color:"#334155", fontFamily:"inherit", fontSize:13, cursor:"pointer" }}>
          {showFull?"🙈":"📄"}
        </button>
      </div>
    </div>
  );
}

function RightPanel({tapuData, soruData, phase, pct, bank, user}) {
  const t = tapuData||{};
  const s = soruData||{};
  return (
    <div style={{ width:252, flexShrink:0, background:"#fff", borderLeft:"1px solid #E2E8F0", display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"10px 13px", borderBottom:"1px solid #E2E8F0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#334155" }}>Canlı Önizleme</div>
        <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:"#10B981" }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#10B981" }}/>Canlı
        </div>
      </div>
      {phase==="setup"?(
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8, color:"#CBD5E1", padding:18, textAlign:"center" }}>
          <div style={{ fontSize:28 }}>📋</div>
          <div style={{ fontSize:11 }}>TAKBİS yüklenince veriler burada görünür.</div>
        </div>
      ):(
        <div style={{ flex:1, overflowY:"auto", padding:11 }}>
          {[
            {title:"TAPU", items:[
              ["Ada/Parsel", t.ada&&t.parsel?`${t.ada}/${t.parsel}`:null, "ok"],
              ["İl/İlçe", t.il&&t.ilce?`${t.il}/${t.ilce}`:null, ""],
              ["Malik", t.malik?t.malik.substring(0,18)+"…":null, ""],
              ["Nitelik", t.nitelik?t.nitelik.substring(0,20):null, ""],
            ]},
            {title:"TAKYİDAT", items:[
              ["Rehin", t.rehinler?.length>0?`${t.rehinler.length} kayıt`:(phase!=="setup"?"Yok":null), t.rehinler?.length>0?"warn":"ok"],
              ["Şerh", t.serhler?.length>0?`${t.serhler.length}`:(phase!=="setup"?"Yok":null), t.serhler?.length>0?"warn":"ok"],
            ]},
            {title:"KONUM", items:[
              ["Koordinat", s.koordinat, "ok"],
              ["Adres", s.adres?"Girildi ✓":null, "ok"],
            ]},
            {title:"DEĞERLEME", items:[
              ["Birim", s.birimDeger, ""],
              ["Sonuç", s.sonucDeger, "ok"],
              ["Uzman", user?.ad, "ok"],
            ]},
          ].map(({title,items})=>(
            <div key={title} style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.8, color:"#94A3B8", marginBottom:4, paddingBottom:3, borderBottom:"1px solid #F1F5F9" }}>{title}</div>
              {items.map(([k,v,c],i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:10, color:"#94A3B8" }}>{k}</span>
                  {v?<span style={{ fontSize:10, fontWeight:600, color:c==="ok"?"#10B981":c==="warn"?"#F59E0B":"#0F172A" }}>{v}</span>
                    :<div style={{ width:45, height:7, background:"#F1F5F9", borderRadius:2 }}/>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div style={{ padding:"8px 12px", borderTop:"1px solid #E2E8F0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, fontWeight:600, color:"#64748B", marginBottom:4 }}>
          <span>Doluluk</span><span>{pct}%</span>
        </div>
        <div style={{ height:4, background:"#F1F5F9", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:pct+"%", background:"linear-gradient(90deg,#3B82F6,#10B981)", borderRadius:2, transition:"width .5s" }}/>
        </div>
      </div>
    </div>
  );
}
