export const metadata = {
  title: 'EkspertizAI — Gayrimenkul Değerleme',
  description: 'TAKBİS belgesi yükle, banka seç, rapor al.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
