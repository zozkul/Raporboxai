export const metadata = {
  title: 'EkspertizAI — Gayrimenkul Değerleme',
  description: 'TAKBİS belgesi yükle, banka seç, rapor al.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
