'use client'
import { useState, useEffect } from "react";
import {
  Bot, Copy, Download, Eye, EyeOff, RotateCcw, CheckCircle2,
  FileText, Zap, Building2, ChevronRight, ChevronLeft,
  MapPin, Landmark, Home, BarChart3, Plus, Trash2, Settings, ClipboardList
} from "lucide-react";

// ─── Models ───────────────────────────────────────────────────────────────────
const MODEL_FAST = "claude-3-5-haiku-20241022";   // cheap — extraction + sections
const MODEL_SEARCH = "claude-sonnet-4-20250514";     // one-time web search

// ─── Static data ──────────────────────────────────────────────────────────────
const SESSION_USER = typeof window !== "undefined" && window.__EKSPERTIZ_USER__
  ? window.__EKSPERTIZ_USER__
  : { ad: "Zekeriyya Özkul", sicilNo: "GAY-2024-00142", sirket: "İnternorm Gayrimenkul Değerleme", lisans: "SPK Lisanslı Değerleme Uzmanı", tel: "0212 555 01 01", email: "z.ozkul@internorm.com.tr" };

const BANKS = [
  { id: "YapiKredi", label: "Yapı Kredi", color: "#F59E0B" },
  { id: "Akbank", label: "Akbank", color: "#EF4444" },
  { id: "Ziraat", label: "Ziraat", color: "#10B981" },
  { id: "IsBankasi", label: "İş Bankası", color: "#3B82F6" },
  { id: "Garanti", label: "Garanti", color: "#F97316" },
  { id: "Halkbank", label: "Halkbank", color: "#8B5CF6" },
];

// ─── Prompts (short = cheap) ──────────────────────────────────────────────────
const EXTRACT_SYS = `TAKBİS belgesinden tapu bilgilerini çıkar. SADECE JSON:
{"il":"","ilce":"","mahalle":"","mevkii":"","ada":"","parsel":"","atYuzolcum":"","nitelik":"","blok":"","kat":"","bbNo":"","arsaPay":"","zemin":"","kimlikNo":"","ciltSayfa":"","malik":"","tapuTarihi":"","edinme":"","anaTasinmazNitelik":"","beyanlar":[],"serhler":[],"irtifaklar":[],"rehinler":[]}`;

const RESEARCH_SYS = `Gayrimenkul araştırma asistanı. Web ara, SADECE JSON döndür.`;

const SECTIONS_SYS = `SPK uyumlu ekspertiz raporu uzmanı. SADECE JSON döndür.`;

const RUHSAT_EXTRACT_SYS = `Yapı Ruhsatı veya Yapı Kullanma İzin Belgesi'nden bilgileri çıkar. Belgede gördüğün tüm bilgileri doldur, bulamadığın alanları boş bırak. Adres bilgisini tam olarak yaz (cadde/sokak, no, site/blok bilgisi dahil). SADECE JSON döndür:
{"adres":"","ruhsatTarihi":"","iskanTarihi":"","binaKatSayisi":"","taks":"","kaks":"","imarFonksiyon":"","imarTarihi":"","bbAlan":"","bbNet":"","bbOda":"","isitma":"","asansor":"","otopark":"","cephe":[],"ekb":"","yapiSinifi":"","tapinanAlani":"","insaatAlani":""}`;

// ─── Form initial state ───────────────────────────────────────────────────────
const FORM_INIT = {
  // Step 0 – Konum
  koordinat: "", adres: "", uavt: "", bolgeKarakter: "Konut",
  topluTasima: [], cevreNoktalar: "", anaAkslar: "",
  // Step 1 – İmar & Ruhsat
  taks: "", kaks: "", imarFonksiyon: "", imarTarihi: "",
  ruhsatTarihi: "", iskanTarihi: "", ekb: "C",
  // Step 2 – Yapı & BB
  binaKatSayisi: "", cephe: [], isitma: "Doğalgaz Kombi",
  asansor: "Var", otopark: "Yok",
  bbAlan: "", bbNet: "", bbOda: "3+1",
  bbZemin: [], bbDuvar: [], bbDograma: "PVC", bbKapi: "Ahşap",
  kullanimDurumu: "Boş",
  // Step 3 – Değerleme
  birimDeger: "", sonucDeger: "",
  emsaller: [{ aciklama: "", fiyat: "", tel: "", link: "" }],
  olumlu: [], olumsuz: [],
};

const FORM_STEPS = [
  { label: "Konum", Icon: MapPin },
  { label: "İmar", Icon: Landmark },
  { label: "Yapı", Icon: Home },
  { label: "Değerleme", Icon: BarChart3 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function callAPI(system, messages, model = MODEL_FAST, maxTokens = 1200, useSearch = false) {
  const r = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, use_search: useSearch })
  });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  return Array.isArray(d.content) ? d.content.filter(b => b.type === "text").map(b => b.text).join("\n") : "";
}

function parseJSON(str) {
  try { return JSON.parse(str.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()); }
  catch { return null; }
}

async function toBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
}

