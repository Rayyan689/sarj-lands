# Sarj Real Estate

Investor and admin platform for Sarj Real Estate's Riyadh land portfolio (120 parcels, 88 districts).

- `data/portfolio.json` is the single source of truth, built by `python3 scripts/build_data.py <source dir>`.
  All 120 parcels are kept; every data fix is listed under `corrections`.
- Secrets live only in Vercel environment variables (see `.env.example`).

```
npm install
npm run dev
```
