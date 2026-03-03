'use client'
import { useState, useRef, useEffect } from "react";

const SESSION_USER = {
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

const EXTRACT_PROMPT = `Sen bir gayrimenkul değerleme asistanısın. Verilen TAKBİS (Türkiye Tapu ve Kadastro Bilgi Sistemi) belgesinden tüm bilgileri çıkar.

ÇIKARMAM GEREKEN ALANLAR (hepsi varsa doldur, yoksa null):
- il, ilce, mahalle, mevkii
- ada, parsel
- atYuzolcum (arsa yüzölçümü)
- nitelik (bağımsız bölüm niteliği)
- blok, kat, bbNo (bağımsız bölüm no)
- arsaPay (arsa payı pay/payda)
- zemin (zemin tipi: KatMulkiyeti, ArsiPayliMulkiyet vb.)
- kimlikNo (taşınmaz kimlik no)
- ciltSayfa
- malik (malik adı soyadı tam)
- tapuTarihi (son tapu tarihi)
- edinme (edinme sebebi)
- anaTasinmazNitelik
- beyanlar (dizi)
- serhler (dizi)
- irtifaklar (dizi)
- rehinler (dizi - ipotek bilgileri)

SADECE JSON döndür, başka hiçbir şey yazma:
{
  "il": "...",
  "ilce": "...",
  "mahalle": "...",
  "mevkii": "...",
  "ada": "...",
  "parsel": "...",
  "atYuzolcum": "...",
  "nitelik": "...",
  "blok": "...",
  "kat": "...",
  "bbNo": "...",
  "arsaPay": "...",
  "zemin": "...",
  "kimlikNo": "...",
  "ciltSayfa": "...",
  "malik": "...",
  "tapuTarihi": "...",
  "edinme": "...",
  "anaTasinmazNitelik": "...",
  "beyanlar": [],
  "serhler": [],
  "irtifaklar": [],
  "rehinler": []
}`;

const QA_SYSTEM = (bank, tapuData) => `Sen Türkiye'de lisanslı gayrimenkul değerleme uzmanı asistanısın. ${bank} bankası için SPK uyumlu ekspertiz raporu hazırlanıyor.

OTURUMDAN GELEN UZMAN:
Ad: ${SESSION_USER.ad}, Sicil: ${SESSION_USER.sicilNo}, Şirket: ${SESSION_USER.sirket}

TAKBİS'TEN ÇIKARILAN VERİLER:
${JSON.stringify(tapuData, null, 2)}

TAKBİS BELGESİNDE OLMAYAN VE SORULACAK BİLGİLER:
1. Koordinat bilgileri (enlem, boylam)
2. Tam adres (sokak, bina no, iç kapı no, UAVT)
3. İmar durumu (TAKS, KAKS, plan tarihi, imar fonksiyonu)
4. Konum açıklaması (bölge özellikleri, ulaşım, çevre)
5. Ruhsat bilgileri (yapı ruhsatı tarihleri, iskan belgesi)
6. EKB (Enerji Kimlik Belgesi) bilgisi
7. Yapının genel özellikleri (kat sayısı, cephe, ısıtma, otopark)
8. Bağımsız bölüm özellikleri (alan, oda, iç özellikler)
9. Değerleme ve emsaller (birim değer, emsal karşılaştırmaları)
10. Mevcut kullanım durumu

GÖREV:
- Yukarıdaki eksik bilgileri BIRER BIRER sor.
- Her seferinde sadece 1 konu sor, birden fazla soru sorma.
- Kullanıcı "bilmiyorum" derse o alanı boş bırak, sonrakine geç.
- Tüm kritik alanlar dolduğunda RAPOR_HAZIR komutunu ver.

RAPOR_HAZIR formatı:
RAPOR_HAZIR
\`\`\`json
{
  "koordinat": "...",
  "adres": "...",
  "uavt": "...",
  "imarDurumu": "...",
  "konumMetni": "...",
  "ruhsatlar": ["..."],
  "ekb": "...",
  "yapiGenelMetni": "...",
  "bbMetni": "...",
  "kapaliAlan": "...",
  "birimDeger": "...",
  "sonucDeger": "...",
  "emsaller": [{"aciklama":"...","tel":"..."}],
  "kullanimDurumu": "...",
  "olumlu": ["..."],
  "olumsuz": ["..."],
  "qualityScore": 90,
  "warnings": []
}
\`\`\`

Resmi ama sıcak Türkçe kullan.`;

function buildReport(bank, tapu, soru, tarih) {
  const u = SESSION_USER;
  const t = tapu || {};
  const s = soru || {};

  const beyanlar = (t.beyanlar||[]).map(b=>`-${b}`).join("\n") || "-Beyan bulunmamaktadır.";
  const serhler = (t.serhler||[]).map(b=>`-${b}`).join("\n") || "-Şerh bulunmamaktadır.";
  const irtifaklar = (t.irtifaklar||[]).map(b=>`-M: ${b}`).join("\n") || "-İrtifak bulunmamaktadır.";
  const rehinler = (t.rehinler||[]).map(b=>`-${b}`).join("\n") || "-Rehin bulunmamaktadır.";
  const ruhsatlar = (s.ruhsatlar||[]).join("\n") || "-Ruhsat bilgisi girilmedi.";
  const emsaller = (s.emsaller||[]).map((e,i)=>`Emsal ${i+1}:\n${e.aciklama}${e.tel?`\nEmlak Ofisinden: ${e.tel}`:""}${e.link?`\n${e.link}`:""}`).join("\n\n");
  const olumlu = (s.olumlu||[]).map(o=>`+ ${o}`).join("\n");
  const olumsuz = (s.olumsuz||[]).map(o=>`- ${o}`).join("\n");

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
${s.konumMetni||"Konum bilgisi girilmedi."}

Koordinat Bilgileri : ${s.koordinat||"—"}
Adres               : ${s.adres||"—"}
UAVT                : ${s.uavt||"—"}
Mevcut Kullanım     : ${s.kullanimDurumu||"—"}

${"─".repeat(65)}
İMAR DURUM BİLGİLERİ
${"─".repeat(65)}
${s.imarDurumu||"İmar durumu bilgisi girilmedi."}

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
${s.yapiGenelMetni||"Yapı genel özellikleri girilmedi."}

${"─".repeat(65)}
BAĞIMSIZ BÖLÜM ÖZELLİKLERİ
${"─".repeat(65)}
İç Özellik Detayları / Tefrişat Metni
${s.bbMetni||"Bağımsız bölüm özellikleri girilmedi."}

${"─".repeat(65)}
DEĞERLEME METNİ
${"─".repeat(65)}
Taşınmazın yerinde yapılan inceleme sonucu konu mülkün, bulunduğu mevkii, kullanış maksadı, büyüklüğü, çevre emsalleri ve olumlu-olumsuz kriterler göz önüne alınarak, YASAL ve MEVCUT DURUM değeri takdir edilmiştir. Satış kabiliyeti SATILABİLİR olarak nitelendirilmiştir.

Değerleme Emsal Karşılaştırma Yöntemi kullanılarak yapılmıştır.
Değerleme aşamasında Maliyet Yönteminden faydalanılmamıştır.
Değerleme aşamasında Gelir Yönteminden faydalanılmamıştır.

Emsal Karşılaştırma Yöntemi kullanılarak taşınmazın Yasal ve Mevcut Durum Değeri:
${s.kapaliAlan||"— m²"} × ${s.birimDeger||"— TL/m²"} = ${s.sonucDeger||"—"} takdir edilmiştir.

SONUÇ
Değerleme Emsal Karşılaştırma Yöntemi kullanılarak yapılmıştır. Değerlemeye konu gayrimenkulün konumu, ulaşım imkânları, kullanım alanı, inşaat tarzı, malzeme kalitesi ve ülkenin ekonomik konjonktürü dikkate alınarak Pazar Değeri peşin ödenmek kaydıyla arsa alanı dahil takdir edilmiştir.

${olumlu ? `Olumlu Faktörler\n${olumlu}` : ""}

${olumsuz ? `Olumsuz Faktörler\n${olumsuz}` : ""}

${"─".repeat(65)}
EMSALLER
${"─".repeat(65)}
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

async function callAPI(system, messages, withVision) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system,
      messages,
    }),
  });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

