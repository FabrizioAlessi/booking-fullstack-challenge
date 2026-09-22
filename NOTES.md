# NOTES

## 1. Decisioni tecniche

- Monorepo npm workspaces (`apps/frontend`, `apps/backend`) con Angular 19 + Express/Zod/Mongoose.
- Unicità booking su indice `uniq_booking_date_time_slot`; `E11000` → `409 BOOKING_SLOT_CONFLICT`.
- MongoDB Atlas via `MONGODB_URI`; `syncIndexes()` all’avvio per Booking e SlotLock.
- Bonus: `SlotLock` con unique `{date,time_slot}`, TTL su `expiresAt`, reclaim atomico se scaduto; `lockId` verificato al `POST /bookings`.
- Realtime con SSE (`GET /api/events`): flusso principalmente server→client, più semplice di WebSocket per questo caso.
- `date`/`time_slot` come stringhe di dominio; niente Docker/Redis/auth/microservizi.

## 2. Uso dell’AI

- Tool: Cursor (agente) per bootstrap, CRUD, bonus lock/SSE e docs; specifica da handoff + challenge.
- Attività AI: architettura layer, envelope errori, UI stati slot, hub SSE.
- Verificato: `npm run build`, `npm run lint`. Avvio locale con Atlas in `.env`.

## 3. Cosa faresti con più tempo

1. Playwright su due tab per lock + booking in parallelo.
2. UX: countdown TTL lock, reconnect SSE con backoff, loading per-azione.
3. Persistenza fan-out eventi (Redis/pub-sub) se si scala oltre un singolo processo Node.
4. Hardening: rate limit acquire-lock, logging strutturato, health con ping Mongo.
5. CI GitHub Actions su Node 22 (lint/build) e suite test automatici.
