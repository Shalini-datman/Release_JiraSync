# Datman – Release Tracker

A release management platform for tracking, analysing, and sharing releases across Gateway and Application teams.

---

## 🚀 Run Locally

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18+ installed
- [Git](https://git-scm.com/) installed

### 2. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/datman-release-tracker.git
cd datman-release-tracker
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📦 Build for Production

```bash
npm run build
```

The output goes into the `dist/` folder.

To preview the production build locally:

```bash
npm run preview
```

---

## ☁️ Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Vercel auto-detects Vite and sets everything up. Your app will be live at a `*.vercel.app` URL.

### Option B — GitHub + Vercel Dashboard

1. Push this repo to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/datman-release-tracker.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo

3. Vercel auto-detects Vite settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. Click **Deploy**. Done — live URL in ~30 seconds.

### Option C — Re-deploy on every push

Once connected via Option B, every `git push` to `main` auto-deploys.

---

## 🗂 Project Structure

```
datman-release-tracker/
├── index.html           # HTML entry point
├── vite.config.js       # Vite config
├── package.json
├── vercel.json          # Vercel SPA routing
├── .gitignore
├── public/
│   └── favicon.svg      # Datman logo favicon
└── src/
    ├── main.jsx         # React mount point
    └── App.jsx          # Entire application (single-file)
```

---

## ✨ Features

- **Table View** — sortable, searchable releases with Jira links, DORA metrics, delay tracking
- **Node Graph View** — force-directed visual of releases grouped by module
- **Analytics Dashboard** — lead time KPIs, releases by module, per-release lead time table, team breakdown
- **CSV Import** — paste or upload a spreadsheet CSV with automatic column mapping
- **DORA Popup** — inline DORA metrics per release
- **Hover Cards** — clickable Jira + RN links on graph nodes

---

## 📄 CSV Import Format

Supported column headers (any order):

| Column | Maps To |
|---|---|
| Task | Summary (required) |
| Goal | Goal |
| Priority | Hotfix / P1 / P2 / P3 / P4 |
| Release Date | Actual Release (DD/MM/YYYY) |
| RN Link | Release Note URL |
| Jira Release Link | Jira Link |
| Release Status | Released / Not Released / Rolledback |
| Modules | Pipe/comma/semicolon separated |
| Sandeep's Approval | Approver |
| Nitish's Approval | Approver |
| Pradeep's Approval | Approver |
| Muz's Approval | Approver |
| Sundar's Approval | Approver |
