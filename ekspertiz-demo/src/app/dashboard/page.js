'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reports')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setUser(user)

    const { data: prof } = await supabase.from('users').select('*, companies(*)').eq('id', user.id).single()
    if (prof) { setProfile(prof); setCompany(prof.companies) }

    const { data: reps } = await supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(20)
    if (reps) setReports(reps)

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function deleteReport(id) {
    if (!confirm('Bu raporu silmek istediğinizden emin misiniz?')) return
    await supabase.from('reports').delete().eq('id', id)
    setReports(p => p.filter(r => r.id !== id))
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'system-ui' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid rgba(59,130,246,.3)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Yükleniyor…
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#030712', color:'#fff', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap'); *{box-sizing:border-box}`}</style>

      {/* Sidebar */}
      <div style={{ position:'fixed', left:0, top:0, bottom:0, width:240, background:'#080f1a', borderRight:'1px solid rgba(255,255,255,.06)', display:'flex', flexDirection:'column', padding:'24px 16px', zIndex:50 }}>
        <Link href="/" style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:'#fff', textDecoration:'none', marginBottom:36, display:'block', padding:'0 8px' }}>
          Ekspertiz<span style={{color:'#3b82f6'}}>AI</span>
        </Link>

        {/* Company badge */}
        {company && (
          <div style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.15)', borderRadius:10, padding:'10px 12px', marginBottom:24 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>Şirket</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{company.name}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2, textTransform:'uppercase' }}>{company.plan} plan</div>
          </div>
        )}

        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          {[
            {id:'reports', icon:'📊', label:'Raporlarım'},
            {id:'new', icon:'➕', label:'Yeni Rapor', href:'/rapor'},
            {id:'team', icon:'👥', label:'Ekip'},
            {id:'settings', icon:'⚙️', label:'Ayarlar'},
          ].map(({id,icon,label,href})=>(
            href ? (
              <Link key={id} href={href} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.2)', color:'#fff', textDecoration:'none', fontSize:14, fontWeight:600 }}>
                {icon} {label}
              </Link>
            ) : (
              <button key={id} onClick={()=>setActiveTab(id)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:activeTab===id?'rgba(255,255,255,.07)':'transparent', border:'none', color:activeTab===id?'#fff':'rgba(255,255,255,.5)', fontSize:14, fontWeight:500, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                {icon} {label}
              </button>
            )
          ))}
        </nav>

        {/* User info */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{profile?.full_name || user?.email}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{profile?.sicil_no || profile?.role}</div>
          </div>
          <button onClick={handleLogout} style={{ background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', fontSize:16, padding:4 }} title="Çıkış">↩</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ marginLeft:240, padding:'32px 40px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:36 }}>
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:30, letterSpacing:'-0.5px' }}>
              {activeTab==='reports'?'Raporlarım':activeTab==='team'?'Ekip Yönetimi':'Ayarlar'}
            </h1>
            <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginTop:4 }}>
              {company?.name} · {reports.length} rapor
            </p>
          </div>
          <Link href="/rapor" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none' }}>
            + Yeni Rapor
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:32 }}>
          {[
            {label:'Toplam Rapor', value:reports.length, icon:'📋', color:'#3b82f6'},
            {label:'Bu Ay', value:reports.filter(r=>new Date(r.created_at)>new Date(Date.now()-30*24*60*60*1000)).length, icon:'📅', color:'#10b981'},
            {label:'Tamamlanan', value:reports.filter(r=>r.status==='completed').length, icon:'✅', color:'#8b5cf6'},
            {label:'Kalan Limit', value: company?.report_limit ? `${Math.max(0, company.report_limit - reports.length)}/${company.report_limit}` : '∞', icon:'⚡', color:'#f59e0b'},
          ].map(({label,value,icon,color})=>(
            <div key={label} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'20px 24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:8 }}>{label}</div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:32, letterSpacing:'-1px', color:'#fff' }}>{value}</div>
                </div>
                <div style={{ fontSize:24 }}>{icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Reports table */}
        {activeTab === 'reports' && (
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:600 }}>Son Raporlar</span>
            </div>
            {reports.length === 0 ? (
              <div style={{ padding:'60px 24px', textAlign:'center', color:'rgba(255,255,255,.3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:16, marginBottom:8 }}>Henüz rapor yok</div>
                <Link href="/rapor" style={{ fontSize:14, color:'#3b82f6', textDecoration:'none' }}>İlk raporunuzu oluşturun →</Link>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,.03)' }}>
                    {['Taşınmaz','Banka','Tarih','Kalite','Durum',''].map(h=>(
                      <th key={h} style={{ padding:'12px 24px', textAlign:'left', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r=>(
                    <tr key={r.id} style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
                      <td style={{ padding:'14px 24px', fontSize:13, color:'rgba(255,255,255,.8)' }}>
                        {r.tapu_data?.il}/{r.tapu_data?.ilce} · {r.tapu_data?.ada}/{r.tapu_data?.parsel}
                      </td>
                      <td style={{ padding:'14px 24px', fontSize:13 }}>{r.bank || '—'}</td>
                      <td style={{ padding:'14px 24px', fontSize:12, color:'rgba(255,255,255,.4)' }}>
                        {new Date(r.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td style={{ padding:'14px 24px' }}>
                        {r.quality_score ? (
                          <span style={{ fontSize:12, fontWeight:700, color:r.quality_score>=85?'#10b981':'#f59e0b' }}>{r.quality_score}/100</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding:'14px 24px' }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:r.status==='completed'?'rgba(16,185,129,.1)':'rgba(245,158,11,.1)', color:r.status==='completed'?'#10b981':'#f59e0b' }}>
                          {r.status==='completed'?'Tamamlandı':'Taslak'}
                        </span>
                      </td>
                      <td style={{ padding:'14px 24px' }}>
                        <button onClick={()=>deleteReport(r.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.2)', cursor:'pointer', fontSize:16, padding:4 }} title="Sil">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'40px', textAlign:'center', color:'rgba(255,255,255,.4)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
            <div style={{ fontSize:16, marginBottom:8 }}>Ekip yönetimi yakında</div>
            <div style={{ fontSize:14 }}>Uzman davet etme ve rol yönetimi eklenecek.</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:560 }}>
            <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, padding:'24px' }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Profil Bilgileri</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['Ad Soyad', profile?.full_name],['Sicil No', profile?.sicil_no],['E-posta', user?.email],['Rol', profile?.role==='admin'?'Yönetici':'Uzman']].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:4, textTransform:'uppercase', letterSpacing:'1px' }}>{k}</div>
                    <div style={{ fontSize:14, color:'#fff' }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'rgba(239,68,68,.04)', border:'1px solid rgba(239,68,68,.15)', borderRadius:16, padding:'24px' }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8, color:'#fca5a5' }}>Hesabı Kapat</h3>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:16 }}>Tüm verileriniz ve raporlarınız kalıcı olarak silinir.</p>
              <button style={{ padding:'10px 20px', borderRadius:8, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#fca5a5', fontFamily:'inherit', fontSize:13, cursor:'pointer' }}>
                Hesabı Sil
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
