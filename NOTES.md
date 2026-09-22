# NOTES

## 1. Decisioni tecniche

- Monorepo npm workspaces (`apps/frontend`, `apps/backend`) con Angular 19 + Express/Zod/Mongoose.
- Unicità booking su indice `uniq_booking_date_time_slot`; `E11000` → `409 BOOKING_SLOT_CONFLICT`.
- MongoDB Atlas via `MONGODB_URI`; `syncIndexes()` all’avvio per Booking e SlotLock.
- Bonus: `SlotLock` con unique `{date,time_slot}`, TTL su `expiresAt`, reclaim atomico se scaduto; `lockId` verificato al `POST /bookings`.
- Realtime con SSE (`GET /api/events`): flusso principalmente server→client, più semplice di WebSocket per questo caso.
- `clientId` UUID per connessione SSE (persistito in `sessionStorage`): binding lock↔client; a disconnect/reload i lock del client vengono rilasciati.
- UI slot: toggle (secondo click sullo slot proprio → release); stati `AVAILABLE` / `LOCKED_BY_ME` / `LOCKED_BY_OTHER` / `BOOKED`.
- Frontend: Tailwind CSS 4; feedback UX con `Loader` overlay globale e `ToastService` (success/error).
- `date`/`time_slot` come stringhe di dominio; niente Docker/Redis/auth/microservizi.

## 2. Uso dell’AI

- Tool: Cursor (agente) per bootstrap, CRUD, bonus lock/SSE, UX (Tailwind/toast/loader) e docs.

## 3. Cosa faresti con più tempo

1. Playwright su due tab per lock + booking in parallelo.
2. UX: countdown TTL lock per indicare all'utente quanto uno slot rimane occupato prima di perdere il lock. Loading per-azione (ora è overlay globale). Migliorare i messaggi di errore, per ora gestiti in maniera generica. Migliorare gli slot orari, per ora sono dei placeholder, ma dovrebbero contenere intervalli di orari (es 9.00 - 9.30), possibilmente customizzabili dall'utente.
3. Persistenza fan-out eventi (Redis/pub-sub) se si scala oltre un singolo processo Node.
4. Hardening: rate limit acquire-lock, logging strutturato, health con ping Mongo.
5. Suite test automatici sia per backend che front-end.
