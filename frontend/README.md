# Shopwave — Frontend

React + Vite + Tailwind + Zustand client for the Shopwave FastAPI backend.

## Setup

```bash
npm install
cp .env.example .env       # edit VITE_API_URL if backend isn't on :8000
npm run dev                # http://localhost:5173
```

## Features

- Authentication with JWT access + refresh tokens (auto-refresh via Axios interceptor)
- Product browsing, category filter, search
- Product detail with ratings (5 stars) and comments
- Cart (persistent on backend, syncs across sessions)
- Stripe Checkout — redirects to Stripe, confirms on return
- Order history, wishlist
- Admin dashboard (visible if logged-in user is `admin` or `seller`):
  - Product CRUD with image upload
  - Category management
  - Order list

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home + category filter |
| `/search` | Live product search |
| `/product/:id` | Product detail, ratings, comments |
| `/cart` | Cart + checkout |
| `/checkout/success` | Stripe success callback |
| `/checkout/cancel` | Stripe cancel callback |
| `/orders` | Order history |
| `/wishlist` | Saved items |
| `/login`, `/register` | Auth |
| `/admin/*` | Admin dashboard (roles: admin, seller) |

## Build

```bash
npm run build && npm run preview
```
