# 💰 Karpov's Tracker

<p align="center">
  <strong>A Modern Full-Stack Expense Tracking Application</strong><br/>
  Built with FastAPI • SQLAlchemy • PostgreSQL (NeonDB) • Vanilla JavaScript
</p>

<p align="center">
  <img src="https://img.shields.io/badge/backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/database-PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/orm-SQLAlchemy-D71F00?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/frontend-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
  <img src="https://img.shields.io/badge/auth-JWT-black?style=for-the-badge"/>
</p>

---

## 📖 Overview

**Karpov's Tracker** is a full-stack expense management system designed with clean backend architecture and lightweight frontend principles.

The application focuses on:
- Efficient database-level aggregation
- REST API design best practices
- Secure authentication flows
- Server-side graph rendering
- Clean UI/UX without frontend frameworks

This project demonstrates strong backend fundamentals, SQL optimization, and production-oriented structure.

---

## ✨ Core Features

### 🔐 Authentication & Security
- User Registration & Login
- JWT-based authentication
- Secure password reset flow
- Profile management
- Protected endpoints

### 💼 Expense Management
- Create, edit, and delete expenses
- Category-based tracking
- Salary configuration
- Yearly expense overview
- Clean data rendering

### 📊 Statistics Dashboard
- Monthly Income vs Expenses comparison
- 1-Year expense bar chart
- Expense distribution by category
- Year balance graph
- Optimized aggregation queries
- Graph caching to prevent redundant API calls

---

## 🏗️ Architecture

### Backend
- **FastAPI** for high-performance API development
- **SQLAlchemy ORM** with optimized query patterns
- **PostgreSQL (NeonDB)** as cloud database
- **Matplotlib** for server-side graph rendering
- **JWT Authentication**
- Clean router-based project structure

### Frontend
- HTML5 + CSS3
- Vanilla JavaScript
- Fetch API
- DOM-based rendering
- No external UI frameworks

---

## 📂 Project Structure

```
server/
│
├── main.py
├── routers/
│   ├── auth.py
│   ├── expenses.py
│   ├── statistics.py
│
├── models/
├── services/
├── database/
│
static/
│   ├── js/
│   ├── css/
│
templates/
│   ├── dashboard.html
│   ├── profile.html
│   ├── login.html
```

---

## 📊 How Graphs Work

All graphs are generated server-side:

1. SQLAlchemy performs database aggregation (`SUM`, `GROUP BY`, `DATE_TRUNC`)
2. Results are processed in Python
3. Matplotlib renders PNG images
4. Images are returned as API responses
5. Frontend displays images dynamically

This ensures:
- Accurate aggregation at DB level
- Minimal frontend complexity
- Consistent styling
- Controlled performance

---

## 🚀 Getting Started

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/karpovs-tracker.git
cd karpovs-tracker
```

---

### 2️⃣ Create Virtual Environment

```bash
python -m venv .venv
```

Activate:

**Windows**
```bash
.venv\Scripts\activate
```

**Mac/Linux**
```bash
source .venv/bin/activate
```

---

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 4️⃣ Configure Environment Variables

Create a `.env` file:

```
DATABASE_URL=your_neon_database_url
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

### 5️⃣ Run Server

```bash
python -m uvicorn server.main:app --host localhost --port 8000 --reload
```

Access at:

```
http://localhost:8000
```

---

## 📡 API Overview

### Authentication
```
POST   /auth/register
POST   /auth/login
POST   /auth/request-password-reset
POST   /auth/reset-password
```

### Expenses
```
GET    /expenses/yearly
POST   /expenses/create
PUT    /expenses/update
DELETE /expenses/delete
```

### Statistics
```
GET /statistics/year_balance_graph
GET /statistics/income_vs_expenses_graph
GET /statistics/yearly_expenses_graph
GET /statistics/expense_by_category_graph
```

---

## 🔒 Security Considerations

- JWT required for protected routes
- Password reset does not expose user existence
- Backend validation for sensitive operations
- Production deployment should include:
  - HTTPS
  - Secure CORS configuration
  - Password hashing
  - Rate limiting

---

## 📈 Performance Considerations

- All heavy aggregation executed at database level
- Graphs cached to prevent duplicate API calls
- Efficient SQLAlchemy joins
- No unnecessary frontend state management

---

## 🧠 Development Philosophy

This project intentionally avoids frontend frameworks to:

- Strengthen backend engineering skills
- Master ORM query optimization
- Design scalable REST APIs
- Build clean system architecture
- Understand full request lifecycle

---

## 🛠 Future Improvements

- Docker containerization
- Budget planning module
- Recurring expenses
- CSV export functionality
- Dark mode UI
- Frontend-rendered charts (Chart.js upgrade)
- Role-based access control

---

## 📄 License

This project is intended for portfolio and educational purposes.

---

## 👤 Author

**Itay Karpov**
Full-Stack Developer
Focused on backend systems, architecture, and performance optimization.

---

<p align="center">
  Built with clean architecture principles and backend-first engineering mindset.
</p>