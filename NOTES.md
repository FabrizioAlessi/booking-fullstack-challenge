# NOTES

## 1. Decisioni tecniche

- Monorepo npm workspaces (`apps/frontend`, `apps/backend`) per un unico `npm install` e script root coordinati.
- Frontend Angular 19 con Reactive Forms + HttpClient (proxy `/api` → Express): stack noto, senza NgRx.
- Backend Express + TypeScript + Zod: API piccola, validazione esplicita al boundary HTTP, testabile con Supertest.
- MongoDB Atlas via `MONGODB_URI` + Mongoose; all’avvio si esegue `BookingModel.syncIndexes()` così l’indice unico esiste davvero sul cluster.
- Indice composto `uniq_booking_date_time_slot` su `{ date, time_slot }`: autorità sul conflitto sotto concorrenza; `E11000` → HTTP 409 `BOOKING_SLOT_CONFLICT` (niente `findOne`+`create`).
- `date` / `time_slot` restano stringhe di dominio (YYYY-MM-DD / HH:mm) per evitare timezone inutili.
- Niente Docker/Redis/auth/microservizi; Vitest + Supertest + mongodb-memory-server per i test API (inclusa la race).

## 2. Uso dell’AI

- Tool: Cursor (agente) per bootstrap, CRUD booking, test e documentazione; specifica da handoff PDF + challenge originale.
- Attività AI: monorepo, layer route/controller/service/repository, envelope errori, UI slot/409/delete, suite test.
- Verificato manualmente/runtime: `npm install`, `npm run build`, `npm run lint`, `npm test` (12 test API, inclusa race 201/409), `npm run test:frontend` (Karma via Edge se Chrome assente). Avvio `npm run dev` richiede `MONGODB_URI` Atlas in `.env`.

## 3. Cosa faresti con più tempo

1. Smoke e2e FE/BE automatizzato (Playwright) su due tab per il conflitto.
2. UX: loading per-azione, accessibilità slot, i18n messaggi.
3. Bonus lock temporaneo + SSE solo a DoD base consolidato.
4. Hardening: rate limiting, logging strutturato, health con ping Mongo.
5. CI GitHub Actions (lint/test/build) su Node 22.
