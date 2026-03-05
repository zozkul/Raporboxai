export const metadata = {
  title: 'EkspertizAI — Gayrimenkul Değerleme',
  description: 'TAKBİS belgesi yükle, banka seç, rapor al.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          html[data-theme="dark"], :root {
            --bg-primary: #030712;
            --bg-secondary: #080f1a;
            --bg-card: rgba(255,255,255,.03);
            --bg-card-hover: rgba(255,255,255,.06);
            --text-primary: #f1f5f9;
            --text-secondary: rgba(241,245,249,.55);
            --text-muted: rgba(241,245,249,.3);
            --border: rgba(255,255,255,.07);
            --border-strong: rgba(255,255,255,.14);
            --accent: #3b82f6;
            --accent-dim: rgba(59,130,246,.1);
            --accent-border: rgba(59,130,246,.25);
            --accent-text: #60a5fa;
            --hero-grid: rgba(59,130,246,.055);
            --nav-bg: rgba(3,7,18,.94);
          }
          html[data-theme="light"] {
            --bg-primary: #f0f4ff;
            --bg-secondary: #ffffff;
            --bg-card: rgba(255,255,255,.8);
            --bg-card-hover: rgba(255,255,255,1);
            --text-primary: #0f172a;
            --text-secondary: rgba(15,23,42,.58);
            --text-muted: rgba(15,23,42,.38);
            --border: rgba(15,23,42,.08);
            --border-strong: rgba(15,23,42,.16);
            --accent: #2563eb;
            --accent-dim: rgba(37,99,235,.08);
            --accent-border: rgba(37,99,235,.2);
            --accent-text: #1d4ed8;
            --hero-grid: rgba(37,99,235,.07);
            --nav-bg: rgba(240,244,255,.95);
          }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: var(--bg-primary); color: var(--text-primary); transition: background .25s, color .25s; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 2px; }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('ekspertiz-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
          } catch(e){}
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