export default function App() {
  const [bank, setBank] = useState(null);
  const [takbisFile, setTakbisFile] = useState(null);
  const [ornekFile, setOrnekFile] = useState(null);
  const [msgs, setMsgs] = useState([{ role: "ai", type: "welcome" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [phase, setPhase] = useState("setup");
  const [steps, setSteps] = useState([0, 0, 0, 0]);
  const [pct, setPct] = useState(0);
  const [tapuData, setTapuData] = useState(null);
  const [soruData, setSoruData] = useState({});
  const [rapor, setRapor] = useState("");
  const [copied, setCopied] = useState(false);
  const hist = useRef([]);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  function stepSet(i, v) { setSteps(p => { const n = [...p]; n[i] = v; return n; }); }

  function addAiMsg(type, text, extra) {
    setMsgs(p => [...p, { role: "ai", type, text, ...extra }]);
  }

  async function startAnalysis() {
    if (!bank || !takbisFile) return;
    setPhase("analyzing"); setBusy(true); stepSet(0, 1);
    setBusyMsg("TAKBİS belgesi okunuyor…");

    try {
      // 1. TAKBİS'i base64'e çevir
      const b64 = await toBase64(takbisFile);
      const mime = takbisFile.type || "application/pdf";

      // 2. Vision API ile TAKBİS'i oku
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
      stepSet(0, 2); stepSet(1, 1); setBusyMsg("Veriler işleniyor…");

      // JSON parse
      let parsed = {};
      try {
        const clean = extractResp.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
        parsed = JSON.parse(clean);
      } catch(e) {
        // JSON parse failed, try to extract from text
        parsed = { _raw: extractResp };
      }
      setTapuData(parsed);
      stepSet(1, 2); stepSet(2, 1); setPct(45);
      setPhase("qa");

      // 3. Q&A başlat
      const initMsg = `TAKBİS okundu. Banka: ${bank}. Uzman: ${SESSION_USER.ad}. Çıkarılan veriler: ${JSON.stringify(parsed)}. Şimdi eksik bilgileri birer birer sor.`;
      hist.current = [{ role: "user", content: initMsg }];

      setBusyMsg("İlk soru hazırlanıyor…");
      const qaResp = await callAPI(QA_SYSTEM(bank, parsed), hist.current);
      hist.current.push({ role: "assistant", content: qaResp });

      setBusy(false); setBusyMsg("");
      const clean = qaResp.replace(/```json[\s\S]*?```/g,"").trim();

      // TAKBİS özeti göster
      addAiMsg("extracted", clean, { tapu: parsed });
    } catch(e) {
      setBusy(false); setBusyMsg("");
      addAiMsg("text", `Hata oluştu: ${e.message}. Lütfen tekrar deneyin.`);
      setPhase("setup");
    }
  }

  async function sendMsg(txt) {
    if (!txt.trim() || busy) return;
    setInput("");
    setMsgs(p => [...p, { role: "user", type: "text", text: txt }]);
    hist.current.push({ role: "user", content: txt });
    setBusy(true);

    try {
      const resp = await callAPI(QA_SYSTEM(bank, tapuData), hist.current);
      hist.current.push({ role: "assistant", content: resp });

      if (resp.includes("RAPOR_HAZIR")) {
        stepSet(2, 2); stepSet(3, 1);
        let rdata = { qualityScore: 88, warnings: [] };
        const jm = resp.match(/```json\s*([\s\S]*?)```/);
        if (jm) { try { rdata = JSON.parse(jm[1]); } catch(e) {} }
        setSoruData(rdata);

        const tarih = new Date().toLocaleDateString("tr-TR");
        const raporMetni = buildReport(bank, tapuData, rdata, tarih);
        setRapor(raporMetni);
        const filledCount = Object.values(rdata).filter(v => v && (Array.isArray(v) ? v.length > 0 : v !== "—")).length;
        const score = Math.min(98, 60 + filledCount * 3);

        setTimeout(() => {
          stepSet(3, 2); setPhase("done");
          setPct(rdata.qualityScore || score);
          addAiMsg("report", "", { data: { ...rdata, qualityScore: rdata.qualityScore || score }, rapor: raporMetni });
          setBusy(false);
        }, 900);
      } else {
        const clean = resp.replace(/```json[\s\S]*?```/g,"").trim();
        const hasQ = clean.includes("?");
        addAiMsg(hasQ ? "quickreply" : "text", clean);
        // Update pct as we go
        setPct(p => Math.min(90, p + 5));
        setBusy(false);
      }
    } catch(e) {
      addAiMsg("text", "Bir hata oluştu, tekrar deneyin.");
      setBusy(false);
    }
  }

  function copyRapor() {
    navigator.clipboard.writeText(rapor).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  }

  function reset() {
    setPhase("setup"); setBank(null); setTakbisFile(null); setOrnekFile(null);
    setMsgs([{ role: "ai", type: "welcome" }]); hist.current = [];
    setPct(0); setSteps([0,0,0,0]); setTapuData(null); setSoruData({});
    setRapor(""); setCopied(false); setBusyMsg("");
  }

  const canStart = bank && takbisFile && phase === "setup";

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#0F172A", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Topbar */}
      <div style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "0 18px", height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 19, color: "#fff" }}>Ekspertiz<span style={{ color: "#3B82F6" }}>AI</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {bank && <Chip color="blue">{bank}</Chip>}
          {takbisFile && <Chip color="green">TAKBİS ✓</Chip>}
          {phase === "done" && <Chip color="green">Rapor Hazır ✓</Chip>}
          <UserChip user={SESSION_USER} />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 252, flexShrink: 0, background: "#1E293B", borderRight: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column", padding: "14px 12px", gap: 13, overflowY: "auto" }}>
          <UserCard user={SESSION_USER} />

          <div>
            <SLabel>1. Hedef Banka</SLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {BANKS.map(b => (
                <button key={b.id} onClick={() => setBank(b.label)} disabled={phase !== "setup"}
                  style={{ background: bank === b.label ? "rgba(59,130,246,.2)" : "rgba(255,255,255,.05)", border: `1.5px solid ${bank === b.label ? "#3B82F6" : "rgba(255,255,255,.08)"}`, borderRadius: 8, padding: "8px 5px", cursor: phase === "setup" ? "pointer" : "not-allowed", color: bank === b.label ? "#fff" : "rgba(255,255,255,.5)", fontFamily: "inherit", fontSize: 11, fontWeight: 600, textAlign: "center", opacity: phase !== "setup" ? .6 : 1 }}>
                  <div style={{ fontSize: 15, marginBottom: 3 }}>{b.icon}</div>{b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SLabel>2. TAKBİS Belgesi <span style={{ color: "#EF4444", fontSize: 9 }}>zorunlu</span></SLabel>
            <FileZone file={takbisFile} onChange={setTakbisFile} icon="📋" label="TAKBİS / Tapu" sub="PDF veya JPG/PNG" color="green" disabled={phase !== "setup"} />
          </div>

          <div>
            <SLabel>3. Örnek Rapor <span style={{ opacity: .5 }}>(opsiyonel)</span></SLabel>
            <FileZone file={ornekFile} onChange={setOrnekFile} icon="📝" label="Önceki Rapor" sub="PDF veya DOCX" color="amber" disabled={phase !== "setup"} />
          </div>

          <button onClick={startAnalysis} disabled={!canStart}
            style={{ background: canStart ? "linear-gradient(135deg,#3B82F6,#1D4ED8)" : "rgba(255,255,255,.08)", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: canStart ? "pointer" : "not-allowed", opacity: canStart ? 1 : .4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            🚀 Analizi Başlat
          </button>

          {/* Steps */}
          <div>
            <SLabel>İlerleme</SLabel>
            {["TAKBİS okuma (AI)", "Veri çıkarma", "Eksik sorgulama", "Rapor oluşturma"].map((lbl, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 6, marginBottom: 4, fontSize: 11, fontWeight: 500, background: steps[i] === 2 ? "rgba(16,185,129,.1)" : steps[i] === 1 ? "rgba(59,130,246,.12)" : "rgba(255,255,255,.04)", color: steps[i] === 2 ? "rgba(16,185,129,.9)" : steps[i] === 1 ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.3)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0, animation: steps[i] === 1 ? "blink 1s ease infinite" : "none" }} />
                {steps[i] === 2 ? "✓ " : ""}{lbl}
              </div>
            ))}
          </div>

          {pct > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)", marginBottom: 5 }}>
                <span>Doluluk</span><span>{pct}%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,.1)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#3B82F6,#10B981)", borderRadius: 3, transition: "width .5s" }} />
              </div>
            </div>
          )}

          {phase !== "setup" && (
            <button onClick={reset} style={{ background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.5)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "8px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>
              ↺ Yeni Rapor Başlat
            </button>
          )}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F0F4F8", overflow: "hidden" }}>
          <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "11px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>EkspertizAI Asistan</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>
                  {phase === "done" ? "✓ Rapor tamamlandı" : phase === "qa" ? "Eksik bilgiler tamamlanıyor…" : phase === "analyzing" ? "TAKBİS okunuyor…" : "Banka ve belge seçimini bekliyor"}
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 10px", display: "flex", flexDirection: "column", gap: 12 }}>
            {msgs.map((m, i) => (
              <MsgBubble key={i} msg={m} onQR={sendMsg} onCopy={copyRapor} copied={copied} bank={bank} />
            ))}
            {busy && (
              <div style={{ display: "flex", gap: 9, alignSelf: "flex-start" }}>
                <Av ai />
                <div style={{ padding: "11px 15px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: "4px 12px 12px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748B" }}>
                  {busyMsg && <span>{busyMsg}</span>}
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 150, 300].map(d => <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#CBD5E1", animation: `typing .9s ${d}ms ease infinite` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottom} />
          </div>

          <div style={{ padding: "10px 18px 14px", background: "#fff", borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(input); } }}
                disabled={phase === "setup" || phase === "analyzing" || busy}
                placeholder={phase === "setup" || phase === "analyzing" ? "Analiz başladıktan sonra kullanılabilir…" : "Yanıtınızı yazın… (Enter = gönder)"}
                rows={1}
                style={{ flex: 1, padding: "9px 13px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", resize: "none", outline: "none", opacity: (phase === "setup" || phase === "analyzing") ? .5 : 1, minHeight: 40 }} />
              <button onClick={() => sendMsg(input)} disabled={phase === "setup" || phase === "analyzing" || busy || !input.trim()}
                style={{ width: 40, height: 40, borderRadius: 10, background: "#3B82F6", color: "#fff", border: "none", cursor: "pointer", fontSize: 15, opacity: (!input.trim() || phase === "setup" || phase === "analyzing") ? .4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>➤</button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <RightPanel tapuData={tapuData} soruData={soruData} phase={phase} pct={pct} bank={bank} />
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

function SLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 7 }}>{children}</div>;
}

function UserCard({ user }) {
  return (
    <div style={{ background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.15)", borderRadius: 9, padding: "10px 12px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Aktif Uzman</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{user.ad}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)", marginBottom: 1 }}>{user.sicilNo}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", lineHeight: 1.4 }}>{user.sirket}</div>
    </div>
  );
}

function UserChip({ user }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.07)", borderRadius: 20, padding: "4px 12px 4px 6px" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>
        {user.ad.split(" ").map(n => n[0]).join("").slice(0, 2)}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{user.ad}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>{user.sicilNo}</div>
      </div>
    </div>
  );
}

function Chip({ color, children }) {
  const c = { blue: ["rgba(59,130,246,.15)", "#3B82F6", "rgba(59,130,246,.25)"], green: ["rgba(16,185,129,.15)", "#10B981", "rgba(16,185,129,.25)"], amber: ["rgba(245,158,11,.15)", "#F59E0B", "rgba(245,158,11,.25)"] }[color];
  return <span style={{ fontSize: 11, fontWeight: 600, background: c[0], color: c[1], border: `1px solid ${c[2]}`, padding: "3px 10px", borderRadius: 20 }}>{children}</span>;
}

function Av({ ai }) {
  return <div style={{ width: 28, height: 28, borderRadius: 8, background: ai ? "linear-gradient(135deg,#3B82F6,#1D4ED8)" : "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ai ? 13 : 10, color: "#fff", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{ai ? "🤖" : "SZ"}</div>;
}

function FileZone({ file, onChange, icon, label, sub, color, disabled }) {
  const c = { green: ["#10B981", "rgba(16,185,129,.06)"], amber: ["#F59E0B", "rgba(245,158,11,.06)"] }[color];
  return (
    <label style={{ border: `2px dashed ${file ? c[0] : "rgba(255,255,255,.12)"}`, borderRadius: 10, padding: "12px 10px", textAlign: "center", cursor: disabled ? "not-allowed" : "pointer", display: "block", background: file ? c[1] : "transparent", opacity: disabled && !file ? .6 : 1 }}>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: "none" }} disabled={disabled}
        onChange={e => { if (e.target.files[0]) onChange(e.target.files[0]); }} />
      <div style={{ fontSize: 19, marginBottom: 4 }}>{file ? "✅" : icon}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: file ? c[0] : "rgba(255,255,255,.55)", wordBreak: "break-all" }}>{file ? file.name : label}</div>
      {!file && <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{sub}</div>}
    </label>
  );
}

