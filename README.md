# Orderzilla Dashboard

Dashboard for Orderzilla – manage orders, menu, locations, terminals, loyalty, and settings.

## Features

- **Analytics** – Overview with KPIs and charts
- **Orders** – List, filter, update status, export
- **Menu** – Categories, products, extra groups
- **Infrastructure** – Locations and terminals
- **Loyalty** – Program settings, customers
- **Admin** – Users, global settings

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Orderzilla API** integration via OpenAPI
- OAuth 2.0 authentication

## Environment Variables

Create `.env` in the project root:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ORDERZILLA_API_BASE=https://orderzilla-api.tappy-app.ch
ORDERZILLA_ALLOW_INSECURE_TLS=true
```

Optional:

```env
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://your-domain/auth/callback
```

## Getting Started

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run start` – Start production server
- `npm run lint` – Lint with ESLint
- `npm run format` – Format with Prettier
- `npm run generate:api-types` – Regenerate API types from OpenAPI spec

## License

MIT
