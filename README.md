# Booking Fullstack Challenge

Applicazione full-stack di prenotazione slot orari: Angular + Express + MongoDB.
Il vincolo `date + time_slot` è garantito da un indice univoco MongoDB; i conflitti rispondono con HTTP `409` e code `BOOKING_SLOT_CONFLICT`.

Bonus: lock temporaneo sugli slot + sincronizzazione realtime via **SSE** (Server-Sent Events).

## Prerequisiti

- Node.js 22 (vedi `.nvmrc`)
- npm 10+
- Cluster [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)

## Setup rapido

```bash
# 1. Dipendenze monorepo
npm install

# 2. Variabili ambiente
cp .env.example .env
# Imposta MONGODB_URI con la connection string del tuo cluster Atlas

# 3. Avvio frontend + backend
npm run dev
```

URL locali:

| Servizio | URL |
| --- | --- |
| Frontend | http://localhost:4200 |
| Backend API | http://localhost:3000 |
| Health | http://localhost:3000/api/health |
| SSE | http://localhost:3000/api/events |

## Script root

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia backend (`tsx watch`) e frontend (`ng serve` con proxy `/api`) |
| `npm run build` | Build TypeScript backend + build Angular |
| `npm run lint` | ESLint su backend e frontend |
| `npm run format` | Prettier |

## Endpoint principali

| Metodo | Endpoint | Note |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/bookings?date=YYYY-MM-DD` | Lista booking del giorno |
| `GET` | `/api/bookings/:id` | Dettaglio |
| `POST` | `/api/bookings` | Crea (`201` / `409`); accetta `lockId` opzionale |
| `PUT` | `/api/bookings/:id` | Aggiorna (rispetta lo stesso unique index) |
| `DELETE` | `/api/bookings/:id` | Elimina (`204`) |
| `GET` | `/api/slot-locks?date=YYYY-MM-DD` | Lock attivi del giorno |
| `POST` | `/api/slot-locks` | Acquisisce lock temporaneo |
| `DELETE` | `/api/slot-locks/:lockId` | Rilascia lock |
| `GET` | `/api/events` | Stream SSE (`slot.locked`, `slot.released`, `booking.created`, `booking.deleted`) |

Envelope errore uniforme:

```json
{
  "error": {
    "code": "BOOKING_SLOT_CONFLICT",
    "message": "The selected time slot is already booked"
  }
}
```

## Unicità e lock

- L’unicità booking resta sull’indice `uniq_booking_date_time_slot` (mai `findOne`+`create`).
- Il lock migliora l’UX durante la selezione ma **non** sostituisce l’indice.
- Lock validi solo se `expiresAt > now`; i lock scaduti possono essere reclamati atomicamente anche se il TTL Mongo è in ritardo.

## Struttura

```text
apps/
  frontend/   # Angular 19 — Reactive Forms, HttpClient, SCSS, SSE client
  backend/    # Express + TypeScript + Zod + Mongoose + SSE
```

## Documentazione aggiuntiva

Vedi `NOTES.md` per decisioni tecniche, uso dell’AI e miglioramenti futuri.
