# Booking Fullstack Challenge

Applicazione full-stack di prenotazione slot orari: Angular + Express + MongoDB.
Il vincolo `date + time_slot` è garantito da un indice univoco MongoDB; i conflitti rispondono con HTTP `409` e code `BOOKING_SLOT_CONFLICT`.

## Prerequisiti

- Node.js 22 (vedi `.nvmrc`)
- npm 10+
- Cluster [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier va bene)

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

## Script root

| Comando | Descrizione |
| --- | --- |
| `npm run dev` | Avvia backend (`tsx watch`) e frontend (`ng serve` con proxy `/api`) |
| `npm run build` | Build TypeScript backend + build Angular |
| `npm run lint` | ESLint su backend e frontend |
| `npm test` | Test API backend (Vitest + Supertest + Mongo in-memory) |
| `npm run format` | Prettier |

## Endpoint principali

| Metodo | Endpoint | Note |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/bookings?date=YYYY-MM-DD` | Lista booking del giorno |
| `GET` | `/api/bookings/:id` | Dettaglio |
| `POST` | `/api/bookings` | Crea (`201` oppure `409`) |
| `PUT` | `/api/bookings/:id` | Aggiorna (rispetta lo stesso unique index) |
| `DELETE` | `/api/bookings/:id` | Elimina (`204`) |

Envelope errore uniforme:

```json
{
  "error": {
    "code": "BOOKING_SLOT_CONFLICT",
    "message": "The selected time slot is already booked"
  }
}
```

## Note sul vincolo di unicità

L’unicità non si basa su `findOne` + `create`. L’indice composto `uniq_booking_date_time_slot` su `{ date: 1, time_slot: 1 }` è l’autorità finale. Un duplicato produce Mongo `E11000`, tradotto in `ConflictError` → HTTP `409`.

## Struttura

```text
apps/
  frontend/   # Angular 19 — Reactive Forms, HttpClient, SCSS
  backend/    # Express + TypeScript + Zod + Mongoose
```

## Documentazione aggiuntiva

Vedi `NOTES.md` per decisioni tecniche, uso dell’AI e miglioramenti futuri.
