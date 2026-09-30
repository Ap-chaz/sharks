# SHARKS Clinic (React + JavaScript)

Plain Vite + React 19 app written in JS/JSX with hand-written CSS. No TypeScript, no Tailwind.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
npm run format   # optional: prettier
```

## Structure

- `src/main.jsx`, `src/App.jsx` – entry point and routes (React Router)
- `src/pages/` – public pages; `src/pages/admin/` – staff dashboard pages
- `src/components/` – shared UI; `src/components/admin/` – dashboard UI
- `src/lib/` – data layer (`clinic-db.js`, localStorage), hooks, `use-page-meta.js` (page titles/meta)
- `src/styles.css` – all styling

## Notes

- Public site: `/`, `/about`, `/services`, `/doctors`, `/contact`, `/appointment`, `/feedback`. Staff area: `/admin`.
- Shared content (hours, FAQs, doctors, tips, insurers) lives in `src/lib/clinic-data.js`; section components in `src/components/Sections.jsx`. Colors are CSS variables at the top of `src/styles.css`.
- Admin login is a demo (`admin` / `sharks123`); data lives in browser localStorage. It is not real security.
- When deploying to a static host, configure a fallback to `index.html` so deep links like `/about` work.
