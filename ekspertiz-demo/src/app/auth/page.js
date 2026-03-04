'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    fullName: '', sicilNo: '', companyName: '', email: '', password: '', confirmPassword: ''
  })

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    })
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard')
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Şifreler eşleşmiyor.'); setLoading(false); return
    }
    if (registerForm.password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.'); setLoading(false); return
    }

    // 1. Supabase Auth kaydı
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      options: { data: { full_name: registerForm.fullName } }
    })
    if (authError) { setError(authError.message); setLoading(false); return }

    // 2. Şirket oluştur
    const slug = registerForm.companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: registerForm.companyName, slug, plan: 'trial' })
      .select().single()

    if (companyError) { setError('Şirket oluşturulamadı: ' + companyError.message); setLoading(false); return }

    // 3. Kullanıcı profili
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        company_id: company.id,
        full_name: registerForm.fullName,
        sicil_no: registerForm.sicilNo,
        role: 'admin'
      })

    if (userError) { setError('Profil oluşturulamadı: ' + userError.message); setLoading(false); return }

    setSuccess('Hesabınız oluşturuldu! Email doğrulama için gelen kutunuzu kontrol edin.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
        input { transition: border-color .2s, box-shadow .2s; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .form-card { animation: fadeIn .4s ease; }
      `}</style>

      {/* Sol — branding */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #0f172a 0%, #0c1220 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(59,130,246,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.05) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,.12) 0%, transparent 60%)' }} />

        <a href="/" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#fff', textDecoration: 'none', marginBottom: 64, position: 'relative' }}>
          Ekspertiz<span style={{ color: '#3b82f6' }}>AI</span>
        </a>

        <div style={{ position: 'relative' }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 40, lineHeight: 1.15, letterSpacing: '-1px', color: '#fff', marginBottom: 20 }}>
            Değerleme raporunu<br />
            <span style={{ fontStyle: 'italic', color: '#60a5fa' }}>yapay zeka</span> ile yaz
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', lineHeight: 1.7, maxWidth: 400, marginBottom: 48 }}>
            TAKBİS belgeni yükle, banka seç — geri kalanını AI halleder. SPK uyumlu, KVKK güvenli.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '⚡', text: 'Ortalama 3 dakikada tam rapor' },
              { icon: '🔒', text: 'KVKK uyumlu, şifreli depolama' },
              { icon: '🏦', text: '6+ banka formatı desteği' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,.7)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sağ — form */}
      <div style={{ width: 480, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#080f1a' }}>
        <div className="form-card" style={{ width: '100%', maxWidth: 380 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: 4, marginBottom: 32 }}>
            {[['login','Giriş Yap'],['register','Kayıt Ol']].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);setError('');setSuccess('')}}
                style={{ flex:1, padding:'9px', borderRadius:7, border:'none', background:tab===t?'#1d4ed8':'transparent', color:tab===t?'#fff':'rgba(255,255,255,.4)', fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
                {l}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#fca5a5', marginBottom:20 }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div style={{ background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#6ee7b7', marginBottom:20 }}>
              ✓ {success}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin}>
              <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:'#fff', marginBottom:6 }}>Tekrar hoş geldiniz</h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginBottom:28 }}>Hesabınıza giriş yapın</p>

              <Field label="E-posta" type="email" value={loginForm.email}
                onChange={v => setLoginForm(p=>({...p,email:v}))} placeholder="uzman@sirket.com" />
              <Field label="Şifre" type="password" value={loginForm.password}
                onChange={v => setLoginForm(p=>({...p,password:v}))} placeholder="••••••••" />

              <div style={{ textAlign:'right', marginBottom:24 }}>
                <a href="#" style={{ fontSize:13, color:'#60a5fa', textDecoration:'none' }}>Şifremi Unuttum</a>
              </div>

              <SubmitBtn loading={loading}>Giriş Yap</SubmitBtn>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:26, color:'#fff', marginBottom:6 }}>Hesap Oluşturun</h1>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginBottom:28 }}>14 gün ücretsiz deneyin</p>

              <Field label="Ad Soyad" value={registerForm.fullName}
                onChange={v=>setRegisterForm(p=>({...p,fullName:v}))} placeholder="Ahmet Yılmaz" />
              <Field label="SPK Sicil No" value={registerForm.sicilNo}
                onChange={v=>setRegisterForm(p=>({...p,sicilNo:v}))} placeholder="GAY-2024-00001" />
              <Field label="Şirket Adı" value={registerForm.companyName}
                onChange={v=>setRegisterForm(p=>({...p,companyName:v}))} placeholder="Değerleme A.Ş." />
              <Field label="E-posta" type="email" value={registerForm.email}
                onChange={v=>setRegisterForm(p=>({...p,email:v}))} placeholder="uzman@sirket.com" />
              <Field label="Şifre" type="password" value={registerForm.password}
                onChange={v=>setRegisterForm(p=>({...p,password:v}))} placeholder="En az 8 karakter" />
              <Field label="Şifre Tekrar" type="password" value={registerForm.confirmPassword}
                onChange={v=>setRegisterForm(p=>({...p,confirmPassword:v}))} placeholder="••••••••" />

              <SubmitBtn loading={loading}>Ücretsiz Başla</SubmitBtn>

              <p style={{ fontSize:12, color:'rgba(255,255,255,.3)', textAlign:'center', marginTop:16 }}>
                Kayıt olarak Gizlilik Politikası ve KVKK aydınlatma metnini kabul etmiş sayılırsınız.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, type='text', value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'rgba(255,255,255,.6)', marginBottom:7 }}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required
        style={{ width:'100%', padding:'11px 14px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'#fff', fontFamily:'inherit', fontSize:14 }} />
    </div>
  )
}

function SubmitBtn({ loading, children }) {
  return (
    <button type="submit" disabled={loading}
      style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:loading?'rgba(59,130,246,.5)':'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', fontFamily:'inherit', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
      {loading ? <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/> Lütfen bekleyin…</> : children}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </button>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{background:'#030712',minHeight:'100vh'}}/>}>
      <AuthForm />
    </Suspense>
  )
}