function buildReport(bank, tapu, form, sec, tarih) {
  const u = SESSION_USER; const t = tapu || {}; const s = form || {}; const x = sec || {};
  const L = (a = []) => a.map(b => `- ${b}`).join("\n") || "- Yok.";
  const ruh = [s.ruhsatTarihi && `Yapı Ruhsatı: ${s.ruhsatTarihi}`, s.iskanTarihi && `İskan: ${s.iskanTarihi}`].filter(Boolean).join("\n") || "- Girilmedi.";
  const proj = (x.projeMaddeleri || []).map(m => `* ${m}`).join("\n\n");
  const emsal = (s.emsaller || []).filter(e => e.aciklama).map((e, i) => `Emsal ${i + 1}: ${e.aciklama}${e.fiyat ? ` — ${e.fiyat}` : ""}${e.tel ? `\nTel: ${e.tel}` : ""}${e.link ? `\n${e.link}` : ""}`).join("\n\n");
  const alan = parseFloat((s.bbNet || s.bbAlan || "0").toString().replace(/[^0-9.]/g, "")) || 0;
  const birim = parseFloat((s.birimDeger || "0").toString().replace(/[^0-9.]/g, "")) || 0;
  const sonuc = s.sonucDeger || (alan && birim ? (alan * birim).toLocaleString("tr-TR") + " TL" : "—");
  const hesap = alan && birim ? `${alan} m² × ${birim.toLocaleString("tr-TR")} TL/m² = ${sonuc}` : sonuc;
  return `GAYRİMENKUL DEĞERLEME RAPORU\n${"═".repeat(65)}\nRapor Tarihi        : ${tarih}\nDeğerleme Tarihi    : ${tarih}\nHedef Banka         : ${bank}\n\nDEĞERLEME UZMANI\n${"─".repeat(65)}\nAd / Soyad          : ${u.ad}\nSicil No            : ${u.sicilNo}\nŞirket              : ${u.sirket}\nLisans Türü         : ${u.lisans}\nTelefon             : ${u.tel}\nE-Posta             : ${u.email}\n\n${"─".repeat(65)}\nTAPU KAYIT BİLGİLERİ\n${"─".repeat(65)}\nİl / İlçe           : ${t.il || "—"} / ${t.ilce || "—"}\nMahalle / Mevkii    : ${t.mahalle || "—"} / ${t.mevkii || "—"}\nAda / Parsel        : ${t.ada || "—"} / ${t.parsel || "—"}\nBlok / Kat / BB No  : ${t.blok || "—"} / ${t.kat || "—"}. Kat / İç Kapı: ${t.bbNo || "—"}\nArsa Payı           : ${t.arsaPay || "—"}\nAT Yüzölçümü        : ${t.atYuzolcum || "—"}\nBağ. Bölüm Niteliği : ${t.nitelik || "—"}\nZemin Tipi          : ${t.zemin || "—"}\nTaşınmaz Kimlik No  : ${t.kimlikNo || "—"}\nCilt / Sayfa No     : ${t.ciltSayfa || "—"}\nAna Taşınmaz        : ${t.anaTasinmazNitelik || "—"}\nMalik               : ${t.malik || "—"}\nTapu Tarihi         : ${t.tapuTarihi || "—"}\nEdinme Sebebi       : ${t.edinme || "—"}\n\n${"─".repeat(65)}\nKONUM\n${"─".repeat(65)}\n${x.konumMetni || ""}\nKoordinat           : ${s.koordinat || "—"}\nAdres               : ${s.adres || "—"}\nUAVT                : ${s.uavt || "—"}\n\n${"─".repeat(65)}\nİMAR DURUM BİLGİLERİ\n${"─".repeat(65)}\n${x.imarMetni || ""}\n\n${"─".repeat(65)}\nPROJE BİLGİLERİ\n${"─".repeat(65)}\n${proj || "Proje bilgisi girilmedi."}\n\n${"─".repeat(65)}\nRUHSAT / İSKAN BİLGİLERİ\n${"─".repeat(65)}\n${ruh}${s.ekb ? `\n\nEnerji Kimlik Belgesi: ${s.ekb}` : ""}\n\n${"─".repeat(65)}\nTAKYİDATLAR\n${"─".repeat(65)}\nBeyanlar:\n${L(t.beyanlar)}\nŞerhler:\n${L(t.serhler)}\nHak ve Mükellefiyetler:\n${L(t.irtifaklar)}\nRehinler:\n${L(t.rehinler)}\n\n${"─".repeat(65)}\nYAPIYIN GENEL ÖZELLİKLERİ\n${"─".repeat(65)}\n${x.yapiMetni || ""}\n\n${"─".repeat(65)}\nBAĞIMSIZ BÖLÜM ÖZELLİKLERİ\n${"─".repeat(65)}\n${x.bbMetni || ""}\nMevcut Kullanım: ${s.kullanimDurumu || "—"}\n\n${"─".repeat(65)}\nDEĞERLEME METNİ\n${"─".repeat(65)}\n${x.degerlemeMetni || ""}\n\nDeğerleme Emsal Karşılaştırma Yöntemi kullanılmıştır.\n${hesap} takdir edilmiştir.\n\n${x.sonucMetni || ""}\n\n${(s.olumlu || []).length > 0 ? `Olumlu Faktörler\n${s.olumlu.map(o => `+ ${o}`).join("\n")}\n` : ""}\n${(s.olumsuz || []).length > 0 ? `Olumsuz Faktörler\n${s.olumsuz.map(o => `- ${o}`).join("\n")}\n` : ""}\n${"─".repeat(65)}\nEMSALLER\n${"─".repeat(65)}\n${x.emsalGiris || ""}\n\n${emsal || "Emsal girilmedi."}\n\n${"═".repeat(65)}\nSONUÇ DEĞERİ   : ${sonuc}\n${"═".repeat(65)}\nDeğerleme Uzmanı  : ${u.ad}\nSicil No          : ${u.sicilNo}\nTarih             : ${tarih}\n${"═".repeat(65)}`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function App({ onReportComplete }) {
  const [bank, setBank] = useState(null);
  const [takbisFile, setFile] = useState(null);
  const [ruhsatFile, setRuhsatFile] = useState(null);
  const [iskanFile, setIskanFile] = useState(null);
  const [phase, setPhase] = useState("setup"); // setup|extracting|researching|form|generating|done
  const [pct, setPct] = useState(0);
  const [tapuData, setTapuData] = useState(null);
  const [formData, setForm] = useState({ ...FORM_INIT });
  const [formStep, setStep] = useState(0);
  const [rapor, setRapor] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRapor, setShowR] = useState(false);
  const [busyMsg, setBusy] = useState("");
  const [mobileTab, setMobTab] = useState("setup");
  const [isMobile, setIsMobile] = useState(false);

  const user = (typeof window !== "undefined" && window.__EKSPERTIZ_USER__) || SESSION_USER;

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768);
    fn(); window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Auto-calculate sonucDeger
  useEffect(() => {
    const alan = parseFloat((formData.bbNet || formData.bbAlan || "").replace(/[^0-9.]/g, "")) || 0;
    const birim = parseFloat((formData.birimDeger || "").replace(/[^0-9.]/g, "")) || 0;
    if (alan && birim) setForm(p => ({ ...p, sonucDeger: (alan * birim).toLocaleString("tr-TR") + " TL" }));
  }, [formData.bbNet, formData.bbAlan, formData.birimDeger]);

  function upd(key, val) { setForm(p => ({ ...p, [key]: val })); }
  function toggleArr(key, val) {
    setForm(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val] }));
  }

  // ── Start: 2 API calls (extract + research) ────────────────────────────────
  async function startAnalysis() {
    if (!bank || !takbisFile) return;
    setMobTab("form");

    // 1. TAKBİS extraction — haiku, cheap
    setPhase("extracting"); setPct(5); setBusy("TAKBİS belgesi okunuyor…");
    try {
      const b64 = await toBase64(takbisFile);
      const mime = takbisFile.type || "application/pdf";
      const raw = await callAPI(EXTRACT_SYS, [{
        role: "user",
        content: [
          { type: "text", text: "Tapu bilgilerini çıkar." },
          mime === "application/pdf"
            ? { type: "document", source: { type: "base64", media_type: mime, data: b64 } }
            : { type: "image", source: { type: "base64", media_type: mime, data: b64 } }
        ]
      }], MODEL_FAST, 800);
      const tapu = parseJSON(raw) || {};
      setTapuData(tapu); setPct(25);

      // 2. Ek belgeler — ruhsat ve iskan (varsa paralel oku)
      let ruhsatData = {};
      const extraFiles = [ruhsatFile, iskanFile].filter(Boolean);
      if (extraFiles.length > 0) {
        setPhase("extracting"); setBusy("Ruhsat / İskan belgeleri okunuyor…");
        const extraPromises = extraFiles.map(async (file) => {
          const fb64 = await toBase64(file);
          const fmime = file.type || "application/pdf";
          const fraw = await callAPI(RUHSAT_EXTRACT_SYS, [{
            role: "user",
            content: [
              { type: "text", text: "Belgeden yapı/ruhsat/iskan bilgilerini çıkar." },
              fmime === "application/pdf"
                ? { type: "document", source: { type: "base64", media_type: fmime, data: fb64 } }
                : { type: "image", source: { type: "base64", media_type: fmime, data: fb64 } }
            ]
          }], MODEL_FAST, 1000);
          return parseJSON(fraw) || {};
        });
        const results = await Promise.all(extraPromises);
        // Merge — dolu olan alanlar kazanır
        for (const r of results) {
          for (const [k, v] of Object.entries(r)) {
            if (v && (typeof v === "string" ? v.trim() : Array.isArray(v) ? v.length > 0 : true)) {
              ruhsatData[k] = v;
            }
          }
        }
      }
      setPct(40);

      // 3. Web location research — sonnet + search, 1 call only
      setPhase("researching"); setBusy("Konum ve ulaşım bilgileri araştırılıyor…");
      const belgeAdres = ruhsatData.adres || "";
      const q = `${tapu.il || ""} ${tapu.ilce || ""} ${tapu.mahalle || ""} ada:${tapu.ada || ""} parsel:${tapu.parsel || ""}${belgeAdres ? " adres: " + belgeAdres : ""} için konumu araştır ve koordinatını bul. SADECE JSON:
{"koordinat":"","adres":"","bolgeKarakter":"Konut","topluTasima":[],"cevreNoktalar":"","anaAkslar":""}
koordinat: enlem,boylam formatında — bolgeKarakter: Konut|Karma|Ticari|Sanayi|Tarımsal — topluTasima: ["Metro","Otobüs"] gibi dizi`;
      const resRaw = await callAPI(RESEARCH_SYS, [{ role: "user", content: q }], MODEL_SEARCH, 500, true);
      const res = parseJSON(resRaw) || {};

      // 4. Form alanlarını doldur — web araştırma + ruhsat/iskan belgelerinden
      setForm(p => {
        const updated = {
          ...p,
          koordinat: res.koordinat || "",
          adres: res.adres || belgeAdres || "",
          bolgeKarakter: res.bolgeKarakter || "Konut",
          topluTasima: Array.isArray(res.topluTasima) ? res.topluTasima : [],
          cevreNoktalar: res.cevreNoktalar || "",
          anaAkslar: res.anaAkslar || "",
        };
        // Ruhsat/iskan belgelerinden gelen bilgilerle formu doldur
        if (ruhsatData.ruhsatTarihi) updated.ruhsatTarihi = ruhsatData.ruhsatTarihi;
        if (ruhsatData.iskanTarihi) updated.iskanTarihi = ruhsatData.iskanTarihi;
        if (ruhsatData.binaKatSayisi) updated.binaKatSayisi = ruhsatData.binaKatSayisi;
        if (ruhsatData.taks) updated.taks = ruhsatData.taks;
        if (ruhsatData.kaks) updated.kaks = ruhsatData.kaks;
        if (ruhsatData.imarFonksiyon) updated.imarFonksiyon = ruhsatData.imarFonksiyon;
        if (ruhsatData.imarTarihi) updated.imarTarihi = ruhsatData.imarTarihi;
        if (ruhsatData.bbAlan) updated.bbAlan = ruhsatData.bbAlan;
        if (ruhsatData.bbNet) updated.bbNet = ruhsatData.bbNet;
        if (ruhsatData.bbOda) updated.bbOda = ruhsatData.bbOda;
        if (ruhsatData.isitma) updated.isitma = ruhsatData.isitma;
        if (ruhsatData.asansor) updated.asansor = ruhsatData.asansor;
        if (ruhsatData.otopark) updated.otopark = ruhsatData.otopark;
        if (ruhsatData.ekb) updated.ekb = ruhsatData.ekb;
        if (Array.isArray(ruhsatData.cephe) && ruhsatData.cephe.length > 0) updated.cephe = ruhsatData.cephe;
        return updated;
      });
      setPct(60); setPhase("form"); setStep(0); setBusy("");
    } catch (e) {
      setBusy(""); setPhase("setup"); alert("Hata: " + e.message);
    }
  }

  // ── Submit form: 1 API call (sections) ────────────────────────────────────
  async function submitForm() {
    setPhase("generating"); setBusy("Rapor yazılıyor…"); setPct(80); setMobTab("form");
    try {
      const prompt = `${bank} için SPK uyumlu ekspertiz raporu bölümleri.
UZMAN: ${user.ad} | ${user.sicilNo}
TAKBİS: ${JSON.stringify(tapuData)}
FORM: ${JSON.stringify(formData)}
SADECE JSON: {"konumMetni":"","imarMetni":"","projeMaddeleri":["","",""],"yapiMetni":"","bbMetni":"","degerlemeMetni":"","sonucMetni":"","emsalGiris":""}`;

      const raw = await callAPI(SECTIONS_SYS, [{ role: "user", content: prompt }], MODEL_FAST, 2000);
      const secs = parseJSON(raw) || {};
      const tarih = new Date().toLocaleDateString("tr-TR");
      const txt = buildReport(bank, tapuData, formData, secs, tarih);
      setRapor(txt);

      const filled = Object.values(formData).filter(v => Array.isArray(v) ? v.length > 0 : String(v).trim()).length;
      const score = Math.min(98, 78 + Math.floor(filled / 3));
      if (onReportComplete) onReportComplete(bank, tapuData, formData, txt, score);
      setPct(score); setPhase("done"); setBusy("");
    } catch (e) {
      setBusy(""); setPhase("form"); alert("Hata: " + e.message);
    }
  }

  function copyRapor() { navigator.clipboard.writeText(rapor).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); }
  function dlRapor() {
    const blob = new Blob([rapor], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ekspertiz-${tapuData?.il || "rapor"}-${new Date().toLocaleDateString("tr-TR").replace(/\./g, "-")}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }
  function reset() {
    setPhase("setup"); setBank(null); setFile(null); setPct(0);
    setRuhsatFile(null); setIskanFile(null);
    setTapuData(null); setForm({ ...FORM_INIT }); setStep(0);
    setRapor(""); setCopied(false); setBusy(""); setMobTab("setup");
  }

  const canStart = bank && takbisFile && phase === "setup";
  const isBusy = ["extracting", "researching", "generating"].includes(phase);

  return (
    <div style={{ fontFamily: "'Sora',system-ui,sans-serif", background: "#080C18", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;1,500&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:rgba(245,158,11,.2);border-radius:4px;}
        @keyframes appSpin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .bankbtn:hover:not(:disabled){transform:translateY(-2px);} .bankbtn{transition:all .15s;}
        .pbtn{transition:all .15s;} .pbtn:hover:not(:disabled){filter:brightness(1.1);}
        .chip-check:hover{border-color:rgba(245,158,11,.5)!important;}
        input[type=text],input[type=number],textarea{caret-color:#F59E0B;}
        input:focus,textarea:focus{outline:none;border-color:rgba(245,158,11,.5)!important;}
      `}</style>

      {/* ── Header ────────────────────────────────────────────── */}
      <header style={{ background: "rgba(8,12,24,.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(245,158,11,.1)", padding: "0 18px", height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#F59E0B,#B45309)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(245,158,11,.35)" }}>
            <Building2 size={15} color="#080C18" strokeWidth={2} />
          </div>
          <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, color: "#fff", letterSpacing: "-.3px" }}>Ekspertiz<span style={{ color: "#F59E0B", fontStyle: "italic" }}>AI</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {phase === "done" && <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,.12)", color: "#34D399", border: "1px solid rgba(16,185,129,.2)", padding: "3px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 5 }}><CheckCircle2 size={11} /> Rapor Hazır</span>}
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 22, padding: "4px 10px 4px 5px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#F59E0B,#B45309)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{user.ad.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.65)", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.ad}</span>
          </div>
        </div>
      </header>

      {/* ── Mobile tabs ───────────────────────────────────────── */}
      {isMobile && (
        <div style={{ display: "flex", background: "#0D1427", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
          {[["setup", <Settings size={12} />, "Ayarlar"], ["form", <ClipboardList size={12} />, "Form"]].map(([t, icon, l]) => (
            <button key={t} onClick={() => setMobTab(t)}
              style={{ flex: 1, padding: "11px", border: "none", background: "transparent", color: mobileTab === t ? "#F59E0B" : "rgba(255,255,255,.35)", fontFamily: "inherit", fontSize: 12, fontWeight: mobileTab === t ? 700 : 400, cursor: "pointer", borderBottom: mobileTab === t ? "2px solid #F59E0B" : "2px solid transparent", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {icon} {l}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <div style={{ width: isMobile ? "100%" : 264, flexShrink: 0, background: "#0D1427", borderRight: "1px solid rgba(255,255,255,.05)", display: isMobile && mobileTab !== "setup" ? "none" : "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>

            {/* User card */}
            <div style={{ background: "linear-gradient(135deg,rgba(245,158,11,.07),rgba(245,158,11,.02))", border: "1px solid rgba(245,158,11,.12)", borderRadius: 12, padding: "11px 13px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(245,158,11,.5)", textTransform: "uppercase", letterSpacing: "1.8px", marginBottom: 7 }}>Aktif Uzman</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{user.ad}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 2 }}>{user.sicilNo}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", lineHeight: 1.4 }}>{user.sirket}</div>
            </div>

            {/* Bank */}
            <div>
              <SLabel num="1">Hedef Banka</SLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {BANKS.map(b => (
                  <button key={b.id} className="bankbtn" onClick={() => setBank(b.label)} disabled={phase !== "setup"}
                    style={{ background: bank === b.label ? `${b.color}18` : "rgba(255,255,255,.03)", border: `1.5px solid ${bank === b.label ? b.color : "rgba(255,255,255,.07)"}`, borderRadius: 10, padding: "9px 5px", cursor: phase === "setup" ? "pointer" : "not-allowed", color: bank === b.label ? "#fff" : "rgba(255,255,255,.4)", fontFamily: "inherit", fontSize: 11, fontWeight: 600, textAlign: "center", opacity: phase !== "setup" ? .5 : 1 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: b.color, margin: "0 auto 5px", opacity: bank === b.label ? 1 : .35 }} />
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File uploads */}
            <div>
              <SLabel num="2">Belgeler</SLabel>
              {/* TAKBİS — zorunlu */}
              <label style={{ border: `2px dashed ${takbisFile ? "#10B981" : "rgba(255,255,255,.1)"}`, borderRadius: 11, padding: "12px 10px", textAlign: "center", cursor: phase === "setup" ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 10, background: takbisFile ? "rgba(16,185,129,.04)" : "transparent", transition: "all .2s", opacity: phase !== "setup" && !takbisFile ? .45 : 1, marginBottom: 6 }}>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={phase !== "setup"} onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }} />
                <div style={{ width: 32, height: 32, borderRadius: 8, background: takbisFile ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.06)", border: `1px solid ${takbisFile ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: takbisFile ? "#10B981" : "rgba(255,255,255,.3)" }}>
                  {takbisFile ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                </div>
                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,158,11,.6)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 1 }}>TAKBİS <span style={{ color: "#EF4444" }}>*</span></div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: takbisFile ? "#10B981" : "rgba(255,255,255,.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{takbisFile ? takbisFile.name : "PDF veya JPG / PNG"}</div>
                </div>
              </label>
              {/* Ruhsat Belgesi — opsiyonel */}
              <label style={{ border: `1.5px dashed ${ruhsatFile ? "#10B981" : "rgba(255,255,255,.08)"}`, borderRadius: 9, padding: "9px 10px", cursor: phase === "setup" ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 10, background: ruhsatFile ? "rgba(16,185,129,.04)" : "transparent", transition: "all .2s", opacity: phase !== "setup" && !ruhsatFile ? .45 : 1, marginBottom: 6 }}>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={phase !== "setup"} onChange={e => { if (e.target.files[0]) setRuhsatFile(e.target.files[0]); }} />
                <div style={{ width: 28, height: 28, borderRadius: 7, background: ruhsatFile ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.04)", border: `1px solid ${ruhsatFile ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ruhsatFile ? "#10B981" : "rgba(255,255,255,.2)" }}>
                  {ruhsatFile ? <CheckCircle2 size={12} /> : <FileText size={12} />}
                </div>
                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 1 }}>Ruhsat Belgesi</div>
                  <div style={{ fontSize: 10, color: ruhsatFile ? "#10B981" : "rgba(255,255,255,.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ruhsatFile ? ruhsatFile.name : "Opsiyonel"}</div>
                </div>
              </label>
              {/* Yapı Kullanma İzin Belgesi — opsiyonel */}
              <label style={{ border: `1.5px dashed ${iskanFile ? "#10B981" : "rgba(255,255,255,.08)"}`, borderRadius: 9, padding: "9px 10px", cursor: phase === "setup" ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 10, background: iskanFile ? "rgba(16,185,129,.04)" : "transparent", transition: "all .2s", opacity: phase !== "setup" && !iskanFile ? .45 : 1 }}>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={phase !== "setup"} onChange={e => { if (e.target.files[0]) setIskanFile(e.target.files[0]); }} />
                <div style={{ width: 28, height: 28, borderRadius: 7, background: iskanFile ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.04)", border: `1px solid ${iskanFile ? "rgba(16,185,129,.2)" : "rgba(255,255,255,.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: iskanFile ? "#10B981" : "rgba(255,255,255,.2)" }}>
                  {iskanFile ? <CheckCircle2 size={12} /> : <FileText size={12} />}
                </div>
                <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 1 }}>Yapı Kullanma İzni</div>
                  <div style={{ fontSize: 10, color: iskanFile ? "#10B981" : "rgba(255,255,255,.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iskanFile ? iskanFile.name : "Opsiyonel"}</div>
                </div>
              </label>
            </div>

            {/* Start */}
            <button className="pbtn" onClick={startAnalysis} disabled={!canStart}
              style={{ background: canStart ? "linear-gradient(135deg,#F59E0B,#B45309)" : "rgba(255,255,255,.06)", color: canStart ? "#080C18" : "rgba(255,255,255,.2)", border: "none", borderRadius: 12, padding: "13px", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: canStart ? "pointer" : "not-allowed", boxShadow: canStart ? "0 4px 20px rgba(245,158,11,.3)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Zap size={15} /> Analizi Başlat
            </button>

            {/* Progress */}
            <div>
              <SLabel>Aşamalar</SLabel>
              {[
                ["Belgeler Okundu", pct >= 25],
                ["Konum Araştırıldı", pct >= 60],
                ["Form Dolduruldu", phase === "done" || phase === "generating"],
                ["Rapor Hazır", phase === "done"],
              ].map(([l, done], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 11, fontWeight: 500, color: done ? "#34D399" : "rgba(255,255,255,.2)" }}>
                  <div style={{ width: 17, height: 17, borderRadius: "50%", border: `1.5px solid ${done ? "#10B981" : "rgba(255,255,255,.12)"}`, background: done ? "rgba(16,185,129,.12)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done && <CheckCircle2 size={9} color="#10B981" />}
                  </div>
                  {l}
                </div>
              ))}
            </div>

            {phase !== "setup" && (
              <button onClick={reset} style={{ background: "transparent", color: "rgba(255,255,255,.25)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 9, padding: "9px", fontFamily: "inherit", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <RotateCcw size={12} /> Yeni Rapor
              </button>
            )}
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────── */}
        <div style={{ flex: 1, display: isMobile && mobileTab === "setup" ? "none" : "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

          {/* Loading states */}
          {isBusy && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, color: "#fff" }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#F59E0B,#B45309)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(245,158,11,.4)", animation: "pulse 1.5s ease infinite" }}>
                <Bot size={24} color="#080C18" strokeWidth={2} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{busyMsg}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
                  {phase === "extracting" && "TAKBİS belgesi haiku modeli ile okunuyor…"}
                  {phase === "researching" && "Web araştırması yapılıyor (tek seferlik)…"}
                  {phase === "generating" && "Rapor bölümleri oluşturuluyor…"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", animation: `pulse 1s ${i * 0.2}s ease infinite` }} />)}
              </div>
            </div>
          )}

          {/* Welcome (setup phase) */}
          {phase === "setup" && !isBusy && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,rgba(245,158,11,.15),rgba(245,158,11,.05))", border: "1px solid rgba(245,158,11,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <Bot size={30} color="#F59E0B" strokeWidth={1.5} />
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: "#fff", marginBottom: 10 }}>Ekspertiz<span style={{ color: "#F59E0B" }}>AI</span></div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", lineHeight: 1.7, maxWidth: 320, marginBottom: 28 }}>
                Banka ve TAKBİS belgesini seçtikten sonra analiz başlar. Konum bilgileri otomatik araştırılır, kalan bilgileri form ile doldurursunuz.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
                {[
                  { label: "3 API çağrısı", sub: "Önceden 8–10 çağrı" },
                  { label: "Çoktan seçmeli form", sub: "Yazma yerine tıkla & seç" },
                  { label: "Web araştırması", sub: "Konum tek seferlik otomatik" },
                ].map(({ label, sub }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                    <CheckCircle2 size={14} color="#34D399" />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>{label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multi-step form */}
          {phase === "form" && !isBusy && (
            <FormPanel
              formData={formData} formStep={formStep} upd={upd} toggleArr={toggleArr}
              setStep={setStep} submitForm={submitForm} tapuData={tapuData}
            />
          )}

          {/* Done — report card */}
          {phase === "done" && !isBusy && (
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
              <ReportCard rapor={rapor} pct={pct} bank={bank} copied={copied} showRapor={showRapor}
                onCopy={copyRapor} onDownload={dlRapor} onToggle={() => setShowR(p => !p)} onReset={reset} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Multi-step form ──────────────────────────────────────────────────────────
function FormPanel({ formData, formStep, upd, toggleArr, setStep, submitForm, tapuData }) {

  const TOPLU = ["Metro", "Metrobüs", "Tramvay", "Otobüs", "Dolmuş", "Tren", "Minibüs"];
  const CEPHE = ["Kuzey", "Güney", "Doğu", "Batı", "Köşe"];
  const ZEMIN = ["Seramik", "Parke", "Laminat", "Mermer", "Granit", "Halı"];
  const DUVAR = ["Boya", "Alçı", "Ahşap kaplama", "Duvar kağıdı"];
  const OLUMLU_OPT = ["Metro/toplu taşımaya yakın", "Okul & hastane yakınlığı", "Ana artere yakın", "Köşe daire", "Güney cepheli", "Asansörlü bina", "Kapalı otopark", "Yeni/bakımlı bina", "Çift cephe", "Geniş balkon"];
  const OLUMSUZ_OPT = ["Trafiğe yakın (gürültü)", "Kuzey/loş cephe", "Yaşlı bina", "Asansörsüz", "Otopark yok", "Dar sokak cephesi", "İmar kısıtlaması", "Tadilat gerektiriyor"];

  const s = formData;
  const isLast = formStep === 3;

  function addEmsal() { upd("emsaller", [...s.emsaller, { aciklama: "", fiyat: "", tel: "", link: "" }]); }
  function delEmsal(i) { upd("emsaller", s.emsaller.filter((_, j) => j !== i)); }
  function updEmsal(i, k, v) { const a = [...s.emsaller]; a[i] = { ...a[i], [k]: v }; upd("emsaller", a); }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Step header */}
      <div style={{ background: "rgba(13,20,39,.9)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", flexShrink: 0 }}>
        {/* TAKBİS info bar */}
        {tapuData?.il && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {[[tapuData.il, tapuData.ilce].filter(Boolean).join("/"), tapuData.ada && `Ada:${tapuData.ada}`, tapuData.parsel && `Parsel:${tapuData.parsel}`, tapuData.malik?.split(" ").slice(0, 2).join(" ")].filter(Boolean).map((t, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: "rgba(245,158,11,.8)", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.15)", padding: "2px 8px", borderRadius: 20 }}>{t}</span>
            ))}
          </div>
        )}
        {/* Steps */}
        <div style={{ display: "flex", gap: 4 }}>
          {FORM_STEPS.map(({ label, Icon }, i) => {
            const done = i < formStep, active = i === formStep;
            return (
              <button key={i} onClick={() => setStep(i)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 4px", borderRadius: 8, border: `1px solid ${done ? "#10B981" : active ? "#F59E0B" : "rgba(255,255,255,.08)"}`, background: done ? "rgba(16,185,129,.08)" : active ? "rgba(245,158,11,.1)" : "transparent", color: done ? "#34D399" : active ? "#F59E0B" : "rgba(255,255,255,.25)", fontFamily: "inherit", fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer", transition: "all .2s" }}>
                {done ? <CheckCircle2 size={11} color="#34D399" /> : <Icon size={11} />}
                <span style={{ display: "none" }}>{/* hide label on small */}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {/* ── Step 0: Konum ── */}
        {formStep === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FSection title="Adres & Koordinat">
              <FRow>
                <FField label="Koordinat (eni, boyu)">
                  <FInput value={s.koordinat} onChange={v => upd("koordinat", v)} placeholder="41.0082, 28.9784 (web'den otomatik)" />
                </FField>
                <FField label="UAVT Kodu" w="38%">
                  <FInput value={s.uavt} onChange={v => upd("uavt", v)} placeholder="Opsiyonel" />
                </FField>
              </FRow>
              <FField label="Tam Adres">
                <FInput value={s.adres} onChange={v => upd("adres", v)} placeholder="Sokak, No, Daire — web'den otomatik, düzenleyebilirsiniz" />
              </FField>
            </FSection>

            <FSection title="Bölge Karakteri">
              <RadioGroup value={s.bolgeKarakter} onChange={v => upd("bolgeKarakter", v)}
                options={["Konut", "Karma", "Ticari", "Sanayi", "Tarımsal"]} />
            </FSection>

            <FSection title="Toplu Taşıma (web'den otomatik, değiştirebilirsiniz)">
              <CheckGroup values={s.topluTasima} options={TOPLU} onToggle={v => toggleArr("topluTasima", v)} />
            </FSection>

            <FSection title="Çevre & Ulaşım Notu">
              <FTextarea value={s.cevreNoktalar} onChange={v => upd("cevreNoktalar", v)} placeholder="Yakın hastane, okul, AVM, metro durağı… (otomatik dolduruldu)" rows={3} />
            </FSection>
          </div>
        )}

        {/* ── Step 1: İmar & Ruhsat ── */}
        {formStep === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FSection title="İmar Bilgileri">
              <FRow>
                <FField label="TAKS">
                  <FInput type="number" value={s.taks} onChange={v => upd("taks", v)} placeholder="0.40" />
                </FField>
                <FField label="KAKS / Emsal">
                  <FInput type="number" value={s.kaks} onChange={v => upd("kaks", v)} placeholder="2.00" />
                </FField>
                <FField label="İmar Plan Tarihi" w="40%">
                  <FInput value={s.imarTarihi} onChange={v => upd("imarTarihi", v)} placeholder="2018" />
                </FField>
              </FRow>
              <FField label="İmar Fonksiyonu">
                <FInput value={s.imarFonksiyon} onChange={v => upd("imarFonksiyon", v)} placeholder="Konut Alanı / Ticaret Alanı..." />
              </FField>
            </FSection>

            <FSection title="Ruhsat & İskan">
              <FRow>
                <FField label="Yapı Ruhsatı">
                  <FInput value={s.ruhsatTarihi} onChange={v => upd("ruhsatTarihi", v)} placeholder="2015" />
                </FField>
                <FField label="İskan Tarihi">
                  <FInput value={s.iskanTarihi} onChange={v => upd("iskanTarihi", v)} placeholder="2017" />
                </FField>
              </FRow>
            </FSection>

            <FSection title="Enerji Kimlik Belgesi (EKB) Sınıfı">
              <RadioGroup value={s.ekb} onChange={v => upd("ekb", v)}
                options={["A+", "A", "B", "C", "D", "E", "F", "G", "Belirsiz"]}
                colors={{ "A+": "#10B981", "A": "#34D399", "B": "#6EE7B7", "C": "#F59E0B", "D": "#F97316", "E": "#EF4444", "F": "#DC2626", "G": "#991B1B" }} />
            </FSection>
          </div>
        )}

        {/* ── Step 2: Yapı & BB ── */}
        {formStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FSection title="Bina Özellikleri">
              <FRow>
                <FField label="Bina Kat Sayısı">
                  <FInput type="number" value={s.binaKatSayisi} onChange={v => upd("binaKatSayisi", v)} placeholder="8" />
                </FField>
                <FField label="Asansör">
                  <ToggleBtn value={s.asansor} options={["Var", "Yok"]} onChange={v => upd("asansor", v)} />
                </FField>
                <FField label="Otopark">
                  <RadioGroup value={s.otopark} onChange={v => upd("otopark", v)} options={["Yok", "Açık", "Kapalı"]} inline />
                </FField>
              </FRow>
              <FField label="Cephe">
                <CheckGroup values={s.cephe} options={CEPHE} onToggle={v => toggleArr("cephe", v)} inline />
              </FField>
              <FField label="Isıtma Sistemi">
                <RadioGroup value={s.isitma} onChange={v => upd("isitma", v)} inline
                  options={["Doğalgaz Kombi", "Merkezi", "Yerden Isıtma", "Klima", "Soba", "Yok"]} />
              </FField>
            </FSection>

            <FSection title="Bağımsız Bölüm">
              <FRow>
                <FField label="Brüt Alan (m²)">
                  <FInput type="number" value={s.bbAlan} onChange={v => upd("bbAlan", v)} placeholder="120" />
                </FField>
                <FField label="Net Alan (m²)">
                  <FInput type="number" value={s.bbNet} onChange={v => upd("bbNet", v)} placeholder="100" />
                </FField>
                <FField label="Oda Sayısı">
                  <SelectF value={s.bbOda} onChange={v => upd("bbOda", v)} options={["Stüdyo", "1+0", "1+1", "2+1", "3+1", "4+1", "5+1", "6+1", "Daha fazla"]} />
                </FField>
              </FRow>
              <FRow>
                <FField label="Zemin">
                  <CheckGroup values={s.bbZemin} options={ZEMIN} onToggle={v => toggleArr("bbZemin", v)} inline />
                </FField>
                <FField label="Duvar">
                  <CheckGroup values={s.bbDuvar} options={DUVAR} onToggle={v => toggleArr("bbDuvar", v)} inline />
                </FField>
              </FRow>
              <FRow>
                <FField label="Doğrama">
                  <RadioGroup value={s.bbDograma} onChange={v => upd("bbDograma", v)} options={["PVC", "Alüminyum", "Ahşap", "Demir"]} inline />
                </FField>
                <FField label="Kapılar">
                  <RadioGroup value={s.bbKapi} onChange={v => upd("bbKapi", v)} options={["Ahşap", "Çelik", "PVC"]} inline />
                </FField>
              </FRow>
            </FSection>

            <FSection title="Kullanım Durumu">
              <RadioGroup value={s.kullanimDurumu} onChange={v => upd("kullanimDurumu", v)}
                options={["Boş", "Kiracılı", "Mülk sahibi kullanan", "Kaçak / Sorunlu"]} inline />
            </FSection>
          </div>
        )}

        {/* ── Step 3: Değerleme ── */}
        {formStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FSection title="Değer Tespiti">
              <FRow>
                <FField label="Birim Değer (TL/m²)">
                  <FInput type="number" value={s.birimDeger} onChange={v => upd("birimDeger", v)} placeholder="45000" />
                </FField>
                <FField label="Sonuç Değer (TL)">
                  <FInput value={s.sonucDeger} onChange={v => upd("sonucDeger", v)} placeholder="Otomatik hesaplanır" />
                </FField>
              </FRow>
              {s.birimDeger && s.bbNet && (
                <div style={{ background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.15)", borderRadius: 9, padding: "8px 12px", fontSize: 12, color: "#F59E0B" }}>
                  Hesaplama: {s.bbNet} m² × {Number(s.birimDeger).toLocaleString("tr-TR")} TL = {s.sonucDeger}
                </div>
              )}
            </FSection>

            <FSection title="Olumlu Faktörler">
              <CheckGroup values={s.olumlu} options={OLUMLU_OPT} onToggle={v => toggleArr("olumlu", v)} />
            </FSection>

            <FSection title="Olumsuz Faktörler">
              <CheckGroup values={s.olumsuz} options={OLUMSUZ_OPT} onToggle={v => toggleArr("olumsuz", v)} />
            </FSection>

            <FSection title="Emsal Karşılaştırmaları">
              {s.emsaller.map((e, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: "12px", marginBottom: 10, position: "relative" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,158,11,.6)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Emsal {i + 1}</div>
                  <FField label="Açıklama / Adres">
                    <FInput value={e.aciklama} onChange={v => updEmsal(i, "aciklama", v)} placeholder="Örn: Aynı mahallede 3+1, 5. kat" />
                  </FField>
                  <FRow>
                    <FField label="Fiyat">
                      <FInput value={e.fiyat} onChange={v => updEmsal(i, "fiyat", v)} placeholder="4.500.000 TL" />
                    </FField>
                    <FField label="Tel">
                      <FInput value={e.tel} onChange={v => updEmsal(i, "tel", v)} placeholder="0212 ..." />
                    </FField>
                  </FRow>
                  <FField label="Link (opsiyonel)">
                    <FInput value={e.link} onChange={v => updEmsal(i, "link", v)} placeholder="https://sahibinden.com/..." />
                  </FField>
                  {s.emsaller.length > 1 && (
                    <button onClick={() => delEmsal(i)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "rgba(239,68,68,.5)", cursor: "pointer", padding: 2 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addEmsal} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.04)", border: "1px dashed rgba(255,255,255,.12)", borderRadius: 9, padding: "9px 14px", color: "rgba(255,255,255,.4)", fontFamily: "inherit", fontSize: 12, cursor: "pointer", width: "100%", justifyContent: "center" }}>
                <Plus size={13} /> Emsal Ekle
              </button>
            </FSection>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ background: "rgba(13,20,39,.9)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", gap: 10, flexShrink: 0 }}>
        <button onClick={() => setStep(s => s - 1)} disabled={formStep === 0}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "11px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: formStep === 0 ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.5)", fontFamily: "inherit", fontSize: 13, cursor: formStep === 0 ? "not-allowed" : "pointer" }}>
          <ChevronLeft size={15} /> Geri
        </button>
        <div style={{ flex: 1 }} />
        {!isLast ? (
          <button onClick={() => setStep(s => s + 1)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "11px 22px", borderRadius: 10, border: "none", background: "rgba(245,158,11,.15)", color: "#F59E0B", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            İleri <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={submitForm}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#F59E0B,#B45309)", color: "#080C18", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(245,158,11,.35)" }}>
            <Zap size={15} /> Raporu Oluştur
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Report card ──────────────────────────────────────────────────────────────
function ReportCard({ rapor, pct, bank, copied, showRapor, onCopy, onDownload, onToggle, onReset }) {
  return (
    <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 520 }}>
      <div style={{ background: "linear-gradient(135deg,rgba(245,158,11,.12),rgba(180,83,9,.06))", padding: "16px 18px", borderBottom: "1px solid rgba(245,158,11,.1)" }}>
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, color: "#F59E0B", marginBottom: 3 }}>Gayrimenkul Değerleme Raporu</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{bank} · {new Date().toLocaleDateString("tr-TR")}</div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: `conic-gradient(${pct >= 85 ? "#10B981" : "#F59E0B"} ${pct * 3.6}deg, rgba(255,255,255,.06) 0)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#0D1427", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{pct}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)" }}>/100</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: pct >= 85 ? "#34D399" : "#F59E0B" }}>Kalite: {pct >= 90 ? "Çok İyi" : pct >= 75 ? "İyi" : "Orta"}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>AI tarafından oluşturuldu · {bank}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.2)", marginTop: 1 }}>3 API çağrısı · Optimize edilmiş</div>
        </div>
      </div>

      {showRapor && (
        <div style={{ margin: "0 16px 12px" }}>
          <pre style={{ padding: 12, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 9, fontSize: 10, color: "rgba(255,255,255,.65)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "'Courier New',monospace", maxHeight: 320, overflowY: "auto" }}>{rapor}</pre>
        </div>
      )}

      <div style={{ padding: "12px 16px 14px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onCopy} style={{ flex: 1, minWidth: 110, padding: "10px", borderRadius: 10, border: "none", background: copied ? "#10B981" : "linear-gradient(135deg,#F59E0B,#B45309)", color: copied ? "#fff" : "#080C18", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Copy size={13} /> {copied ? "Kopyalandı" : "Kopyala"}
        </button>
        <button onClick={onDownload} style={{ flex: 1, minWidth: 90, padding: "10px", borderRadius: 10, border: "1px solid rgba(59,130,246,.3)", background: "rgba(59,130,246,.1)", color: "#60a5fa", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Download size={13} /> İndir
        </button>
        <button onClick={onToggle} style={{ padding: "10px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,.09)", background: "transparent", color: "rgba(255,255,255,.4)", fontFamily: "inherit", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {showRapor ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button onClick={onReset} style={{ padding: "10px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,.09)", background: "transparent", color: "rgba(255,255,255,.35)", fontFamily: "inherit", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <RotateCcw size={13} /> Yeni
        </button>
      </div>
    </div>
  );
}

// ─── Form sub-components ──────────────────────────────────────────────────────
function SLabel({ num, children }) { return <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>{num && <span style={{ color: "#F59E0B", fontSize: 10 }}>{num}.</span>}{children}</div>; }

function FSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,158,11,.7)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid rgba(245,158,11,.1)" }}>{title}</div>
      {children}
    </div>
  );
}

function FRow({ children }) { return <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>{children}</div>; }

function FField({ label, children, w = "100%" }) {
  return (
    <div style={{ flex: "1 1 auto", minWidth: 120, width: w, marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</label>
      {children}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type = "text" }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", color: "#fff", fontFamily: "inherit", fontSize: 13 }} />
  );
}

function FTextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", color: "#fff", fontFamily: "inherit", fontSize: 12, resize: "vertical", lineHeight: 1.6 }} />
  );
}

function SelectF({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,.09)", background: "#0D1427", color: "#fff", fontFamily: "inherit", fontSize: 13, cursor: "pointer" }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function RadioGroup({ value, onChange, options, inline = false, colors = {} }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(o => {
        const active = value === o;
        const c = colors[o];
        return (
          <button key={o} className="chip-check" onClick={() => onChange(o)}
            style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${active ? (c || "#F59E0B") : "rgba(255,255,255,.1)"}`, background: active ? `${c || "#F59E0B"}18` : "rgba(255,255,255,.03)", color: active ? (c || "#F59E0B") : "rgba(255,255,255,.45)", fontFamily: "inherit", fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", transition: "all .15s" }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function CheckGroup({ values, options, onToggle, inline = false }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(o => {
        const on = values.includes(o);
        return (
          <button key={o} className="chip-check" onClick={() => onToggle(o)}
            style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${on ? "#F59E0B" : "rgba(255,255,255,.1)"}`, background: on ? "rgba(245,158,11,.12)" : "rgba(255,255,255,.03)", color: on ? "#F59E0B" : "rgba(255,255,255,.45)", fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 400, cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center", gap: 5 }}>
            {on && <CheckCircle2 size={10} color="#F59E0B" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ToggleBtn({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", background: "rgba(255,255,255,.05)", borderRadius: 8, padding: 2, gap: 2 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", background: value === o ? "rgba(245,158,11,.2)" : "transparent", color: value === o ? "#F59E0B" : "rgba(255,255,255,.3)", fontFamily: "inherit", fontSize: 12, fontWeight: value === o ? 700 : 400, cursor: "pointer", transition: "all .15s" }}>
          {o}
        </button>
      ))}
    </div>
  );
}
