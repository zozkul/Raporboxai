'use client'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ size = 'md' }) {
  const [theme, setTheme] = useState('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('ekspertiz-theme') || document.documentElement.getAttribute('data-theme') || 'dark'
    setTheme(saved)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('ekspertiz-theme', next)
  }

  const dim = size === 'sm' ? { btn: 32, icon: 14 } : { btn: 38, icon: 17 }

  if (!mounted) return <div style={{ width: dim.btn, height: dim.btn }} />

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      style={{
        width: dim.btn, height: dim.btn, borderRadius: 10,
        border: '1px solid var(--border)', background: 'var(--bg-card)',
        color: 'var(--text-secondary)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .2s', flexShrink: 0,
      }}
    >
      {theme === 'dark' ? <Sun size={dim.icon} /> : <Moon size={dim.icon} />}
    </button>
  )
}