function MsgBubble({ msg, onQR, onCopy, copied, bank }) {
  const isAi = msg.role === "ai";
  const [showFull, setShowFull] = useState(false);
  const bs = { padding: "11px 15px", borderRadius: isAi ? "4px 12px 12px 12px" : "12px 4px 12px 12px", fontSize: 13.5, lineHeight: 1.65, background: isAi ? "#fff" : "linear-gradient(135deg,#3B82F6,#1D4ED8)", border: isAi ? "1px solid #E2E8F0" : "none", color: isAi ? "#1E293B" : "#fff", boxShadow: isAi ? "0 1px 3px rgba(15,23,42,.06)" : "0 2px 8px rgba(59,130,246,.3)", maxWidth: 560, animation: "msgIn .2s ease" };

  let content;
  const t = msg.tapu || {};

  if (msg.type === "welcome") {
    content = <>
      Merhaba <b>{SESSION_USER.ad.split(" ")[0]}</b>! Uzman bilgileriniz sistemden alındı.<br /><br />
      <b>Banka seç → TAKBİS yükle → Analizi Başlat</b><br /><br />
      AI belgeni okuyacak, tapu bilgilerini otomatik çıkaracak. Sadece TAKBİS'te olmayan bilgileri (koordinat, imar durumu, yapı özellikleri vb.) soracağım.<br /><br />
      <span style={{ color: "#3B82F6", fontWeight: 600 }}>Her TAKBİS belgesi için çalışır.</span>
    </>;
  } else if (msg.type === "extracted") {
    const fields = [
      ["Ada/Parsel", t.ada && t.parsel ? `${t.ada}/${t.parsel}` : null, "ok"],
      ["İl/İlçe", t.il && t.ilce ? `${t.il}/${t.ilce}` : null, ""],
      ["Blok/Kat/BB", t.blok && t.kat ? `${t.blok}/${t.kat}/${t.bbNo}` : null, ""],
      ["Malik", t.malik, ""],
      ["Zemin", t.zemin, "ok"],
      ["Tapu Tarihi", t.tapuTarihi, ""],
      ["İpotek/Rehin", t.rehinler?.length > 0 ? `${t.rehinler.length} kayıt` : "Yok", t.rehinler?.length > 0 ? "warn" : "ok"],
      ["Şerh", t.serhler?.length > 0 ? `${t.serhler.length} şerh` : "Yok", t.serhler?.length > 0 ? "warn" : "ok"],
    ].filter(([, v]) => v);

    content = <>
      <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, "<br/>") }} />
      {fields.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 10 }}>
          {fields.map(([k, v, c], i) => (
            <div key={i} style={{ background: c === "ok" ? "#ECFDF5" : c === "warn" ? "#FFFBEB" : "#EFF6FF", border: `1px solid ${c === "ok" ? "#A7F3D0" : c === "warn" ? "#FDE68A" : "#BFDBFE"}`, borderRadius: 5, padding: "4px 8px", fontSize: 11 }}>
              <div style={{ color: "#64748B", fontWeight: 500 }}>{k}</div>
              <div style={{ color: c === "ok" ? "#065F46" : c === "warn" ? "#92400E" : "#1D4ED8", fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </>;
  } else if (msg.type === "quickreply") {
    content = <>
      <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, "<br/>") }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {["Evet", "Hayır", "Bilmiyorum / Yok"].map(r => (
          <button key={r} onClick={() => onQR(r)} style={{ background: "#fff", border: "1.5px solid #BFDBFE", color: "#1D4ED8", borderRadius: 20, padding: "5px 12px", fontFamily: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{r}</button>
        ))}
      </div>
    </>;
  } else if (msg.type === "report") {
    content = <ReportCard data={msg.data} bank={bank} rapor={msg.rapor} onCopy={onCopy} copied={copied} showFull={showFull} setShowFull={setShowFull} />;
  } else {
    content = <div dangerouslySetInnerHTML={{ __html: (msg.text || "").replace(/\n/g, "<br/>") }} />;
  }

  return (
    <div style={{ display: "flex", gap: 9, alignSelf: isAi ? "flex-start" : "flex-end", flexDirection: isAi ? "row" : "row-reverse", maxWidth: "92%" }}>
      <Av ai={isAi} />
      <div style={bs}>{content}</div>
    </div>
  );
}

function ReportCard({ data, bank, rapor, onCopy, copied, showFull, setShowFull }) {
  const score = data?.qualityScore || 88;
  const warns = data?.warnings || [];
  return (
    <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginTop: 8, boxShadow: "0 3px 16px rgba(15,23,42,.09)", minWidth: 300 }}>
      <div style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)", padding: "13px 17px", color: "#fff" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 16, marginBottom: 2 }}>Gayrimenkul Değerleme Raporu</div>
        <div style={{ fontSize: 11, opacity: .8 }}>{bank} · {new Date().toLocaleDateString("tr-TR")}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 17px", background: score >= 85 ? "#ECFDF5" : "#FFFBEB", borderBottom: `1px solid ${score >= 85 ? "#D1FAE5" : "#FDE68A"}` }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg,${score >= 85 ? "#10B981,#059669" : "#F59E0B,#D97706"})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 8, opacity: .85 }}>/100</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: score >= 85 ? "#065F46" : "#92400E" }}>Kalite: {score >= 90 ? "Çok İyi" : score >= 75 ? "İyi" : "Orta"}</div>
          <div style={{ fontSize: 11, color: score >= 85 ? "#047857" : "#B45309" }}>{bank} formatı uygulandı.</div>
        </div>
      </div>

      <div style={{ padding: "12px 17px" }}>
        {[
          ["Tapu Kaydı", "TAKBİS'ten otomatik ✓", "ok"],
          ["Takyidat", "TAKBİS'ten otomatik ✓", "ok"],
          ["Konum + Koordinat", data?.koordinat ? "✓" : "—", data?.koordinat ? "ok" : ""],
          ["İmar Durumu", data?.imarDurumu ? "✓" : "—", data?.imarDurumu ? "ok" : ""],
          ["Ruhsat/İskan", data?.ruhsatlar?.length ? `${data.ruhsatlar.length} belge ✓` : "—", data?.ruhsatlar?.length ? "ok" : ""],
          ["Yapı Özellikleri", data?.yapiGenelMetni ? "✓" : "—", data?.yapiGenelMetni ? "ok" : ""],
          ["Değerleme", data?.sonucDeger || "—", data?.sonucDeger ? "ok" : ""],
          ["Uzman", SESSION_USER.ad, "ok"],
        ].map(([k, v, c], i, arr) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < arr.length - 1 ? "1px solid #F8FAFC" : "none", fontSize: 12 }}>
            <span style={{ color: "#64748B" }}>{k}</span>
            <span style={{ fontWeight: 600, color: c === "ok" ? "#10B981" : c === "warn" ? "#F59E0B" : "#94A3B8", fontSize: 11 }}>{v}</span>
          </div>
        ))}
      </div>

      {warns.length > 0 && (
        <div style={{ margin: "0 17px 10px", padding: "9px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, fontSize: 11, color: "#92400E" }}>
          ⚠ {warns.join(" · ")}
        </div>
      )}

      <div style={{ margin: "0 17px 12px" }}>
        <button onClick={() => setShowFull(p => !p)} style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 6, padding: "6px 12px", fontFamily: "inherit", fontSize: 12, color: "#64748B", cursor: "pointer", width: "100%" }}>
          {showFull ? "▲ Kapat" : "▼ Tam rapor metnini gör"}
        </button>
        {showFull && (
          <pre style={{ marginTop: 8, padding: "12px 14px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 10.5, color: "#1E293B", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "'Courier New',monospace", maxHeight: 400, overflowY: "auto" }}>
            {rapor}
          </pre>
        )}
      </div>

      <div style={{ padding: "11px 17px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 8 }}>
        <button onClick={onCopy} style={{ flex: 1, padding: 10, borderRadius: 7, border: "none", background: copied ? "#10B981" : "#3B82F6", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background .2s" }}>
          {copied ? "✓ Kopyalandı!" : "📋 Raporu Kopyala"}
        </button>
        <button onClick={() => setShowFull(p => !p)} style={{ padding: "10px 14px", borderRadius: 7, border: "none", background: "#F1F5F9", color: "#334155", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {showFull ? "🙈" : "📄"}
        </button>
      </div>
    </div>
  );
}

function RightPanel({ tapuData, soruData, phase, pct, bank }) {
  const t = tapuData || {};
  const s = soruData || {};

  const sections = [
    { title: "TAPU (TAKBİS)", items: [
      ["Ada/Parsel", t.ada && t.parsel ? `${t.ada}/${t.parsel}` : null, "ok"],
      ["İl/İlçe", t.il && t.ilce ? `${t.il}/${t.ilce}` : null, ""],
      ["Blok/Kat/BB", t.blok && t.kat ? `${t.blok}/${t.kat}/${t.bbNo}` : null, ""],
      ["Malik", t.malik ? t.malik.substring(0, 20) + (t.malik?.length > 20 ? "…" : "") : null, ""],
      ["Zemin", t.zemin, "ok"],
    ]},
    { title: "TAKYİDAT", items: [
      ["İpotek/Rehin", t.rehinler?.length > 0 ? `${t.rehinler.length} kayıt` : (phase !== "setup" ? "Yok" : null), t.rehinler?.length > 0 ? "warn" : "ok"],
      ["Şerh", t.serhler?.length > 0 ? `${t.serhler.length} şerh` : (phase !== "setup" ? "Yok" : null), t.serhler?.length > 0 ? "warn" : "ok"],
    ]},
    { title: "KONUM & İMAR", items: [
      ["Koordinat", s.koordinat, "ok"],
      ["İmar", s.imarDurumu ? s.imarDurumu.substring(0, 25) + "…" : null, "ok"],
      ["Adres", s.adres ? "Girildi ✓" : null, "ok"],
    ]},
    { title: "YAPI", items: [
      ["İskan", s.ruhsatlar?.length > 0 ? "Mevcut ✓" : null, "ok"],
      ["EKB", s.ekb, "ok"],
      ["Alan", s.kapaliAlan, ""],
    ]},
    { title: "DEĞERLEME", items: [
      ["Sonuç", s.sonucDeger, "ok"],
      ["Banka", bank, ""],
      ["Uzman", SESSION_USER.ad, "ok"],
    ]},
  ];

  return (
    <div style={{ width: 258, flexShrink: 0, background: "#fff", borderLeft: "1px solid #E2E8F0", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "11px 14px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>Canlı Önizleme</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "#10B981" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />Canlı
        </div>
      </div>
      {phase === "setup" ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: "#CBD5E1", padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>📋</div>
          <div style={{ fontSize: 11 }}>TAKBİS yüklenince veriler burada görünür.</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: 11 }}>
          {sections.map(({ title, items }) => (
            <div key={title} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, color: "#94A3B8", marginBottom: 5, paddingBottom: 4, borderBottom: "1px solid #F1F5F9" }}>{title}</div>
              {items.map(([k, v, c], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{k}</span>
                  {v ? <span style={{ fontSize: 10, fontWeight: 600, color: c === "ok" ? "#10B981" : c === "warn" ? "#F59E0B" : "#0F172A" }}>{v}</span>
                    : <div style={{ width: 50, height: 8, background: "#F1F5F9", borderRadius: 3 }} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div style={{ padding: "9px 13px", borderTop: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 5 }}>
          <span>Doluluk</span><span>{pct}%</span>
        </div>
        <div style={{ height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#3B82F6,#10B981)", borderRadius: 3, transition: "width .5s" }} />
        </div>
      </div>
    </div>
  );
}
