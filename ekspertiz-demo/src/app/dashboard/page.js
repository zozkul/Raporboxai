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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  function downloadReport(r) {
    const text = r.report_text || 'Rapor metni bulunamadı.'
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ekspertiz-${r.tapu_data?.il||'rapor'}-${r.tapu_data?.ada||''}-${r.tapu_data?.parsel||''}.txt`
    a.click()
    URL.revokeObjectURL(url)
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

  const navItems = [
    {id:'reports', icon:'📊', label:'Raporlarım'},
    {id:'new', icon:'➕', label:'Yeni Rapor', href:'/rapor'},
    {id:'team', icon:'👥', label:'Ekip'},
    {id:'settings', icon:'⚙️', label:'Ayarlar'},
  ]

  return (
    <div style={{ minHeight:'100vh', background:'#030712', color:'#fff', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
        *{box-sizing:border-box}
        .dash-sidebar {
          position: fixed; left: 0; top: 0; bottom: 0; width: 240px;
          background: #080f1a; border-right: 1px solid rgba(255,255,255,.06);
          display: flex; flex-direction: column; padding: 24px 16px; z-index: 50;
          transition: transform .25s;
        }
        .dash-main { margin-left: 240px; padding: 32px 40px; }
        .dash-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 32px; }
        .dash-topbar { display: none; }
        .sidebar-overlay { display: none; }
        .dash-table-wrap { overflow-x: auto; }
        .report-row-actions { display: flex; gap: 6px; }
        @media(max-width: 768px) {
          .dash-sidebar { transform: translateX(-100%); }
          .dash-sidebar.open { transform: translateX(0); }
          .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 49; }
          .dash-main { margin-left: 0 !important; padding: 16px !important; }
          .dash-stats { grid-template-columns: repeat(2,1fr) !important; gap: 12px !important; }
          .dash-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #080f1a; border-bottom: 1px solid rgba(255,255,255,.06); position: sticky; top: 0; z-index: 40; }
          .dash-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .dash-header h1 { font-size: 24px !important; }
        }
      `}</style>

      {/* Mobile topbar */}
      <div className="dash-topbar">
        <button onClick={()=>setSidebarOpen(true)} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:4 }}>☰</button>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:20 }}>Ekspertiz<span style={{color:'#3b82f6'}}>AI</span></div>
        <Link href="/rapor" style={{ padding:'8px 14px', borderRadius:8, background:'#3b82f6', color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none' }}>+ Rapor</Link>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}/>}

      {/* Sidebar */}
      <div className={`dash-sidebar${sidebarOpen?' open':''}`}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:36, padding:'0 8px' }}>
          <Link href="/" style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:'#fff', textDecoration:'none' }}>
            Ekspertiz<span style={{color:'#3b82f6'}}>AI</span>
          </Link>
          <button onClick={()=>setSidebarOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', fontSize:18, cursor:'pointer', display:'none' }} className="sidebar-close">✕</button>
        </div>
        <style>{`@media(max-width:768px){.sidebar-close{display:block!important;}}`}</style>

        {company && (
          <div style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.15)', borderRadius:10, padding:'10px 12px', marginBottom:24 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>Şirket</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{company.name}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2, textTransform:'uppercase' }}>{company.plan} plan</div>
          </div>
        )}

        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          {navItems.map(({id,icon,label,href})=>(
            href ? (
              <Link key={id} href={href} onClick={()=>setSidebarOpen(false)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.2)', color:'#fff', textDecoration:'none', fontSize:14, fontWeight:600 }}>
                {icon} {label}
              </Link>
            ) : (
              <button key={id} onClick={()=>{setActiveTab(id);setSidebarOpen(false)}}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:activeTab===id?'rgba(255,255,255,.07)':'transparent', border:'none', color:activeTab===id?'#fff':'rgba(255,255,255,.5)', fontSize:14, fontWeight:500, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                {icon} {label}
              </button>
            )
          ))}
        </nav>

        <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{profile?.full_name || user?.email}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{profile?.sicil_no || profile?.role}</div>
          </div>
          <button onClick={handleLogout} style={{ background:'none', border:'none', color:'rgba(255,255,255,.3)', cursor:'pointer', fontSize:16, padding:4 }} title="Çıkış">↩</button>
        </div>
      </div>

      {/* Main */}
      <div className="dash-main">
        <div className="dash-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:30, letterSpacing:'-0.5px' }}>
              {activeTab==='reports'?'Raporlarım':activeTab==='team'?'Ekip Yönetimi':'Ayarlar'}
            </h1>
            <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginTop:4 }}>
              {company?.name} · {reports.length} rapor
            </p>
          </div>
          <Link href="/rapor" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none', flexShrink:0 }}>
            + Yeni Rapor
          </Link>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {[
            {label:'Toplam Rapor', value:reports.length, icon:'📋', color:'#3b82f6'},
            {label:'Bu Ay', value:reports.filter(r=>new Date(r.created_at)>new Date(Date.now()-30*24*60*60*1000)).length, icon:'📅', color:'#10b981'},
            {label:'Tamamlanan', value:reports.filter(r=>r.status==='completed').length, icon:'✅', color:'#8b5cf6'},
            {label:'Kalan Limit', value: company?.report_limit ? `${Math.max(0, company.report_limit - reports.length)}/${company.report_limit}` : '∞', icon:'⚡', color:'#f59e0b'},
          ].map(({label,value,icon,color})=>(
            <div key={label} style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:6 }}>{label}</div>
                  <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:28, letterSpacing:'-1px', color:'#fff' }}>{value}</div>
                </div>
                <div style={{ fontSize:20 }}>{icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Reports */}
        {activeTab === 'reports' && (
          <div style={{ background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.07)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:600 }}>Son Raporlar</span>
            </div>
            {reports.length === 0 ? (
              <div style={{ padding:'60px 24px', textAlign:'center', color:'rgba(255,255,255,.3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:16, marginBottom:8 }}>Henüz rapor yok</div>
                <Link href="/rapor" style={{ fontSize:14, color:'#3b82f6', textDecoration:'none' }}>İlk raporunuzu oluşturun →</Link>
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                  <thead>
                    <tr style={{ background:'rgba(255,255,255,.03)' }}>
                      {['Taşınmaz','Banka','Tarih','Kalite',''].map(h=>(
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r=>(
                      <tr key={r.id} style={{ borderTop:'1px solid rgba(255,255,255,.04)' }}>
                        <td style={{ padding:'12px 16px', fontSize:13, color:'rgba(255,255,255,.8)', whiteSpace:'nowrap' }}>
                          {r.tapu_data?.il}/{r.tapu_data?.ilce} · {r.tapu_data?.ada}/{r.tapu_data?.parsel}
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:13, whiteSpace:'nowrap' }}>{r.bank || '—'}</td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'rgba(255,255,255,.4)', whiteSpace:'nowrap' }}>
                          {new Date(r.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                          {r.quality_score ? (
                            <span style={{ fontSize:12, fontWeight:700, color:r.quality_score>=85?'#10b981':'#f59e0b' }}>{r.quality_score}/100</span>
                          ) : '—'}
                        </td>
                        <td style={{ padding:'12px 16px' }}>
                          <div className="report-row-actions">
                            {r.report_text && (
                              <button onClick={()=>downloadReport(r)} style={{ background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', color:'#60a5fa', cursor:'pointer', fontSize:12, padding:'5px 10px', borderRadius:7, fontFamily:'inherit', whiteSpace:'nowrap' }} title="İndir">⬇ İndir</button>
                            )}
                            <button onClick={()=>deleteReport(r.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.2)', cursor:'pointer', fontSize:16, padding:4 }} title="Sil">🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <div style={{ fontSize:14, color:'#fff', wordBreak:'break-all' }}>{v||'—'}</div>
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
