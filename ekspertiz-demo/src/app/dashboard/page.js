'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import {
  BarChart3, Calendar, CheckCircle2, Zap, FileText, Download, Trash2,
  Users, Settings, LogOut, Plus, Menu, X, LayoutDashboard
} from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'

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
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-primary)', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid var(--accent-dim)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'dashSpin .7s linear infinite', margin:'0 auto 16px' }} />
        <style>{`@keyframes dashSpin{to{transform:rotate(360deg)}}`}</style>
        Yükleniyor…
      </div>
    </div>
  )

  const navItems = [
    {id:'reports', Icon: LayoutDashboard, label:'Raporlarım'},
    {id:'new', Icon: Plus, label:'Yeni Rapor', href:'/rapor'},
    {id:'team', Icon: Users, label:'Ekip'},
    {id:'settings', Icon: Settings, label:'Ayarlar'},
  ]

  const stats = [
    {label:'Toplam Rapor', value:reports.length, Icon:FileText, color:'var(--accent)'},
    {label:'Bu Ay', value:reports.filter(r=>new Date(r.created_at)>new Date(Date.now()-30*24*60*60*1000)).length, Icon:Calendar, color:'#10b981'},
    {label:'Tamamlanan', value:reports.filter(r=>r.status==='completed').length, Icon:CheckCircle2, color:'#8b5cf6'},
    {label:'Kalan Limit', value:company?.report_limit?`${Math.max(0,company.report_limit-reports.length)}/${company.report_limit}`:'∞', Icon:Zap, color:'#f59e0b'},
  ]

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', color:'var(--text-primary)', fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif" }}>
      <style>{`
        *{box-sizing:border-box}
        @keyframes dashSpin{to{transform:rotate(360deg)}}
        .dash-sidebar {
          position: fixed; left: 0; top: 0; bottom: 0; width: 240px;
          background: var(--bg-secondary); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; padding: 24px 16px; z-index: 50;
          transition: transform .25s;
        }
        .dash-main { margin-left: 240px; padding: 32px 40px; }
        .dash-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 32px; }
        .dash-topbar { display: none; }
        .sidebar-overlay { display: none; }
        .dash-table-wrap { overflow-x: auto; }
        .report-row-actions { display: flex; gap: 6px; align-items: center; }
        .nav-item { transition: background .15s, color .15s; }
        .nav-item:hover { background: var(--bg-card-hover) !important; color: var(--text-primary) !important; }
        .stat-card { transition: border-color .2s; }
        .stat-card:hover { border-color: var(--border-strong) !important; }
        @media(max-width: 768px) {
          .dash-sidebar { transform: translateX(-100%); }
          .dash-sidebar.open { transform: translateX(0); }
          .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 49; }
          .dash-main { margin-left: 0 !important; padding: 16px !important; }
          .dash-stats { grid-template-columns: repeat(2,1fr) !important; gap: 12px !important; }
          .dash-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 40; }
          .dash-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .dash-header h1 { font-size: 24px !important; }
          .sidebar-close { display: flex !important; }
        }
      `}</style>

      {/* Mobile topbar */}
      <div className="dash-topbar">
        <button onClick={()=>setSidebarOpen(true)} style={{ background:'none', border:'none', color:'var(--text-primary)', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }}>
          <Menu size={22} />
        </button>
        <Link href="/" style={{ fontFamily:"'Instrument Serif',serif", fontSize:20, color:'var(--text-primary)', textDecoration:'none' }}>
          Ekspertiz<span style={{color:'var(--accent)'}}>AI</span>
        </Link>
        <Link href="/rapor" style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:8, background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:700, textDecoration:'none' }}>
          <Plus size={14} /> Rapor
        </Link>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)}/>}

      {/* Sidebar */}
      <div className={`dash-sidebar${sidebarOpen?' open':''}`}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:36, padding:'0 8px' }}>
          <Link href="/" style={{ fontFamily:"'Instrument Serif',serif", fontSize:22, color:'var(--text-primary)', textDecoration:'none' }}>
            Ekspertiz<span style={{color:'var(--accent)'}}>AI</span>
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <ThemeToggle size="sm" />
            <button onClick={()=>setSidebarOpen(false)} className="sidebar-close" style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', display:'none', alignItems:'center' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {company && (
          <div style={{ background:'var(--accent-dim)', border:'1px solid var(--accent-border)', borderRadius:10, padding:'10px 12px', marginBottom:24 }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:4 }}>Şirket</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{company.name}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, textTransform:'uppercase' }}>{company.plan} plan</div>
          </div>
        )}

        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
          {navItems.map(({id,Icon,label,href})=>(
            href ? (
              <Link key={id} href={href} onClick={()=>setSidebarOpen(false)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', color:'var(--text-primary)', textDecoration:'none', fontSize:14, fontWeight:600 }}>
                <Icon size={16} strokeWidth={1.75} /> {label}
              </Link>
            ) : (
              <button key={id} className="nav-item" onClick={()=>{setActiveTab(id);setSidebarOpen(false)}}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, background:activeTab===id?'var(--bg-card)':'transparent', border:'none', color:activeTab===id?'var(--text-primary)':'var(--text-muted)', fontSize:14, fontWeight:activeTab===id?600:400, cursor:'pointer', textAlign:'left', fontFamily:'inherit', width:'100%' }}>
                <Icon size={16} strokeWidth={1.75} /> {label}
              </button>
            )
          ))}
        </nav>

        <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{profile?.full_name || user?.email}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{profile?.sicil_no || profile?.role}</div>
          </div>
          <button onClick={handleLogout} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }} title="Çıkış">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="dash-main">
        <div className="dash-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <h1 style={{ fontFamily:"'Instrument Serif',serif", fontSize:30, letterSpacing:'-0.5px' }}>
              {activeTab==='reports'?'Raporlarım':activeTab==='team'?'Ekip Yönetimi':'Ayarlar'}
            </h1>
            <p style={{ fontSize:14, color:'var(--text-muted)', marginTop:4 }}>
              {company?.name} · {reports.length} rapor
            </p>
          </div>
          <Link href="/rapor" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:10, background:'var(--accent)', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none', flexShrink:0 }}>
            <Plus size={16} /> Yeni Rapor
          </Link>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {stats.map(({label,value,Icon,color})=>(
            <div key={label} className="stat-card" style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 20px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>{label}</div>
                  <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:28, letterSpacing:'-1px', color:'var(--text-primary)' }}>{value}</div>
                </div>
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--bg-card-hover)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={18} color={color} strokeWidth={1.75} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reports */}
        {activeTab === 'reports' && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, fontWeight:600 }}>Son Raporlar</span>
            </div>
            {reports.length === 0 ? (
              <div style={{ padding:'60px 24px', textAlign:'center', color:'var(--text-muted)' }}>
                <FileText size={40} style={{ margin:'0 auto 12px', opacity:.35, display:'block' }} />
                <div style={{ fontSize:16, marginBottom:8 }}>Henüz rapor yok</div>
                <Link href="/rapor" style={{ fontSize:14, color:'var(--accent)', textDecoration:'none' }}>İlk raporunuzu oluşturun →</Link>
              </div>
            ) : (
              <div className="dash-table-wrap">
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                  <thead>
                    <tr style={{ background:'var(--bg-card-hover)' }}>
                      {['Taşınmaz','Banka','Tarih','Kalite',''].map(h=>(
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r=>(
                      <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}>
                        <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>
                          {r.tapu_data?.il}/{r.tapu_data?.ilce} · {r.tapu_data?.ada}/{r.tapu_data?.parsel}
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:13, whiteSpace:'nowrap' }}>{r.bank || '—'}</td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
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
                              <button onClick={()=>downloadReport(r)} style={{ display:'flex', alignItems:'center', gap:5, background:'var(--accent-dim)', border:'1px solid var(--accent-border)', color:'var(--accent-text)', cursor:'pointer', fontSize:12, padding:'5px 10px', borderRadius:7, fontFamily:'inherit', whiteSpace:'nowrap' }}>
                                <Download size={13} /> İndir
                              </button>
                            )}
                            <button onClick={()=>deleteReport(r.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }} title="Sil">
                              <Trash2 size={15} />
                            </button>
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
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'40px', textAlign:'center', color:'var(--text-muted)' }}>
            <Users size={40} style={{ margin:'0 auto 12px', opacity:.35, display:'block' }} />
            <div style={{ fontSize:16, marginBottom:8 }}>Ekip yönetimi yakında</div>
            <div style={{ fontSize:14 }}>Uzman davet etme ve rol yönetimi eklenecek.</div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:560 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'24px' }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>Profil Bilgileri</h3>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[['Ad Soyad', profile?.full_name],['Sicil No', profile?.sicil_no],['E-posta', user?.email],['Rol', profile?.role==='admin'?'Yönetici':'Uzman']].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'1px' }}>{k}</div>
                    <div style={{ fontSize:14, color:'var(--text-primary)', wordBreak:'break-all' }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'rgba(239,68,68,.04)', border:'1px solid rgba(239,68,68,.15)', borderRadius:16, padding:'24px' }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:8, color:'#fca5a5' }}>Hesabı Kapat</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Tüm verileriniz ve raporlarınız kalıcı olarak silinir.</p>
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
