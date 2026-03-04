'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import EkspertizApp from './EkspertizApp'

export default function RaporPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      setUser(user)
      supabase.from('users').select('*, companies(*)').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
  }, [])

  // Rapor tamamlandığında Supabase'e kaydet
  async function onReportComplete(bank, tapuData, soruData, reportText, qualityScore) {
    if (!user) return
    const { data: prof } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (!prof) return

    await supabase.from('reports').insert({
      company_id: prof.company_id,
      user_id: user.id,
      bank,
      tapu_data: tapuData,
      soru_data: soruData,
      report_text: reportText,
      quality_score: qualityScore,
      status: 'completed'
    })
  }

  if (!user) return (
    <div style={{ minHeight:'100vh', background:'#030712', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(59,130,246,.3)', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // SESSION_USER'ı profil verisinden override et
  if (profile) {
    // EkspertizApp global SESSION_USER'ı override ediyoruz
    if (typeof window !== 'undefined') {
      window.__EKSPERTIZ_USER__ = {
        ad: profile.full_name || user.email,
        sicilNo: profile.sicil_no || '—',
        sirket: profile.companies?.name || '—',
        lisans: 'SPK Lisanslı Değerleme Uzmanı',
        tel: '—',
        email: user.email,
      }
    }
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Mini header */}
      <div style={{ background:'#0f172a', borderBottom:'1px solid rgba(255,255,255,.07)', padding:'0 20px', height:44, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <a href="/dashboard" style={{ fontSize:12, color:'rgba(255,255,255,.4)', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
          ← Dashboard
        </a>
        <div style={{ fontFamily:"Georgia,serif", fontSize:15, color:'#fff' }}>
          Ekspertiz<span style={{color:'#3b82f6'}}>AI</span>
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{profile?.full_name || user.email}</div>
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <EkspertizApp onReportComplete={onReportComplete} />
      </div>
    </div>
  )
}
