'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Menu, X, Search, Building2, MapPin, Shield, Users, BarChart3,
  Upload, MessageSquare, CheckCircle2, ArrowRight, Zap, ChevronRight,
  Star
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'

const FEATURES = [
  { icon: Search,    title: 'Akıllı TAKBİS Okuma',   desc: 'PDF veya görüntü yükle — AI ada, parsel, malik, takyidat, rehin, şerh ve irtifak bilgilerini saniyeler içinde çıkarır.', color: '#3b82f6' },
  { icon: Building2, title: 'Çoklu Banka Formatı',   desc: 'Yapı Kredi, Akbank, Ziraat, İş Bankası, Garanti, Halkbank — her bankanın istediği formata otomatik dönüşüm.', color: '#8b5cf6' },
  { icon: MapPin,    title: 'Konum & İmar Analizi',  desc: 'Koordinat, adres, UAVT ve imar durumu bilgileri chatbot ile hızlıca tamamlanır. Eksik alan kalmaz.', color: '#06b6d4' },
  { icon: Shield,    title: 'KVKK Uyumlu Altyapı',  desc: 'Belgeler AES-256 ile şifreli, AB sunucularında saklanır. Şirketler arası veri yalıtımı Row Level Security ile sağlanır.', color: '#10b981' },
  { icon: Users,     title: 'Çok Kullanıcılı Yönetim', desc: 'Her değerleme şirketi kendi uzmanlarını yönetir. Admin ve uzman rolleri, rapor geçmişi, şirket bazlı istatistikler.', color: '#f59e0b' },
  { icon: BarChart3, title: 'Rapor Geçmişi',         desc: 'Tüm raporlar saklanır, aranabilir ve indirilebilir. Kalite skoru ile rapor kalitesini takip edin.', color: '#ef4444' },
]

const HOW = [
  { n: '01', icon: Upload,         title: "TAKBİS'i yükle",   desc: 'Tapu belgesini PDF veya görüntü olarak yükle. AI saniyeler içinde tüm tapu bilgilerini otomatik okur.' },
  { n: '02', icon: MessageSquare,  title: 'Eksikleri tamamla', desc: "Chatbot sadece TAKBİS'te olmayan bilgileri sorar — koordinat, imar durumu, yapı özellikleri, emsaller." },
  { n: '03', icon: CheckCircle2,   title: 'Raporu al',         desc: 'Seçtiğin bankanın formatında tam rapor hazır. Kopyala, indir, gönder.' },
]

