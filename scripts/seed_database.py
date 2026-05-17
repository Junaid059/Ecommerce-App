"""Seed the database directly from seed-products.csv.

Run: python scripts/seed_database.py
     python scripts/seed_database.py --wipe   # nuke all products + categories first
"""
import csv
import sys
from pathlib import Path

# Make `app` importable
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import SessionLocal, engine
from app.models import models

CSV_PATH = ROOT / "seed-products.csv"


def to_int(v, default=0):
    try:
        s = str(v).strip().replace("$", "").replace(",", "")
        return int(float(s)) if s else default
    except Exception:
        return default


def to_bool(v):
    return str(v).strip().lower() in ("1", "true", "yes", "y", "t")


def wipe(db):
    """Remove all products + categories (and dependent rows)."""
    # Delete dependents first so SQLite FK constraints don't complain
    for model in (
        models.Cart,
        models.Wishlist,
        models.Comment,
        models.Rating,
        models.ProductView,
        models.Order,
    ):
        n = db.query(model).delete(synchronize_session=False)
        if n:
            print(f"  wiped {n} {model.__tablename__}")
    n = db.query(models.Product).delete(synchronize_session=False)
    print(f"  wiped {n} products")
    n = db.query(models.Category).delete(synchronize_session=False)
    print(f"  wiped {n} categories")
    db.commit()


def main():
    do_wipe = "--wipe" in sys.argv

    models.Base.metadata.create_all(bind=engine)

    if not CSV_PATH.exists():
        print(f"ERROR: {CSV_PATH} not found. Run scripts/generate_seed_csv.py first.")
        sys.exit(1)

    db = SessionLocal()
    try:
        if do_wipe:
            print("Wiping existing product/category/order data...")
            wipe(db)

        cat_cache = {c.name.lower(): c for c in db.query(models.Category).all()}
        existing_products = {p.name.lower(): p for p in db.query(models.Product).all()}

        created = updated = cats_created = skipped = 0

        with CSV_PATH.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, start=2):
                name = (row.get("name") or "").strip()
                if not name:
                    skipped += 1
                    continue
                price = to_int(row.get("price"))
                if price <= 0:
                    skipped += 1
                    continue
                stock = to_int(row.get("stock"), default=0)
                description = (row.get("description") or "").strip() or None
                image_url = (row.get("image_url") or "").strip() or None
                featured = to_bool(row.get("is_featured"))
                cat_name = (row.get("category") or "").strip()

                cat_id = None
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

                existing = existing_products.get(name.lower())
                if existing:
                    existing.price = price
                    existing.stock = stock
                    existing.description = description
                    existing.image_url = image_url
                    existing.category = cat_id
                    existing.is_featured = featured
                    updated += 1
                else:
                    p = models.Product(
                        name=name,
                        price=price,
                        description=description,
                        image_url=image_url,
                        category=cat_id,
                        stock=stock,
                        is_featured=featured,
                    )
                    db.add(p)
                    created += 1

                if (created + updated) % 100 == 0:
                    db.flush()

        db.commit()

        try:
            from app.ai.embeddings import build_index
            n = build_index(db)
            print(f"Vector index rebuilt: {n} products indexed")
        except Exception as e:
            print(f"(skip) vector index build failed: {e}")

        total_products = db.query(models.Product).count()
        total_cats = db.query(models.Category).count()
        print("-" * 50)
        print(f"Done. {created} created, {updated} updated, {skipped} skipped, {cats_created} new categories.")
        print(f"DB now has {total_products} products in {total_cats} categories.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
