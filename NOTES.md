# NOTES

## 1. Decisioni tecniche

- Monorepo npm workspaces (`apps/frontend`, `apps/backend`) per un unico `npm install` e script root coordinati.
- Frontend Angular 19 con Reactive Forms + HttpClient (proxy `/api` → Express): stack noto, senza NgRx.
- Backend Express + TypeScript + Zod: API piccola, validazione esplicita al boundary HTTP, testabile con Supertest.
- MongoDB + Mongoose con indice unico `uniq_booking_date_time_slot` su `{ date, time_slot }`: il DB è l’autorità sul conflitto sotto concorrenza; `E11000` → HTTP 409 `BOOKING_SLOT_CONFLICT`.
- `date` e `time_slot` restano stringhe di dominio (YYYY-MM-DD / HH:mm) per evitare conversioni timezone non richieste.
- MongoDB Atlas (free tier) via `MONGODB_URI`; niente Docker/Redis/auth/microservizi nel task base.
- Vitest + Supertest + mongodb-memory-server per test API isolati, incluso il path di conflitto.

## 2. Uso dell’AI

- Tool: Cursor (agente) per bootstrap monorepo, scheletro booking e documentazione iniziale; handoff PDF + challenge originale come specifica.
- Attività AI: scaffolding workspace, struttura layer route/controller/service/repository, envelope errori, scheletro UI booking.
- Verificato / da verificare manualmente: `npm install`, build, lint, test backend (health + 409 + indice unique) passano su questa macchina. `npm run dev` end-to-end richiede un cluster Atlas con `MONGODB_URI` in `.env`; i test usano Mongo in-memory.

## 3. Cosa faresti con più tempo

1. Completare suite test concorrenza (due POST paralleli → 1×201 + 1×409) e smoke e2e FE/BE.
2. Raffinare UX slot (loading granulare, accessibilità, messaggi i18n).
3. Bonus lock temporaneo + SSE solo dopo DoD del task base.
4. Hardening: rate limiting leggero, logging strutturato, health che include ping Mongo.
5. CI GitHub Actions per lint/test/build su Node 22.
