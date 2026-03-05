'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#030712', color: '#fff', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100% { opacity:.4; } 50% { opacity:.9; } }
        .fade-up { animation: fadeUp .7s ease forwards; opacity: 0; }
        .d1{animation-delay:.1s}.d2{animation-delay:.25s}.d3{animation-delay:.4s}.d4{animation-delay:.55s}
        .feature-card:hover { transform: translateY(-4px); border-color: rgba(59,130,246,.4) !important; }
        .feature-card { transition: transform .2s, border-color .2s; }
        .cta-btn:hover { transform: scale(1.03); box-shadow: 0 0 40px rgba(59,130,246,.5); }
        .cta-btn { transition: transform .2s, box-shadow .2s; }
        .nav-links { display: flex; gap: 32px; }
        .nav-btns { display: flex; gap: 12px; }
        .hero-btns { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
        .hero-stats { display: flex; gap: 48px; flex-wrap: wrap; justify-content: center; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .mobile-menu-btn { display: none; background: none; border: none; color: #fff; cursor: pointer; font-size: 22px; padding: 4px; }
        @media(max-width: 640px) {
          .nav-links { display: none !important; }
          .nav-btns .nav-signup { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .nav-login { padding: 8px 14px !important; font-size: 13px !important; }
          .hero-btns { flex-direction: column; align-items: stretch; gap: 10px; }
          .hero-btns a { text-align: center; }
          .hero-stats { gap: 24px; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .footer-inner { flex-direction: column; text-align: center; gap: 12px; }
          .how-item { flex-direction: column !important; gap: 16px !important; }
          .how-icon { width: 48px !important; height: 48px !important; }
        }
        .mobile-menu {
          display: none;
          position: fixed; top: 64px; left: 0; right: 0; z-index: 99;
          background: rgba(3,7,18,.98); border-bottom: 1px solid rgba(255,255,255,.08);
          padding: 16px 24px; flex-direction: column; gap: 4px;
        }
        .mobile-menu.open { display: flex; }
        .mobile-menu a { padding: 12px 8px; font-size: 15px; color: rgba(255,255,255,.7); text-decoration: none; border-bottom: 1px solid rgba(255,255,255,.05); }
        .mobile-menu a:last-child { border-bottom: none; }
      `}</style>

      {/* Navbar */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'0 20px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', background: scrolled?'rgba(3,7,18,.92)':'transparent', backdropFilter: scrolled?'blur(12px)':'none', borderBottom: scrolled?'1px solid rgba(255,255,255,.06)':'none', transition:'all .3s' }}>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22 }}>Ekspertiz<span style={{color:'#3b82f6'}}>AI</span></div>
        <div className="nav-links">
          {['Özellikler','Nasıl Çalışır','Fiyatlandırma'].map(l=>(
            <a key={l} href={'#'+l.toLowerCase().replace(/\s/g,'-')} style={{ fontSize:14, color:'rgba(255,255,255,.6)', textDecoration:'none' }}>{l}</a>
          ))}
        </div>
        <div className="nav-btns" style={{ display:'flex', gap:12, alignItems:'center' }}>
          <Link href="/auth" className="nav-login" style={{ padding:'9px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', color:'#fff', fontSize:14, fontWeight:500, textDecoration:'none' }}>Giriş Yap</Link>
          <Link href="/auth?tab=register" className="cta-btn nav-signup" style={{ padding:'9px 20px', borderRadius:8, background:'#3b82f6', color:'#fff', fontSize:14, fontWeight:600, textDecoration:'none' }}>Ücretsiz Başla</Link>
          <button className="mobile-menu-btn" onClick={()=>setMenuOpen(p=>!p)}>{menuOpen ? '✕' : '☰'}</button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu${menuOpen?' open':''}`}>
        {['Özellikler','Nasıl Çalışır','Fiyatlandırma'].map(l=>(
          <a key={l} href={'#'+l.toLowerCase().replace(/\s/g,'-')} onClick={()=>setMenuOpen(false)}>{l}</a>
        ))}
        <Link href="/auth?tab=register" onClick={()=>setMenuOpen(false)} style={{ padding:'12px 8px', fontSize:15, color:'#60a5fa', textDecoration:'none', fontWeight:600 }}>Ücretsiz Başla →</Link>
      </div>

      {/* Hero */}
      <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', textAlign:'center', padding:'120px 20px 80px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(59,130,246,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.06) 1px, transparent 1px)', backgroundSize:'60px 60px', maskImage:'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)' }} />
        <div style={{ position:'absolute', top:'10%', left:'50%', transform:'translateX(-50%)', width:600, height:300, background:'radial-gradient(ellipse, rgba(59,130,246,.18) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div className="fade-up d1" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.25)', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:600, color:'#93c5fd', marginBottom:28, letterSpacing:'.4px', textTransform:'uppercase' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', animation:'pulse 2s ease infinite' }} />
          SPK Uyumlu · AI Destekli · Türkiye'ye Özel
        </div>

        <h1 className="fade-up d2" style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(36px,7vw,80px)', lineHeight:1.08, letterSpacing:'-1.5px', maxWidth:820, marginBottom:24 }}>
          TAKBİS'ten<br/>
          <span style={{ fontStyle:'italic', background:'linear-gradient(135deg,#60a5fa,#3b82f6,#1d4ed8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>dakikalar içinde</span><br/>
          banka raporu
        </h1>

        <p className="fade-up d3" style={{ fontSize:'clamp(15px,2vw,18px)', color:'rgba(255,255,255,.55)', maxWidth:540, lineHeight:1.7, marginBottom:40, padding:'0 8px' }}>
          Tapu belgesini yükle, bankayı seç. Yapay zeka tüm bölümleri doldursun — koordinat, imar durumu, takyidat, emsaller, değerleme.
        </p>

        <div className="hero-btns fade-up d4">
          <Link href="/auth?tab=register" className="cta-btn" style={{ padding:'14px 32px', borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', fontSize:15, fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            Hemen Dene — Ücretsiz →
          </Link>
          <a href="#nasıl-çalışır" style={{ padding:'14px 28px', borderRadius:10, border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.8)', fontSize:15, fontWeight:500, textDecoration:'none', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
            Nasıl Çalışır?
          </a>
        </div>

        <div className="hero-stats fade-up d4" style={{ marginTop:64, paddingTop:48, borderTop:'1px solid rgba(255,255,255,.06)', width:'100%', maxWidth:640 }}>
          {[['3 dk','Ortalama rapor süresi'],['12+','Desteklenen banka formatı'],['%95','AI kalite skoru'],['KVKK','Uyumlu altyapı']].map(([n,l])=>(
            <div key={n} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(28px,5vw,36px)', color:'#60a5fa', letterSpacing:'-1px' }}>{n}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="özellikler" style={{ padding:'80px 20px', maxWidth:1160, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#3b82f6', letterSpacing:'2px', textTransform:'uppercase', marginBottom:16 }}>Özellikler</div>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(28px,4vw,48px)', letterSpacing:'-1px' }}>Değerleme sürecini<br/>yeniden tasarladık</h2>
        </div>
        <div className="features-grid">
          {[
            {icon:'🔍',title:'Akıllı TAKBİS Okuma',desc:'PDF veya görüntü yükle — AI ada, parsel, malik, takyidat, rehin, şerh ve irtifak bilgilerini saniyeler içinde çıkarır.',color:'#3b82f6'},
            {icon:'🏦',title:'Çoklu Banka Formatı',desc:'Yapı Kredi, Akbank, Ziraat, İş Bankası, Garanti, Halkbank — her bankanın istediği formata otomatik dönüşüm.',color:'#8b5cf6'},
            {icon:'📍',title:'Konum & İmar Analizi',desc:'Koordinat, adres, UAVT ve imar durumu bilgileri chatbot ile hızlıca tamamlanır. Eksik alan kalmaz.',color:'#06b6d4'},
            {icon:'🔒',title:'KVKK Uyumlu Altyapı',desc:'Belgeler AES-256 ile şifreli, AB sunucularında saklanır. Şirketler arası veri yalıtımı Row Level Security ile sağlanır.',color:'#10b981'},
            {icon:'👥',title:'Çok Kullanıcılı Yönetim',desc:'Her değerleme şirketi kendi uzmanlarını yönetir. Admin ve uzman rolleri, rapor geçmişi, şirket bazlı istatistikler.',color:'#f59e0b'},
            {icon:'📊',title:'Rapor Geçmişi',desc:'Tüm raporlar saklanır, aranabilir ve indirilebilir. Kalite skoru ile rapor kalitesini takip edin.',color:'#ef4444'},
          ].map(({icon,title,desc,color})=>(
            <div key={title} className="feature-card" style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'28px' }}>
              <div style={{ width:48, height:48, borderRadius:12, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:18 }}>{icon}</div>
              <div style={{ fontSize:17, fontWeight:600, marginBottom:10 }}>{title}</div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.5)', lineHeight:1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="nasıl-çalışır" style={{ padding:'80px 20px', background:'rgba(255,255,255,.015)', borderTop:'1px solid rgba(255,255,255,.05)', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#3b82f6', letterSpacing:'2px', textTransform:'uppercase', marginBottom:16 }}>Nasıl Çalışır</div>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(28px,4vw,48px)', letterSpacing:'-1px', marginBottom:56 }}>3 adımda rapor hazır</h2>
          {[
            {n:'01',title:"TAKBİS'i yükle",desc:'Tapu belgesini PDF veya görüntü olarak yükle. AI saniyeler içinde tüm tapu bilgilerini otomatik okur.',icon:'📋'},
            {n:'02',title:'Eksikleri tamamla',desc:"Chatbot sadece TAKBİS'te olmayan bilgileri sorar — koordinat, imar durumu, yapı özellikleri, emsaller.",icon:'💬'},
            {n:'03',title:'Raporu al',desc:"Seçtiğin bankanın formatında tam rapor hazır. Kopyala, indir, gönder.",icon:'✅'},
          ].map(({n,title,desc,icon},i,arr)=>(
            <div key={n} className="how-item" style={{ display:'flex', gap:32, alignItems:'flex-start', padding:'32px 0', borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,.06)':'none', textAlign:'left' }}>
              <div className="how-icon" style={{ flexShrink:0, width:64, height:64, borderRadius:16, background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{icon}</div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#3b82f6', letterSpacing:'1px', marginBottom:8 }}>{n}</div>
                <div style={{ fontSize:'clamp(17px,2vw,20px)', fontWeight:600, marginBottom:10, fontFamily:"'DM Serif Display',serif" }}>{title}</div>
                <div style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.7 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="fiyatlandırma" style={{ padding:'80px 20px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#3b82f6', letterSpacing:'2px', textTransform:'uppercase', marginBottom:16 }}>Fiyatlandırma</div>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(28px,4vw,48px)', letterSpacing:'-1px' }}>Şirketinizin boyutuna göre</h2>
        </div>
        <div className="pricing-grid">
          {[
            {name:'Trial',price:'Ücretsiz',period:'14 gün',features:['10 rapor','2 kullanıcı','Tüm banka formatları','Email destek'],cta:'Ücretsiz Başla',highlight:false},
            {name:'Starter',price:'₺2.490',period:'/ ay',features:['100 rapor / ay','10 kullanıcı','Tüm banka formatları','Rapor geçmişi','Öncelikli destek'],cta:'Hemen Başla',highlight:true},
            {name:'Pro',price:'₺6.990',period:'/ ay',features:['Sınırsız rapor','Sınırsız kullanıcı','Özel banka şablonları','API erişimi','Özel entegrasyon'],cta:'Satış Ekibi',highlight:false},
          ].map(({name,price,period,features,cta,highlight})=>(
            <div key={name} style={{ background:highlight?'linear-gradient(135deg,rgba(59,130,246,.12),rgba(29,78,216,.08))':'rgba(255,255,255,.03)', border:`1px solid ${highlight?'rgba(59,130,246,.4)':'rgba(255,255,255,.07)'}`, borderRadius:20, padding:'36px 28px', position:'relative' }}>
              {highlight&&<div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'#3b82f6', color:'#fff', fontSize:11, fontWeight:700, padding:'4px 14px', borderRadius:20, whiteSpace:'nowrap' }}>EN POPÜLER</div>}
              <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:12 }}>{name}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:28 }}>
                <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:38, letterSpacing:'-2px' }}>{price}</span>
                <span style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>{period}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:32 }}>
                {features.map(f=>(
                  <div key={f} style={{ display:'flex', gap:10, alignItems:'center', fontSize:14, color:'rgba(255,255,255,.7)' }}>
                    <span style={{ color:'#10b981' }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <Link href="/auth?tab=register" style={{ display:'block', textAlign:'center', padding:'12px', borderRadius:10, background:highlight?'linear-gradient(135deg,#3b82f6,#1d4ed8)':'rgba(255,255,255,.07)', color:'#fff', fontSize:14, fontWeight:600, textDecoration:'none' }}>{cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 20px', textAlign:'center', borderTop:'1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:'clamp(26px,4vw,44px)', letterSpacing:'-1px', marginBottom:16 }}>Hemen ücretsiz deneyin</h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.5)', marginBottom:32 }}>Kredi kartı gerekmez. 14 gün boyunca tüm özellikler ücretsiz.</p>
          <Link href="/auth?tab=register" className="cta-btn" style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'16px 40px', borderRadius:12, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', fontSize:16, fontWeight:700, textDecoration:'none' }}>Ücretsiz Hesap Oluştur →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:'28px 20px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
        <div className="footer-inner">
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18 }}>Ekspertiz<span style={{color:'#3b82f6'}}>AI</span></div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.3)' }}>© 2024 EkspertizAI · KVKK Uyumlu</div>
          <div style={{ display:'flex', gap:24 }}>
            {['Gizlilik','KVKK','İletişim'].map(l=>(
              <a key={l} href="#" style={{ fontSize:13, color:'rgba(255,255,255,.3)', textDecoration:'none' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
