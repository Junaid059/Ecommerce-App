from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request

from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from .Oauth2 import require_roles
from ..utils import save_image

router = APIRouter(prefix="/api/products", tags=["Products"])


def _safe_reindex(db: Session):
    """Re-build FAISS index after product mutations. Never raise to caller."""
    try:
        from app.ai import embeddings
        embeddings.build_index(db)
    except Exception as e:
        print(f"[product] reindex skipped: {e}")


@router.get("", response_model=list[schemas.ProductRead])
def list_products(
    db: Session = Depends(get_db),
    category: Optional[int] = None,
    featured: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
):
    q = db.query(models.Product)
    if category is not None:
        q = q.filter(models.Product.category == category)
    if featured is not None:
        q = q.filter(models.Product.is_featured.is_(featured))
    return q.order_by(models.Product.created_at.desc()).limit(limit).offset(offset).all()


@router.get("/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, request: Request, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    # log view (best-effort; never fail the request)
    try:
        from .Oauth2 import verifyToken
        uid = None
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            tok = auth.split(" ", 1)[1].strip()
            try:
                data = verifyToken(tok, HTTPException(status_code=401, detail="x"))
                uid = data.id
            except Exception:
                uid = None
        sid = request.headers.get("X-Session-Id")
        db.add(models.ProductView(user_id=uid, session_id=sid, product_id=product_id))
        db.commit()
    except Exception:
        db.rollback()
    return product


@router.post("", response_model=schemas.ProductRead, status_code=201)
def create_product(
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "seller")),
):
    new_product = models.Product(
        name=product.name,
        price=product.price,
        description=product.description,
        image_url=product.image_url,
        category=product.category,
        stock=product.stock,
        is_featured=bool(product.is_featured),
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    _safe_reindex(db)
    return new_product


@router.post("/upload-image")
def upload_product_image(
    request: Request,
    image: UploadFile = File(...),
    _=Depends(require_roles("admin", "seller")),
):
    """Upload an image and return a public URL the frontend can use as `image_url`."""
    rel_path = save_image(image)  # e.g. uploads/abc.jpg
    base = str(request.base_url).rstrip("/")
    return {"image_url": f"{base}/{rel_path.replace(chr(92), '/')}"}


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int,
    product_update: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "seller")),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field in ("name", "price", "description", "image_url", "category", "stock", "is_featured"):
        setattr(product, field, getattr(product_update, field))
    db.commit()
    db.refresh(product)
    _safe_reindex(db)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin", "seller")),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    _safe_reindex(db)
    return None
