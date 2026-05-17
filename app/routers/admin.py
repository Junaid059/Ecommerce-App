"""Admin-only analytics + bulk import endpoints.

All routes require admin/seller role.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.routers.Oauth2 import require_roles


router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ----------------------------- Analytics -----------------------------

class CategoryRevenue(BaseModel):
    category_id: Optional[int]
    category_name: str
    revenue: int
    units_sold: int
    order_count: int


class DailyRevenue(BaseModel):
    date: str
    revenue: int
    orders: int


class TopProduct(BaseModel):
    product_id: int
    name: str
    units_sold: int
    revenue: int
    stock: int
    image_url: Optional[str]


class StockHealth(BaseModel):
    out_of_stock: int
    low_stock: int
    healthy_stock: int
    inventory_value: int
    total_units: int
    total_skus: int


class AnalyticsResponse(BaseModel):
    total_revenue: int
    last_30d_revenue: int
    last_7d_revenue: int
    paid_orders: int
    avg_order_value: float
    unique_customers: int
    pending_orders: int
    revenue_by_category: list[CategoryRevenue]
    daily_revenue: list[DailyRevenue]
    top_products: list[TopProduct]
    stock_health: StockHealth
    status_breakdown: dict[str, int]


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "seller")),
):
    """Aggregated business metrics for the admin dashboard.

    All amounts are integer dollars. Considers only `payment_status == 'paid'`
    orders for revenue figures. Safe — admin-only.
    """
    days = max(1, min(days, 365))
    now = datetime.utcnow()
    cutoff_30 = now - timedelta(days=30)
    cutoff_7 = now - timedelta(days=7)
    cutoff_n = now - timedelta(days=days)

    paid_q = db.query(models.Order).filter(models.Order.payment_status == "paid")

    total_revenue = db.query(func.coalesce(func.sum(models.Order.total_amount), 0)).filter(
        models.Order.payment_status == "paid"
    ).scalar() or 0

    last_30d_revenue = db.query(func.coalesce(func.sum(models.Order.total_amount), 0)).filter(
        models.Order.payment_status == "paid",
        models.Order.created_at >= cutoff_30,
    ).scalar() or 0

    last_7d_revenue = db.query(func.coalesce(func.sum(models.Order.total_amount), 0)).filter(
        models.Order.payment_status == "paid",
        models.Order.created_at >= cutoff_7,
    ).scalar() or 0

    paid_orders = paid_q.count()
    unique_customers = db.query(models.Order.user_id).distinct().count()
    pending_orders = db.query(models.Order).filter(models.Order.status == "pending").count()
    aov = (total_revenue / paid_orders) if paid_orders else 0.0

    # ---- revenue by category ----
    rows = (
        db.query(
            models.Category.id,
            models.Category.name,
            func.coalesce(func.sum(models.Order.total_amount), 0).label("revenue"),
            func.coalesce(func.sum(models.Order.quantity), 0).label("units"),
            func.count(models.Order.order_id).label("orders"),
        )
        .join(models.Product, models.Product.category == models.Category.id)
        .join(models.Order, models.Order.product_id == models.Product.id)
        .filter(models.Order.payment_status == "paid")
        .group_by(models.Category.id, models.Category.name)
        .order_by(func.sum(models.Order.total_amount).desc())
        .all()
    )
    revenue_by_category = [
        CategoryRevenue(category_id=r[0], category_name=r[1], revenue=int(r[2]), units_sold=int(r[3]), order_count=int(r[4]))
        for r in rows
    ]

    # Uncategorized bucket
    uncat = (
        db.query(
            func.coalesce(func.sum(models.Order.total_amount), 0),
            func.coalesce(func.sum(models.Order.quantity), 0),
            func.count(models.Order.order_id),
        )
        .join(models.Product, models.Product.id == models.Order.product_id)
        .filter(models.Order.payment_status == "paid", models.Product.category.is_(None))
        .first()
    )
    if uncat and uncat[0]:
        revenue_by_category.append(
            CategoryRevenue(category_id=None, category_name="Uncategorized", revenue=int(uncat[0]), units_sold=int(uncat[1]), order_count=int(uncat[2]))
        )

    # ---- daily revenue last N days ----
    daily_rows = (
        db.query(
            func.date(models.Order.created_at).label("d"),
            func.coalesce(func.sum(models.Order.total_amount), 0),
            func.count(models.Order.order_id),
        )
        .filter(models.Order.payment_status == "paid", models.Order.created_at >= cutoff_n)
        .group_by(func.date(models.Order.created_at))
        .all()
    )
    by_date = {str(r[0]): (int(r[1]), int(r[2])) for r in daily_rows}
    daily_revenue: list[DailyRevenue] = []
    for i in range(days):
        d = (now - timedelta(days=days - 1 - i)).date().isoformat()
        rev, ords = by_date.get(d, (0, 0))
        daily_revenue.append(DailyRevenue(date=d, revenue=rev, orders=ords))

    # ---- top products ----
    top_rows = (
        db.query(
            models.Product.id,
            models.Product.name,
            models.Product.stock,
            models.Product.image_url,
            func.coalesce(func.sum(models.Order.quantity), 0).label("units"),
            func.coalesce(func.sum(models.Order.total_amount), 0).label("revenue"),
        )
        .join(models.Order, models.Order.product_id == models.Product.id)
        .filter(models.Order.payment_status == "paid")
        .group_by(models.Product.id, models.Product.name, models.Product.stock, models.Product.image_url)
        .order_by(func.sum(models.Order.total_amount).desc())
        .limit(10)
        .all()
    )
    top_products = [
        TopProduct(product_id=r[0], name=r[1], stock=int(r[2] or 0), image_url=r[3], units_sold=int(r[4]), revenue=int(r[5]))
        for r in top_rows
    ]

    # ---- stock health ----
    products = db.query(models.Product).all()
    out_of_stock = sum(1 for p in products if (p.stock or 0) <= 0)
    low_stock = sum(1 for p in products if 0 < (p.stock or 0) <= 5)
    healthy = sum(1 for p in products if (p.stock or 0) > 5)
    inv_value = sum((p.stock or 0) * (p.price or 0) for p in products)
    total_units = sum((p.stock or 0) for p in products)
    stock_health = StockHealth(
        out_of_stock=out_of_stock,
        low_stock=low_stock,
        healthy_stock=healthy,
        inventory_value=inv_value,
        total_units=total_units,
        total_skus=len(products),
    )

    # ---- order status breakdown ----
    status_rows = db.query(models.Order.status, func.count(models.Order.order_id)).group_by(models.Order.status).all()
    status_breakdown = {s or "pending": int(c) for s, c in status_rows}

    return AnalyticsResponse(
        total_revenue=int(total_revenue),
        last_30d_revenue=int(last_30d_revenue),
        last_7d_revenue=int(last_7d_revenue),
        paid_orders=paid_orders,
        avg_order_value=round(aov, 2),
        unique_customers=unique_customers,
        pending_orders=pending_orders,
        revenue_by_category=revenue_by_category,
        daily_revenue=daily_revenue,
        top_products=top_products,
        stock_health=stock_health,
        status_breakdown=status_breakdown,
    )


# ----------------------------- CSV Import -----------------------------

class ImportResult(BaseModel):
    success: bool
    products_created: int
    products_updated: int
    categories_created: int
    rows_skipped: int
    errors: list[str]
    duration_ms: int


def _to_int(v, default=0) -> int:
    try:
        s = str(v).strip().replace("$", "").replace(",", "")
        if not s:
            return default
        return int(float(s))
    except Exception:
        return default


def _to_bool(v) -> bool:
    return str(v).strip().lower() in ("1", "true", "yes", "y", "t")


@router.post("/import-csv", response_model=ImportResult)
async def import_csv(
    file: UploadFile = File(...),
    update_existing: bool = True,
    db: Session = Depends(get_db),
    user=Depends(require_roles("admin", "seller")),
):
    """Bulk-import products from a CSV file.

    Expected columns (case-insensitive):
      name (required), description, price (required), stock, category,
      image_url, is_featured.

    Categories are auto-created if they don't exist (matched by name).
    If `update_existing` is true, products with the same `name` are updated
    instead of duplicated.
    """
    if not file.filename or not file.filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(400, "Please upload a .csv file")

    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")

    # Try a few encodings
    text: Optional[str] = None
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise HTTPException(400, "Could not decode file")

    start = datetime.utcnow()
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(400, "CSV has no header row")

    # Normalize header lookup (case-insensitive)
    headers = {h.lower().strip(): h for h in reader.fieldnames}
    if "name" not in headers or "price" not in headers:
        raise HTTPException(400, "CSV must include at least 'name' and 'price' columns")

    def col(row: dict, key: str, default: str = "") -> str:
        h = headers.get(key)
        return (row.get(h, default) if h else default) or default

    # cache categories
    cat_cache: dict[str, models.Category] = {
        c.name.lower(): c for c in db.query(models.Category).all()
    }
    cats_created = 0
    created = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    for idx, row in enumerate(reader, start=2):  # row 1 is header
        try:
            name = col(row, "name").strip()
            if not name:
                skipped += 1
                continue
            price = _to_int(col(row, "price"))
            if price <= 0:
                errors.append(f"row {idx}: invalid price")
                skipped += 1
                continue

            cat_name = col(row, "category").strip()
            cat_id: Optional[int] = None
            if cat_name:
                key = cat_name.lower()
                cat = cat_cache.get(key)
                if not cat:
                    cat = models.Category(name=cat_name)
                    db.add(cat)
                    db.flush()
                    cat_cache[key] = cat
                    cats_created += 1
                cat_id = cat.id

            stock = _to_int(col(row, "stock"), default=0)
            description = col(row, "description").strip() or None
            image_url = col(row, "image_url").strip() or col(row, "image").strip() or None
            featured = _to_bool(col(row, "is_featured"))

            existing = None
            if update_existing:
                existing = db.query(models.Product).filter(func.lower(models.Product.name) == name.lower()).first()

            if existing:
                existing.price = price
                existing.stock = stock
                existing.description = description
                existing.image_url = image_url
                existing.category = cat_id
                existing.is_featured = featured
                updated += 1
            else:
                db.add(models.Product(
                    name=name,
                    price=price,
                    description=description,
                    image_url=image_url,
                    category=cat_id,
                    stock=stock,
                    is_featured=featured,
                ))
                created += 1
        except Exception as e:
            errors.append(f"row {idx}: {e}")
            skipped += 1

    db.commit()
    duration = int((datetime.utcnow() - start).total_seconds() * 1000)

    return ImportResult(
        success=True,
        products_created=created,
        products_updated=updated,
        categories_created=cats_created,
        rows_skipped=skipped,
        errors=errors[:25],
        duration_ms=duration,
    )


@router.get("/import-csv/template")
def csv_template(user=Depends(require_roles("admin", "seller"))):
    """Returns a sample CSV header + one example row."""
    sample = (
        "name,description,price,stock,category,image_url,is_featured\n"
        'Example Tee,Soft cotton t-shirt,29,120,Clothing,https://picsum.photos/seed/tee/600/600,false\n'
    )
    from fastapi.responses import Response
    return Response(
        content=sample,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products-template.csv"},
    )
