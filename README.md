# OpenField

Crop field investment tracker with 3D terrain, field borders, and financial metrics — open-source data only.

## Structure

- `apps/api` — Node + TypeScript API (PostgreSQL + PostGIS)
- `apps/web` — React + MapLibre 2D/3D frontend
- `docs/` — Plan, transcript notes

## Quick start

```bash
# Install
npm install

# Start DB
npm run db:up

# Run API
npm run dev:api

# Run web (separate terminal)
npm run dev:web
```

See [docs/PLAN.md](docs/PLAN.md) for full plan.
