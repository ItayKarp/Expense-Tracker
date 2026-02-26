# Karpov's Bookshop

A full-stack **bookstore management system** built with FastAPI. The application provides complete CRUD operations for books, a modern web interface, and a rich **business analytics dashboard** with 10 predefined statistical visualizations (see [Statistics & Analytics](#statistics--analytics)) generated with Matplotlib and Seaborn.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Statistics & Analytics](#statistics--analytics)
- [Frontend Pages](#frontend-pages)

---

## Overview

**Karpov's Bookshop** is a Python web application that lets users:

- **Manage books** — Create, read, update, and delete books in inventory
- **View inventory** — Browse all books in a table layout
- **Look up details** — Fetch information for a specific book by ID
- **Analyze business data** — Run 10 predefined statistics and view charts (average price by year, top authors by reviews, sales trends, revenue, review volume, and transaction distribution)

The backend is built with **FastAPI** and stores data in **SQLite**. The frontend uses vanilla HTML, CSS, and JavaScript, with Jinja2 templates for dynamic content. Analytics are powered by **Pandas**, **Matplotlib**, and **Seaborn**.

---

## Tech Stack

| Layer       | Technology                                                |
|------------|------------------------------------------------------------|
| **Backend**  | FastAPI, Pydantic, SQLite                                  |
| **Data**     | Pandas, NumPy                                              |
| **Analytics**| Matplotlib, Seaborn                                        |
| **Frontend** | HTML5, CSS, vanilla JavaScript, Jinja2 templates           |
| **Server**   | Uvicorn                                                    |

---

## Project Structure

```
CRUD FastAPI Frontend and Backend/
├── server/
│   ├── main_server.py              # FastAPI app entry point, routes, static mounts
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── books_endpoints.py      # Book CRUD API
│   │       └── statistics_endpoints.py # Statistics API
│   ├── database/
│   │   ├── __init__.py
│   │   ├── databse.py                  # DB connection, loads books/sales/customer_reviews/sale_details
│   │   └── bookstore.db                # SQLite database
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── book.py                     # Pydantic models (BookCreate, BookRead, BookResponse, etc.)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── book_service/
│   │   │   ├── create_service/         # create_book
│   │   │   ├── delete_service/         # delete_book
│   │   │   ├── get_info_service/       # get_book, get_books
│   │   │   └── update_service/         # update_details
│   │   └── statistics/
│   │       ├── __init__.py
│   │       └── statistics_service.py   # 10 chart generators (reroute, average_book_price_by_year, etc.)
│   ├── static/
│   │   └── plots/                      # Generated chart PNGs
│   └── templates/                      # HTML pages and assets
│       ├── home/
│       ├── book_storage/
│       ├── book_info/
│       ├── create_book/
│       ├── update/
│       ├── delete/
│       └── statistics/
│           └── statistics_graphs/
├── requirements.txt
└── README.md
```

---

## Architecture

The app follows a layered design:

1. **Presentation (main_server.py)**  
   - Serves HTML pages at `/`, `/storage`, `/create`, `/update`, `/delete`, `/statistics`, etc.  
   - Mounts static files for each template directory.  
   - Includes the API routers under `/api/v1`.

2. **API (api/v1/)**  
   - **books_endpoints.py** — REST endpoints for books: `GET/POST /api/v1/books/`, `GET/PUT/DELETE /api/v1/books/{book_id}`  
   - **statistics_endpoints.py** — `GET /api/v1/statistics/{question_id}` for statistics views

3. **Services (services/)**  
   - **book_service** — Create, read, update, delete operations. Each action is in its own module.  
   - **statistics** — `reroute(question_id)` maps IDs 1–10 to chart-generating functions that return PNG filenames.

4. **Data (database/, schemas/)**  
   - `database/databse.py` connects to SQLite and loads `books`, `sales`, `customer_reviews`, `sale_details` as Pandas DataFrames.  
   - `schemas/book.py` defines Pydantic models for request/response validation.

5. **Frontend (templates/)**  
   - Static HTML/CSS/JS pages that call the FastAPI endpoints.  
   - Statistics pages use query params (`stat_id`, `title`) and Jinja2 to render graphs.

---

## Features

### Book Management (CRUD)

| Action  | Endpoint                     | Description                    |
|---------|------------------------------|--------------------------------|
| Create  | `POST /api/v1/books/`        | Add a new book (`type=create`) |
| Read    | `GET /api/v1/books/`         | List all books                 |
| Read    | `GET /api/v1/books/{id}`     | Get one book by ID             |
| Update  | `PUT /api/v1/books/{id}`     | Update a book (`type=update_details`) |
| Delete  | `DELETE /api/v1/books/{id}`  | Remove a book                  |

### Book Schema (Create/Update)

- `title`, `author`, `year`, `price`, `quantity`, `is_available`

### Statistics

- 10 pre-defined analytics (see [Statistics & Analytics](#statistics--analytics))  
- Each generates a PNG chart stored in `server/static/plots/` and served to the frontend.

---

## Getting Started

### Prerequisites

- Python 3.10+
- Virtual environment (recommended)

### Installation

```bash
# Clone the repository
git clone github.com/ItayKarp/Final-project-python
cd "CRUD FastAPI Frontend and Backend"

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Run the Server

From the project root:

```bash
uvicorn server.main_server:app --reload --host 0.0.0.0 --port 8000
```

- **Local**: http://127.0.0.1:8000  
- **API docs (Swagger)**: http://127.0.0.1:8000/administrator123  

> Run from the directory that contains the `server/` folder so paths like `database/bookstore.db` and `templates/` resolve correctly.

---

## API Reference

### Books API (`/api/v1/books`)

| Method   | Path           | Description          |
|----------|----------------|----------------------|
| `GET`    | `/`            | List all books       |
| `GET`    | `/{book_id}`   | Get one book         |
| `POST`   | `/`            | Create book (query: `type=create`) |
| `PUT`    | `/{book_id}`   | Update book (query: `type=update_details`) |
| `DELETE` | `/{book_id}`   | Delete book          |

### Statistics API (`/api/v1/statistics`)

| Method | Path              | Description                           |
|--------|-------------------|---------------------------------------|
| `GET`  | `/{question_id}`  | Return the statistics view for ID 1–10 |

---

## Database Schema

The SQLite database `server/database/bookstore.db` includes:

| Table            | Purpose                                      |
|------------------|----------------------------------------------|
| `books`          | Book inventory (book_id, title, author, year, price, quantity, is_available) |
| `sales`          | Sales transactions (sale_date, total_amount, etc.) |
| `sale_details`   | Line items per sale (book_id, quantity, etc.) |
| `customer_reviews` | Reviews with rating, profession, review_date, etc. |

The `database` module loads these into Pandas DataFrames at startup for use across services and statistics.

---

## Statistics & Analytics

The statistics service maps `question_id` (1–10) to chart generators:

| ID | Metric                               | Category       |
|----|--------------------------------------|----------------|
| 1  | Average Book Price by Year           | Inventory      |
| 2  | Top 10 Authors by Reviews            | User Activity  |
| 3  | Daily Sales Trend (last 2 weeks)     | Sales Overview |
| 4  | Top Selling Books                    | Inventory      |
| 5  | Monthly Revenue Performance          | Sales Overview |
| 6  | Average Rating by Profession         | User Activity  |
| 7  | Monthly Review Volume                | User Activity  |
| 8  | Top 10 Authors by Revenue            | Inventory      |
| 9  | Distribution of Units per Transaction| Sales Overview |
| 10 | Monthly Revenue Growth Rate          | Sales Overview |

Each function:

1. Queries and aggregates data from `books`, `sales`, `reviews`, `sale_details`  
2. Creates a Matplotlib/Seaborn chart with a bookshop-style theme  
3. Saves the PNG to `server/static/plots/`  
4. Returns the filename for the frontend to display  

---

## Frontend Pages

| Route               | Page          | Description                                   |
|---------------------|---------------|-----------------------------------------------|
| `/`                 | Home          | Navigation hub with video intro               |
| `/storage`          | Book Storage  | Table of all books                            |
| `/bookDetails`      | Book Details  | Look up a book by ID                          |
| `/create`           | Create Book   | Form to add a new book                        |
| `/update`           | Update Book   | Form to edit an existing book                 |
| `/delete`           | Delete Book   | Form to remove a book                         |
| `/statistics`       | Statistics    | Grid of 10 statistics buttons                 |
| `/statistics/result`| Graph View    | Renders the selected statistic chart (Jinja2) |

The home page includes video intros and can be skipped with the **Escape** key or when the video ends.

---

## License

This project is for educational purposes (Final Project Python).
