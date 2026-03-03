# EkspertizAI Demo

TAKBİS belgesi yükle → banka seç → AI rapor üretsin.

## Kurulum

```bash
npm install
npm run dev
```

## Vercel Deploy

1. Bu repoyu GitHub'a push et
2. vercel.com → "Import Project" → repo seç
3. Environment Variables'a ekle:
   - `ANTHROPIC_API_KEY` = sk-ant-...

## Proje Yapısı

```
src/
  app/
    api/claude/route.js   ← Anthropic proxy (API key burada)
    page.js               ← Ana sayfa
    layout.js
  components/
    EkspertizApp.jsx      ← Tüm uygulama
```
