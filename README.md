<div align="center">

<img src="public/favicon.svg" width="64" height="64" alt="LotLedger logo" />

# LotLedger

### Dealer OS for independent auto lots

Track every vehicle, every cost, and every dollar of projected gross —
from acquisition to sale.

[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## What it does

LotLedger is a lightweight inventory management tool built for independent car dealers who are tired of spreadsheets. Add vehicles, log every cost, and see your projected gross margin update in real time.

| Feature | Description |
|---|---|
| 📋 **Inventory tracking** | Stock number, VIN, mileage, color, days on lot, status |
| 💰 **Cost ledger** | Itemize every dollar from purchase to ready-for-sale |
| 📊 **Gross margin dashboard** | Cost basis, asking total, and projected gross at a glance |
| 📄 **PDF exports** | One-click inventory reports with your dealership branding |
| 🚗 **Frazer import** | Paste a Frazer export and your inventory populates instantly |
| 🌙 **Dark mode** | Because sometimes you're working late |
| 🔒 **Fully local** | All data lives in your browser — no account, no server, no subscription |

---

## Getting started

On first launch you'll be walked through a quick setup — your name, dealership name, phone, email, and address. Takes about 30 seconds. After that, add your first vehicle and you're off.

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import it
3. Set **Framework Preset** to **Other**
4. Set **Build Command** to `npm run build` and **Output Directory** to `dist`
5. Click **Deploy**

---

## Tech stack

- [React 18](https://react.dev) — UI
- [Vite 5](https://vitejs.dev) — build tool
- [Tailwind CSS 3](https://tailwindcss.com) — styling
- [lucide-react](https://lucide.dev) — icons
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export (loaded on demand)

---

<div align="center">
  <sub>Built for the lot. Runs in the browser.</sub>
</div>
