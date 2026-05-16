# LotLedger — Dealer OS

Inventory management and cost tracking for independent auto dealers.

## Local development

```bash
npm install
npm run dev
```

## Deploy to Vercel

### Option A — Vercel CLI
```bash
npm install -g vercel
vercel
```
Vercel will auto-detect **Vite** as the framework. Accept the defaults.

### Option B — Vercel dashboard (GitHub)
1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Vite — no settings to change.
4. Click **Deploy**.

### Build settings (auto-detected, shown for reference)
| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

## Tech stack
- React 18
- Vite 5
- Tailwind CSS 3
- lucide-react icons
- jsPDF (loaded on-demand for PDF export)
