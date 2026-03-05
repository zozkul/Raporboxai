'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Zap, Shield, Building2, Mail, Lock, User, Loader2 } from 'lucide-react'

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

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      options: { data: { full_name: registerForm.fullName } }
    })
    if (authError) { setError(authError.message); setLoading(false); return }

    const slug = registerForm.companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({ name: registerForm.companyName, slug, plan: 'trial' })
      .select().single()

    if (companyError) { setError('Şirket oluşturulamadı: ' + companyError.message); setLoading(false); return }

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: var(--accent) !important; box-shadow: 0 0 0 3px var(--accent-dim); }
        input { transition: border-color .2s, box-shadow .2s; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes spinAnim { to{transform:rotate(360deg)} }
        .form-card { animation: fadeIn .4s ease; }
        .auth-branding { flex: 1; background: var(--bg-secondary); display: flex; flex-direction: column; justify-content: center; padding: 60px 80px; position: relative; overflow: hidden; }
        .auth-form-panel { width: 480px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 40px 48px; background: var(--bg-primary); border-left: 1px solid var(--border); }
        @media(max-width: 768px) {
          .auth-branding { display: none !important; }
          .auth-form-panel { width: 100% !important; padding: 32px 20px !important; align-items: flex-start !important; padding-top: 40px !important; border-left: none !important; }
        }
        .mobile-logo { display: none !important; }
        @media(max-width:768px){ .mobile-logo { display: block !important; } }
      `}</style>

      {/* Left — branding */}
      <div className="auth-branding">
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--hero-grid) 1px, transparent 1px), linear-gradient(90deg, var(--hero-grid) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, var(--accent-dim) 0%, transparent 60%)' }} />

        <a href="/" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: 'var(--text-primary)', textDecoration: 'none', marginBottom: 64, position: 'relative' }}>
          Ekspertiz<span style={{ color: 'var(--accent)' }}>AI</span>
        </a>

        <div style={{ position: 'relative' }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 40, lineHeight: 1.15, letterSpacing: '-1px', color: 'var(--text-primary)', marginBottom: 20 }}>
            Değerleme raporunu<br />
            <span style={{ fontStyle: 'italic', color: 'var(--accent-text)' }}>yapay zeka</span> ile yaz
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 400, marginBottom: 48 }}>
            TAKBİS belgeni yükle, banka seç — geri kalanını AI halleder. SPK uyumlu, KVKK güvenli.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { Icon: Zap, text: 'Ortalama 3 dakikada tam rapor', color: '#f59e0b' },
              { Icon: Shield, text: 'KVKK uyumlu, şifreli depolama', color: 'var(--accent)' },
              { Icon: Building2, text: '6+ banka formatı desteği', color: '#10b981' },
            ].map(({ Icon, text, color }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-form-panel">
        <div className="form-card" style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile logo */}
          <a href="/" className="mobile-logo" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: 'var(--text-primary)', textDecoration: 'none', marginBottom: 32 }}>
            Ekspertiz<span style={{ color: 'var(--accent)' }}>AI</span>
          </a>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 32 }}>
            {[['login','Giriş Yap'],['register','Kayıt Ol']].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);setError('');setSuccess('')}}
                style={{ flex:1, padding:'9px', borderRadius:7, border:'none', background:tab===t?'var(--accent)':'transparent', color:tab===t?'#fff':'var(--text-muted)', fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer', transition:'all .2s' }}>
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
              <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:26, color:'var(--text-primary)', marginBottom:6 }}>Tekrar hoş geldiniz</h1>
              <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:28 }}>Hesabınıza giriş yapın</p>

              <Field label="E-posta" type="email" icon={Mail} value={loginForm.email}
                onChange={v => setLoginForm(p=>({...p,email:v}))} placeholder="uzman@sirket.com" />
              <Field label="Şifre" type="password" icon={Lock} value={loginForm.password}
                onChange={v => setLoginForm(p=>({...p,password:v}))} placeholder="••••••••" />

              <div style={{ textAlign:'right', marginBottom:24 }}>
                <a href="#" style={{ fontSize:13, color:'var(--accent-text)', textDecoration:'none' }}>Şifremi Unuttum</a>
              </div>

              <SubmitBtn loading={loading}>Giriş Yap</SubmitBtn>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:26, color:'var(--text-primary)', marginBottom:6 }}>Hesap Oluşturun</h1>
              <p style={{ fontSize:14, color:'var(--text-muted)', marginBottom:28 }}>14 gün ücretsiz deneyin</p>

              <Field label="Ad Soyad" icon={User} value={registerForm.fullName}
                onChange={v=>setRegisterForm(p=>({...p,fullName:v}))} placeholder="Ahmet Yılmaz" />
              <Field label="SPK Sicil No" value={registerForm.sicilNo}
                onChange={v=>setRegisterForm(p=>({...p,sicilNo:v}))} placeholder="GAY-2024-00001" />
              <Field label="Şirket Adı" icon={Building2} value={registerForm.companyName}
                onChange={v=>setRegisterForm(p=>({...p,companyName:v}))} placeholder="Değerleme A.Ş." />
              <Field label="E-posta" type="email" icon={Mail} value={registerForm.email}
                onChange={v=>setRegisterForm(p=>({...p,email:v}))} placeholder="uzman@sirket.com" />
              <Field label="Şifre" type="password" icon={Lock} value={registerForm.password}
                onChange={v=>setRegisterForm(p=>({...p,password:v}))} placeholder="En az 8 karakter" />
              <Field label="Şifre Tekrar" type="password" icon={Lock} value={registerForm.confirmPassword}
                onChange={v=>setRegisterForm(p=>({...p,confirmPassword:v}))} placeholder="••••••••" />

              <SubmitBtn loading={loading}>Ücretsiz Başla</SubmitBtn>

              <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', marginTop:16 }}>
                Kayıt olarak Gizlilik Politikası ve KVKK aydınlatma metnini kabul etmiş sayılırsınız.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, type='text', icon: Icon, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:7 }}>{label}</label>
      <div style={{ position:'relative' }}>
        {Icon && (
          <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none', display:'flex' }}>
            <Icon size={15} strokeWidth={1.75} />
          </div>
        )}
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required
          style={{ width:'100%', padding:Icon?'11px 14px 11px 38px':'11px 14px', borderRadius:9, border:'1.5px solid var(--border-strong)', background:'var(--bg-card)', color:'var(--text-primary)', fontFamily:'inherit', fontSize:14 }} />
      </div>
    </div>
  )
}

function SubmitBtn({ loading, children }) {
  return (
    <button type="submit" disabled={loading}
      style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background:loading?'var(--accent-border)':'var(--accent)', color:'#fff', fontFamily:'inherit', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .2s' }}>
      {loading ? (
        <><Loader2 size={16} style={{ animation:'spinAnim .7s linear infinite' }}/> Lütfen bekleyin…</>
      ) : children}
    </button>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{background:'var(--bg-primary)',minHeight:'100vh'}}/>}>
      <AuthForm />
    </Suspense>
  )
}
