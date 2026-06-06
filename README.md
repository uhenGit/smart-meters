# Smart Meter

A full-stack web application for tracking household utility meter readings, calculating costs based on current tariffs, and visualising consumption over time.

> 🔗 **Live demo:** `coming soon`

---

## Overview

Smart Meter solves a practical problem: keeping track of monthly utility consumption (gas, water, electricity, heating) and automatically calculating costs based on the applicable tariff rates for that period. When tariffs change, historical records retain their original rates — so cost calculations always reflect what was actually charged at the time.

The application supports multiple users, admin-controlled onboarding, and a full tariff management history.

---

## Features

- 📊 **Monthly readings** — submit gas, water, day/night electricity, and heating values each month
- 💰 **Automatic cost calculation** — costs computed from the tariff rates active at submission time
- 📈 **Statistics view** — month-over-month consumption and cost comparison, with tariff change detection
- 🗓️ **History** — filterable date-range view of all past readings
- 🔧 **Admin panel** — manage tariff rates, edit or delete readings, manage users
- 👤 **User management** — admin creates accounts and generates single-use invite links
- 🔐 **Secure auth** — JWT stored in httpOnly cookies, protected routes on both frontend and backend
- 🐳 **One-command setup** — full Docker Compose stack with automatic migrations and admin initialisation

---

## Tech stack

### Backend
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![pg-promise](https://img.shields.io/badge/pg--promise-11-4169E1)
![JWT](https://img.shields.io/badge/JWT-httpOnly_cookie-000000?logo=jsonwebtokens)

### Frontend
![Vue 3](https://img.shields.io/badge/Vue-3-42B883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-2-FFD859)
![Vue Router](https://img.shields.io/badge/Vue_Router-4-42B883)
![Axios](https://img.shields.io/badge/Axios-1-5A29E4)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?logo=sass&logoColor=white)

### Infrastructure
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-alpine-009639?logo=nginx&logoColor=white)
![node-pg-migrate](https://img.shields.io/badge/node--pg--migrate-migrations-4169E1)

---

## Project structure

```
smart-meter/
├── backend/
│   ├── db/
│   │   ├── db.js               # pg-promise instance
│   │   └── queries.js          # all database query functions
│   ├── handlers/               # validation and helper utilities
│   ├── middleware/
│   │   └── auth.js             # JWT cookie middleware
│   ├── migrations/             # node-pg-migrate migration files
│   ├── routes/
│   │   ├── auth.js             # login, logout, register, invite
│   │   ├── form.js             # submit and retrieve monthly readings
│   │   ├── history.js          # date-range history queries
│   │   ├── statistics.js       # aggregated stats with tariff context
│   │   └── admin.js            # tariff management, user management
│   ├── scripts/
│   │   └── init-admin.js       # creates default admin on first run
│   ├── swagger.js              # OpenAPI spec config
│   ├── entrypoint.sh           # runs migrations + init before server start
│   ├── Dockerfile
│   └── index.js
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.ts        # configured axios instance
│   │   ├── components/
│   │   │   ├── OnboardingModal.vue
|   |   |   ├── HelpButton.vue
|   |   |   └── MainHeader.vue
│   │   ├── stores/             # Pinia stores (auth, onboarding)
│   │   ├── types/              # TypeScript interfaces
│   │   ├── views/              # LoginView, FormView, HistoryView, etc.
│   │   └── router/index.ts
│   ├── nginx.conf
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Getting started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

That's it. No local Node.js or PostgreSQL installation required.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/smart-meter.git
cd smart-meter
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set your values:

```env
POSTGRES_DB=meters
POSTGRES_USER=meters_admin
POSTGRES_PASSWORD=your_strong_password

DB_HOST=db
DB_PORT=5432
DB_USER=meters_admin
DB_PASSWORD=your_strong_password
DB_DATABASE=meters

JWT_SECRET=replace_with_a_random_string_of_at_least_32_characters
JWT_EXPIRES_IN=7d

NODE_ENV=production
PORT=3000
```

### 3. Start the application

```bash
docker compose up --build
```

On first run this automatically:
- Starts PostgreSQL, the Node.js backend, and Nginx
- Runs all database migrations
- Creates a default admin user

The app will be available at **http://localhost**.

### 4. Log in

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `pass_to_change` |

**Change the admin password immediately after first login.**

### 5. First steps

Once logged in, the onboarding guide will walk you through:

1. **Create tariffs** — go to Admin → Taxes tab and enter your current utility rates
2. **Submit your first reading** — go to the Form page and enter your meter values

---

## API documentation

Interactive API docs (Swagger UI) are available at:

```
http://localhost:3000/api-docs
```

### Main endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/login` | Log in |
| `POST` | `/api/v1/auth/logout` | Log out |
| `GET` | `/api/v1/auth/me` | Current user |
| `GET` | `/api/v1/auth/invite?token=` | Validate invite token |
| `POST` | `/api/v1/auth/register` | Complete registration via invite |
| `GET` | `/api/v1/form` | Get current month data |
| `POST` | `/api/v1/form/submit` | Submit a new reading |
| `GET` | `/api/v1/history?start=&end=` | Historical readings |
| `GET` | `/api/v1/statistics?start=&end=` | Statistics with tariff context |
| `GET` | `/api/v1/admin/taxes/current` | Active tariff rates |
| `POST` | `/api/v1/admin/taxes` | Create new tariff rates |
| `GET` | `/api/v1/admin/indications` | All readings (admin) |
| `PATCH` | `/api/v1/admin/indications/:id` | Edit a reading |
| `DELETE` | `/api/v1/admin/indications/:id` | Delete a reading |
| `GET` | `/api/v1/admin/users` | All users |
| `POST` | `/api/v1/admin/users` | Create user + invite link |
| `DELETE` | `/api/v1/admin/users/:id` | Delete user |

---

## Database schema

```
users
  id uuid PK | username | email | first_name | last_name
  password (bcrypt) | role | is_active | invite_token | created_at

taxes
  id uuid PK | start_date | end_date
  gas_tax | water_tax | dayelec_tax | nightelec_tax
  trash_fixed | water_delivery_fixed
  user_id FK → users.id

indications
  id uuid PK | gas | water | dayelec | nightelec | heat | notes
  created_at | updated_at
  user_id FK → users.id
  tax_id FK → taxes.id
```

**Tariff logic:** a tax record with `start_date = end_date` is the currently active tariff. When new rates are created, the previous record's `end_date` is updated — both operations run in a single transaction, so there is never a gap or duplicate active tariff.

---

## Development

To run the project locally without Docker:

```bash
# Start only the database
# Uncomment ports section in the docker-compose.yml
docker compose up db

# Backend
cd backend
cp .env.example .env   # set DB_HOST=127.0.0.1
npm install
npm run migrate:up
node scripts/init-admin.js
node index.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Frontend dev server runs at `http://localhost:5173` and proxies `/api` requests to the backend at `http://localhost:3000`.

---

## Deployment

The project is Docker-ready. Any platform that supports Docker Compose will work:

- [Railway](https://railway.app) — recommended, straightforward Docker support
- [Render](https://render.com) — free tier available
- [Fly.io](https://fly.io) — more control, generous free tier

For production, set `secure: true` on the cookie and configure HTTPS on your host.

---

## Roadmap

- [ ] Deploy to production + live demo link
- [ ] IoT integration — ESP32 sensor data via MQTT → automatic reading submission
- [ ] Charts and graphs in the Statistics view
- [ ] Email notifications when a new invite is created
- [ ] Password change for existing users

---

## License

MIT
