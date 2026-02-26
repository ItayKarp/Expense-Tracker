# Karpov's Tracker

> A personal finance tracking application with a terminal-inspired UI, built on FastAPI and PostgreSQL.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Karpov's Tracker is a full-stack expense tracking web application. Users can sign up, set up an account with an opening balance, and monitor their spending through a real-time dashboard and filterable expense table. The frontend has a retro terminal aesthetic (`KARPOV_SYS v2.4.1`) served directly from a FastAPI backend using Jinja2 templates.

---

## Features

### Core
- **Authentication** — Email/password sign-up and login via an external Neon Auth provider, with JWT-based sessions
- **Account Setup** — Post-signup onboarding flow to capture full name and opening balance
- **Dashboard** — Displays account balance and total expenses for the rolling last 30 days
- **Expense Table** — Sortable, searchable table of all transactions with category and date
- **Statistics View** — Dedicated section for financial overviews and chart-based analytics (in progress)

### Included but Often Overlooked
- **Graceful DB connection handling** — SQLAlchemy engine configured with `pool_pre_ping`, `pool_recycle`, and overflow settings to survive idle connections and serverless cold starts
- **Scoped API versioning** — All account/book routes are prefixed under `/api/v1`, making future versioning non-breaking
- **Custom Swagger UI path** — Docs are served at `/administrator123` instead of the default `/docs`, reducing automated scanning exposure
- **Static file isolation** — Templates and static assets are mounted as separate StaticFiles routes, keeping the template directory browsable independently
- **Plots directory auto-creation** — `PLOTS_DIR` is resolved relative to the server file and created on startup, preventing missing-directory errors on fresh deploys
- **Modular router architecture** — Each domain (accounts, auth, dashboard, statistics) lives in its own router file and is registered independently in `main.py`
- **Idiomatic HTTPException re-raising** — Service functions explicitly re-raise `HTTPException` before the generic `except` block so FastAPI error responses aren't swallowed as 500s

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL (via SQLAlchemy ORM) |
| Auth Provider | Neon Auth (JWKS / JWT) |
| Templating | Jinja2 |
| Frontend | Vanilla JS, CSS |
| HTTP Client | httpx (async) |
| Config | python-dotenv |

---

## Project Structure

```
project-root/
│
├── main.py                     # App entrypoint, route mounting, static files
│
├── server/
│   ├── api/
│   │   ├── __init__.py         # Exports all routers
│   │   ├── accounts_endpoints.py
│   │   ├── authenticate_endpoints.py
│   │   ├── dashboard_endpoints.py
│   │   └── statistics_endpoints.py
│   │
│   ├── services/
│   │   ├── __init__.py         # Exports all service functions
│   │   ├── account_services.py
│   │   └── statistics_services.py
│   │
│   ├── schemas/
│   │   ├── accounts.py         # Pydantic models for accounts
│   │   └── authentication.py   # Pydantic models for auth
│   │
│   ├── models.py               # SQLAlchemy ORM models
│   └── database.py             # Engine, Base, Session factory
│
├── templates/
│   ├── base.html
│   └── home/
│       ├── home.html
│       ├── styles.css
│       └── functionality.js
│
└── static/
    └── plots/                  # Auto-generated on startup
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL database (local or hosted — e.g. Neon, Supabase, Railway)
- A Neon Auth project for authentication (or a compatible JWKS/JWT provider)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/karpovs-tracker.git
cd karpovs-tracker

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname

# Neon Auth base URL (or your JWKS provider)
NEON_BASE_AUTH=https://your-neon-auth-instance.com
```

> **Never commit your `.env` file.** Add it to `.gitignore`.

### Running the Application

```bash
uvicorn main:app --reload
```

The app will be available at `http://localhost:8000`.
API documentation is at `http://localhost:8000/administrator123`.

---

## API Reference

### Authentication — `/auth`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new user via Neon Auth |
| `POST` | `/auth/login` | Authenticate and receive a JWT token |
| `POST` | `/auth/setup` | Create the local account record post-signup |

### Accounts — `/api/v1/books`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/books/` | List all accounts |
| `GET` | `/api/v1/books/{account_id}` | Get a single account |
| `POST` | `/api/v1/books/?type=create` | Create a new account |
| `PUT` | `/api/v1/books/{account_id}?type=update_details` | Update account details |
| `DELETE` | `/api/v1/books/{account_id}` | Delete an account |

### Dashboard — `/dashboard`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/data?email=` | Returns balance and 30-day expense total |
| `GET` | `/dashboard/expenses?email=` | Returns full expense table for the account |

---

## Authentication

This application uses **Neon Auth** as an external identity provider. On signup, credentials are forwarded to the Neon Auth service which returns a JWT. That token is stored client-side and used for subsequent authenticated requests.

After signup, a `/auth/setup` call creates a local `Accounts` record in the application database, linking the Neon Auth user identity to the internal account by email.

> The `JWKS_URL` constant in `dashboard_endpoints.py` is wired for future JWT verification middleware — this can be expanded to protect routes using FastAPI's `Depends` + `HTTPBearer`.

---

## Database Schema

```
categories
  id              INTEGER PK
  name            VARCHAR
  monthly_budget  NUMERIC(10,2)

accounts
  id              INTEGER PK
  account_name    VARCHAR UNIQUE NOT NULL
  balance         NUMERIC(12,2) NOT NULL
  email           VARCHAR UNIQUE NOT NULL

expenses
  id              INTEGER PK
  amount          NUMERIC(10,2) NOT NULL
  category_id     INTEGER FK → categories.id
  account_id      INTEGER FK → accounts.id
  description     VARCHAR
  created_at      DATETIME
```

To initialise the schema against your database, run:

```python
from server.database import Base, engine
Base.metadata.create_all(engine)
```

---

## Roadmap

- [ ] JWT verification middleware on protected routes (`/dashboard`, `/api/v1`)
- [ ] Statistics endpoints — per-category breakdowns, monthly trend charts
- [ ] Expense creation and deletion from the UI
- [ ] Budget tracking against `categories.monthly_budget`
- [ ] Pagination on the expenses table endpoint
- [ ] Dark/light theme toggle

---

## Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/your-feature`
3. Commit your changes — `git commit -m "feat: add your feature"`
4. Push to the branch — `git push origin feature/your-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.