const PLANS = [
  { name: 'Trial',   price: 'Ücretsiz', period: '14 gün',  features: ['10 rapor', '2 kullanıcı', 'Tüm banka formatları', 'Email destek'],                                    cta: 'Ücretsiz Başla', highlight: false },
  { name: 'Starter', price: '₺2.490',   period: '/ ay',    features: ['100 rapor / ay', '10 kullanıcı', 'Tüm banka formatları', 'Rapor geçmişi', 'Öncelikli destek'],         cta: 'Hemen Başla',    highlight: true  },
  { name: 'Pro',     price: '₺6.990',   period: '/ ay',    features: ['Sınırsız rapor', 'Sınırsız kullanıcı', 'Özel banka şablonları', 'API erişimi', 'Özel entegrasyon'],    cta: 'Satış Ekibi',    highlight: false },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .fade-up { animation: fadeUp .65s ease forwards; opacity: 0; }
        .d1{animation-delay:.05s}.d2{animation-delay:.18s}.d3{animation-delay:.3s}.d4{animation-delay:.42s}
        .feat-card { transition: transform .2s, box-shadow .2s, border-color .2s; cursor: default; }
        .feat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,.15); border-color: var(--accent-border) !important; }
        .cta-primary { transition: transform .18s, box-shadow .18s; }
        .cta-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(59,130,246,.35); }
        .cta-secondary { transition: background .18s, border-color .18s; }
        .cta-secondary:hover { background: var(--bg-card-hover) !important; border-color: var(--border-strong) !important; }
        .plan-card { transition: transform .2s, box-shadow .2s; }
        .plan-card:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(0,0,0,.12); }
        .nav-link { transition: color .15s; }
        .nav-link:hover { color: var(--text-primary) !important; }
        .nav-logo { font-family: 'Instrument Serif', Georgia, serif; }
        .display-font { font-family: 'Instrument Serif', Georgia, serif; }
        .mobile-menu-overlay {
          position: fixed; inset: 0; z-index: 98;
          background: var(--bg-primary); padding: 80px 24px 32px;
          display: flex; flex-direction: column; gap: 4px;
          transform: translateX(100%); transition: transform .25s ease;
        }
        .mobile-menu-overlay.open { transform: translateX(0); }
        .mob-link { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; font-size: 18px; font-weight: 600; color: var(--text-primary); text-decoration: none; border-bottom: 1px solid var(--border); }
        @media(max-width:640px) {
          .nav-links-desktop { display: none !important; }
          .nav-btns-desktop .btn-register { display: none !important; }
        }
        @media(min-width:641px) {
          .mobile-menu-btn { display: none !important; }
        }
        .feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        @media(max-width:900px) { .feat-grid { grid-template-columns: repeat(2,1fr) !important; } .pricing-grid { grid-template-columns: 1fr !important; } }
        @media(max-width:580px) { .feat-grid { grid-template-columns: 1fr !important; } }
        .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .hero-stats { display: flex; gap: 48px; justify-content: center; flex-wrap: wrap; }
        @media(max-width:480px) {
          .hero-btns { flex-direction: column; align-items: stretch; }
          .hero-btns a { text-align: center; justify-content: center; }
          .hero-stats { gap: 24px; }
          .how-row { flex-direction: column !important; }
        }
        .footer-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
        @media(max-width:480px) { .footer-row { flex-direction: column; text-align: center; } }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 20px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'var(--nav-bg)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        transition: 'all .3s',
      }}>
        <Link href="/" className="nav-logo" style={{ fontSize: 22, color: 'var(--text-primary)', textDecoration: 'none' }}>
          Ekspertiz<span style={{ color: 'var(--accent)' }}>AI</span>
        </Link>

        <div className="nav-links-desktop" style={{ display: 'flex', gap: 28 }}>
          {['Özellikler', 'Nasıl Çalışır', 'Fiyatlandırma'].map(l => (
            <a key={l} href={'#' + l.toLowerCase().replace(/\s/g, '-')} className="nav-link"
              style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>

        <div className="nav-btns-desktop" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ThemeToggle size="sm" />
          <Link href="/auth"
            style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: 'all .15s' }}>
            Giriş Yap
          </Link>
          <Link href="/auth?tab=register" className="cta-primary btn-register"
            style={{ padding: '8px 18px', borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            Ücretsiz Başla <ArrowRight size={13} />
          </Link>
          <button className="mobile-menu-btn"
            onClick={() => setMenuOpen(p => !p)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-primary)', cursor: 'pointer', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu-overlay${menuOpen ? ' open' : ''}`}>
        {['Özellikler', 'Nasıl Çalışır', 'Fiyatlandırma'].map(l => (
          <a key={l} href={'#' + l.toLowerCase().replace(/\s/g, '-')} className="mob-link" onClick={() => setMenuOpen(false)}>
            {l} <ChevronRight size={16} color="var(--text-muted)" />
          </a>
        ))}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/auth" onClick={() => setMenuOpen(false)}
            style={{ padding: '13px', borderRadius: 10, border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
            Giriş Yap
          </Link>
          <Link href="/auth?tab=register" onClick={() => setMenuOpen(false)}
            style={{ padding: '13px', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
            Ücretsiz Başla →
          </Link>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
          <ThemeToggle />
        </div>
      </div>

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: '120px 20px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(var(--hero-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hero-grid) 1px, transparent 1px)`, backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)' }} />
        <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', width: 640, height: 320, background: `radial-gradient(ellipse, ${`var(--accent-dim)`} 0%, transparent 70%)`, pointerEvents: 'none', filter: 'blur(2px)' }} />

        <div className="fade-up d1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 24, padding: '6px 16px', fontSize: 11.5, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 32, letterSpacing: '.5px', textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 2s ease infinite' }} />
          SPK Uyumlu · AI Destekli · Türkiye'ye Özel
        </div>

        <h1 className="fade-up d2 display-font" style={{ fontSize: 'clamp(38px,7.5vw,84px)', lineHeight: 1.07, letterSpacing: '-2px', maxWidth: 860, marginBottom: 24 }}>
          TAKBİS'ten<br />
          <span style={{ fontStyle: 'italic', background: 'linear-gradient(135deg, var(--accent-text), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            dakikalar içinde
          </span>
          <br />banka raporu
        </h1>

        <p className="fade-up d3" style={{ fontSize: 'clamp(15px,2vw,18px)', color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.75, marginBottom: 40 }}>
          Tapu belgesini yükle, bankayı seç. Yapay zeka tüm bölümleri doldursun — koordinat, imar durumu, takyidat, emsaller, değerleme.
        </p>

        <div className="hero-btns fade-up d4">
          <Link href="/auth?tab=register" className="cta-primary"
            style={{ padding: '14px 28px', borderRadius: 11, background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Hemen Dene — Ücretsiz <ArrowRight size={16} />
          </Link>
          <a href="#nasıl-çalışır" className="cta-secondary"
            style={{ padding: '14px 24px', borderRadius: 11, border: '1px solid var(--border-strong)', color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)' }}>
            Nasıl Çalışır?
          </a>
        </div>

        <div className="hero-stats fade-up d4" style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid var(--border)', width: '100%', maxWidth: 640 }}>
          {[['3 dk', 'Ortalama rapor süresi'], ['12+', 'Desteklenen banka formatı'], ['%95', 'AI kalite skoru'], ['KVKK', 'Uyumlu altyapı']].map(([n, l]) => (
            <div key={n} style={{ textAlign: 'center' }}>
              <div className="display-font" style={{ fontSize: 'clamp(28px,4vw,36px)', color: 'var(--accent-text)', letterSpacing: '-1px', fontStyle: 'italic' }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="özellikler" style={{ padding: '80px 20px', maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>Özellikler</div>
          <h2 className="display-font" style={{ fontSize: 'clamp(28px,4vw,48px)', letterSpacing: '-1px', color: 'var(--text-primary)' }}>Değerleme sürecini<br />yeniden tasarladık</h2>
        </div>
        <div className="feat-grid">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="feat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px 24px' }}>
              <div style={{ width: 48, height: 48, borderRadius: 13, background: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Icon size={22} color={color} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)', letterSpacing: '-.2px' }}>{title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="nasıl-çalışır" style={{ padding: '80px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>Nasıl Çalışır</div>
          <h2 className="display-font" style={{ fontSize: 'clamp(28px,4vw,48px)', letterSpacing: '-1px', marginBottom: 56, color: 'var(--text-primary)' }}>3 adımda rapor hazır</h2>
          {HOW.map(({ n, icon: Icon, title, desc }, i, arr) => (
            <div key={n} className="how-row" style={{ display: 'flex', gap: 28, alignItems: 'flex-start', padding: '28px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'left' }}>
              <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 16, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} color="var(--accent)" strokeWidth={1.75} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '1px', marginBottom: 8 }}>{n}</div>
                <div className="display-font" style={{ fontSize: 'clamp(17px,2vw,21px)', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{title}</div>
                <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="fiyatlandırma" style={{ padding: '80px 20px', maxWidth: 1020, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 16 }}>Fiyatlandırma</div>
          <h2 className="display-font" style={{ fontSize: 'clamp(28px,4vw,48px)', letterSpacing: '-1px', color: 'var(--text-primary)' }}>Şirketinizin boyutuna göre</h2>
        </div>
        <div className="pricing-grid">
          {PLANS.map(({ name, price, period, features, cta, highlight }) => (
            <div key={name} className="plan-card" style={{ background: highlight ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1.5px solid ${highlight ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 22, padding: '36px 28px', position: 'relative' }}>
              {highlight && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Star size={10} fill="#fff" /> EN POPÜLER
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>{name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 28 }}>
                <span className="display-font" style={{ fontSize: 40, letterSpacing: '-2px', color: 'var(--text-primary)', fontStyle: 'italic' }}>{price}</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 32 }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={15} color="var(--accent)" strokeWidth={2} />{f}
                  </div>
                ))}
              </div>
              <Link href="/auth?tab=register"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 11, background: highlight ? 'var(--accent)' : 'var(--bg-card-hover)', border: highlight ? 'none' : '1px solid var(--border-strong)', color: highlight ? '#fff' : 'var(--text-primary)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                {cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 20px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <Zap size={36} color="var(--accent)" style={{ marginBottom: 20 }} />
          <h2 className="display-font" style={{ fontSize: 'clamp(26px,4vw,44px)', letterSpacing: '-1px', marginBottom: 14, color: 'var(--text-primary)' }}>Hemen ücretsiz deneyin</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 36, lineHeight: 1.7 }}>Kredi kartı gerekmez. 14 gün boyunca tüm özellikler ücretsiz.</p>
          <Link href="/auth?tab=register" className="cta-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 36px', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            Ücretsiz Hesap Oluştur <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 20px', borderTop: '1px solid var(--border)' }}>
        <div className="footer-row">
          <span className="nav-logo" style={{ fontSize: 18, color: 'var(--text-primary)' }}>Ekspertiz<span style={{ color: 'var(--accent)' }}>AI</span></span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>© 2024 EkspertizAI · KVKK Uyumlu</span>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            {['Gizlilik', 'KVKK', 'İletişim'].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
