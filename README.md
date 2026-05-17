# Shopwave — Full-Stack AI E-Commerce

A production-quality e-commerce application showcasing a **FastAPI backend** and a **React + Tailwind frontend**, plus a full **GenAI layer**: a tool-calling RAG chatbot (Groq + LangGraph-style ReAct), local FAISS semantic search, hybrid recommendations, and AI-generated product copy.

![architecture](ecommerce-architetcural%20diagram.png)

---

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, Zustand, Axios, react-hot-toast |
| Backend | FastAPI, SQLAlchemy, SQLite (or Postgres), JWT (python-jose), Stripe, Celery + Redis |
| AI | Groq (Llama 3.3 70B), `sentence-transformers` (MiniLM L6 v2), FAISS, custom ReAct tool-calling agent |
| Auth | Access + refresh tokens, role-based access (customer / seller / admin) |
| Payments | Stripe Checkout Sessions + Stripe coupons for discounts |

---

## Features

### Core e-commerce
- Catalog: products, categories, image uploads, ratings, comments, wishlists, cart
- Stripe Checkout with webhook-style confirmation
- **Order lifecycle**: `pending → processing → shipped → delivered` (+ `cancelled`) with admin status controls and tracking numbers
- **Coupons / promo codes**: percent or fixed, expiry, min-order, max-uses, applied at Stripe and persisted on order
- **Featured products** with auto-rotating homepage hero carousel
- Recently-viewed products (client-side, localStorage)
- JWT auth with refresh-token rotation
- Admin dashboard: products, categories, orders, coupons

### GenAI layer
- **Customer-support chatbot** — floating widget on every page. ReAct tool-calling loop with 4 tools:
  - `search_products` (RAG over the live catalog)
  - `get_my_orders` (only for authed users)
  - `get_product`
  - `get_faq` (shipping, returns, payment, contact)
  - Per-session conversation memory persisted to DB
- **Semantic search** — `/api/ai/semantic-search` + a frontend toggle ("AI search") on the search page. Powered by local MiniLM embeddings + FAISS (no API cost).
- **Hybrid recommendations** — `/api/ai/recommendations` builds a "taste profile" from purchase history and retrieves semantically similar products. Falls back to featured/popular for anonymous users.
- **Related products** — `/api/ai/related/{product_id}` on every product detail page.
- **AI description generator** — one-click "✨ Generate with AI" button in the admin product form.
- **Auto-reindex** — FAISS index rebuilt automatically on product create/update/delete.

---

## Project structure

```
.
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models/            # User, Product, Order, Coupon, ChatMessage, ...
│   ├── schemas/
│   ├── routers/           # auth, product, order, checkout, coupons, ai, ...
│   ├── ai/                # GenAI module
│   │   ├── llm.py         # Groq client wrapper
│   │   ├── embeddings.py  # sentence-transformers + FAISS index
│   │   ├── rag.py         # retrieval helpers
│   │   └── agent.py       # ReAct tool-calling agent
│   ├── scripts/create_admin.py
│   ├── tasks.py / celery_app.py
│   └── utils.py
├── frontend/
│   └── src/
│       ├── components/    # Navbar, ChatWidget, FeaturedCarousel, ProductRow, ProductCard
│       ├── pages/         # Home, Cart, Orders, ProductDetail, Search, ...
│       │   └── admin/     # AdminProducts, AdminOrders, AdminCoupons, AdminCategories
│       ├── lib/           # format, recentlyViewed
│       └── store/         # Zustand stores
├── requirements.txt
└── .env.example
```

---

## Quick start

### 1. Backend

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
copy .env.example .env         # edit values
uvicorn app.main:app --reload
```

The default `.env.example` ships with `DATABASE_URL=sqlite:///./shopwave.db` so you can run with zero setup.

Create the first admin:
```bash
python -m app.scripts.create_admin admin@shopwave.test admin123
```

### 2. AI setup (free)

Get a free Groq API key at <https://console.groq.com/>, then in `.env`:
```
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

That's it. The first chat / semantic search / recommendation call will download the local embedding model (~80 MB MiniLM) and build the FAISS index on demand. To force a rebuild any time:
```
POST /api/ai/reindex   (admin only)
```

Without `GROQ_API_KEY`, the chatbot and description generator are disabled but semantic search and recommendations still work (they use local embeddings only).

### 3. Stripe (optional)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app at <http://localhost:5173>. It expects the API at <http://localhost:8000> (override with `VITE_API_URL`).

---

## Key API surfaces

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/login` | JWT (returns access + refresh) |
| `GET  /api/products?featured=true` | Featured filter for hero carousel |
| `PUT  /api/orders/{id}/status` | Admin status/tracking update |
| `POST /api/coupons/apply` | Validate coupon against cart subtotal |
| `POST /api/checkout/create-session` | Stripe session (optionally with `coupon_code`) |
| `GET  /api/ai/status` | Probe whether LLM is configured |
| `POST /api/ai/chat` | Tool-calling support agent |
| `POST /api/ai/semantic-search` | FAISS + embeddings search |
| `GET  /api/ai/recommendations` | Hybrid (history + semantic) recs |
| `GET  /api/ai/related/{id}` | Related-product row for PDP |
| `POST /api/ai/generate-description` | AI copywriter (admin/seller) |
| `POST /api/ai/reindex` | Rebuild FAISS index (admin) |

---

## Why this is portfolio-worthy

- Real **agentic AI** (tools + memory) integrated against a real DB, not a toy LLM wrapper
- **RAG** built from scratch on FAISS — shows understanding of the retrieval layer, not just LangChain magic
- **Hybrid recommendations** combining behavioural and semantic signals
- A complete e-commerce flow on top: auth, payments, status lifecycle, promo codes, admin dashboard
- Zero-setup demo path (SQLite + free Groq tier + local embeddings) — runnable in under 2 minutes
