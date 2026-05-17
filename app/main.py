import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine
from .models import models
from .routers import (
    auth,
    users,
    product,
    categories,
    order,
    comment,
    ratings,
    search,
    addToCart,
    wishlists,
    checkout,
    ai,
    coupons,
    admin,
)

app = FastAPI(
    title="E-Commerce API",
    description="Advanced e-commerce platform with Stripe payment integration",
    version="1.0.0",
)

# CORS — allow frontend dev servers and configurable origins
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables (use Alembic in production)
models.Base.metadata.create_all(bind=engine)
# Add any missing columns for tables that existed before model changes
from .migrate_db import migrate as _migrate_schema
_migrate_schema(engine)

# Serve uploaded images
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/health", tags=["Meta"])
def health():
    return {"status": "ok"}


# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(product.router)
app.include_router(categories.router)
app.include_router(order.router)
app.include_router(comment.router)
app.include_router(ratings.router)
app.include_router(search.router)
app.include_router(addToCart.router)
app.include_router(wishlists.router)
app.include_router(checkout.router)
app.include_router(coupons.router)
app.include_router(ai.router)
app.include_router(admin.router)
