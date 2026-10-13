# Harpia Web

An Angular client for a real-estate operations API: CRM, inventory, reservations, sales, and financial workflows.

This frontend is one half of the Harpia project. The [NestJS API](https://github.com/macielhgustavo/harpia-api) owns authentication, tenant isolation, permissions, and persistence.

## Why this exists

Real-estate workflows cross people, opportunities, units, documents, and payments. The client brings that context into task-oriented screens instead of isolated database forms.

## What it does

- Presents CRM pipelines, opportunity details, activities, and visits.
- Connects unit inventory and commercial workflows to related records.
- Includes authentication, route guards, role-aware UI, and HTTP interceptors.
- Exercises components and services with Angular/Jasmine tests.

UI permission checks improve usability; they are not the authorization boundary.

## Architecture

Angular routes and standalone components call typed services through HTTP interceptors. The API applies authorization and organization scoping before using Prisma/PostgreSQL.

| Layer | Location |
| --- | --- |
| Pages and workflows | `src/app/pages/` |
| Shared client services | `src/app/core/` |
| Environment/API endpoint | `src/environments/` |
| Backend | [harpia-api](https://github.com/macielhgustavo/harpia-api) |

## Tech stack

Angular 18, TypeScript, RxJS, Signals, Tailwind CSS, lucide-angular, Jasmine and Karma.

## Getting started

```bash
git clone https://github.com/macielhgustavo/harpia-web.git
cd harpia-web
npm ci
npm start
```

Open http://localhost:4200. Configure `src/environments/environment.ts` to use your local API. Its checked-in default points to the hosted API; avoid testing writes against that deployment.

Follow the API repository's setup for PostgreSQL and migrations.

## Tests and build

```bash
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Tests require Chrome. A client build does not validate API/database workflows.

## Technical decisions

- Standalone components keep routing and feature boundaries explicit.
- HTTP services centralize backend access.
- Angular guards are a navigation mechanism; enforcement remains server-side.
- Backend and frontend are separate repositories and need compatible contracts.

## Limitations

GitHub Actions gates the build and headless unit tests. A standalone read-only demo and verified screenshots are still needed. This is a development project; no claims of commercial adoption or production scale are made.

## Roadmap

- Add reproducible local API configuration.
- Maintain a small end-to-end commercial acceptance journey.
- Publish a demo backed by synthetic data.
