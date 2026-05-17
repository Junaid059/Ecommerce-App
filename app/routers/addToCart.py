from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from .Oauth2 import getCurrentUser

router = APIRouter(prefix="/api/cart", tags=["Cart"])


def _reserved_qty_other_items(db: Session, user_id: int, product_id: int, exclude_cart_id: int | None = None):
    """How much of this product is already in the user's cart (excluding a given row)."""
    q = db.query(models.Cart).filter(
        models.Cart.user_id == user_id, models.Cart.product_id == product_id
    )
    if exclude_cart_id is not None:
        q = q.filter(models.Cart.id != exclude_cart_id)
    return sum(c.quantity for c in q.all())


@router.post("", response_model=schemas.CartRead, status_code=201)
def add_to_cart(
    item: schemas.CartCreate,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock <= 0:
        raise HTTPException(status_code=400, detail="Out of stock")

    existing = (
        db.query(models.Cart)
        .filter(models.Cart.user_id == user.id, models.Cart.product_id == item.product_id)
        .first()
    )
    desired = (existing.quantity if existing else 0) + item.quantity
    if desired > product.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.stock} in stock (you already have {existing.quantity if existing else 0} in cart).",
        )

    if existing:
        existing.quantity = desired  # type: ignore[assignment]
        db.commit()
        db.refresh(existing)
        return existing
    new_item = models.Cart(user_id=user.id, product_id=item.product_id, quantity=item.quantity)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.get("", response_model=list[schemas.CartRead])
def get_cart(db: Session = Depends(get_db), user=Depends(getCurrentUser)):
    return db.query(models.Cart).filter(models.Cart.user_id == user.id).all()


@router.put("/{cart_id}", response_model=schemas.CartRead)
def update_cart_item(
    cart_id: int,
    update: schemas.CartUpdate,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    item = (
        db.query(models.Cart)
        .filter(models.Cart.id == cart_id, models.Cart.user_id == user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product no longer exists")
    if update.quantity > product.stock:
        raise HTTPException(
            status_code=400, detail=f"Only {product.stock} in stock."
        )
    item.quantity = update.quantity  # type: ignore[assignment]
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{cart_id}", status_code=204)
def delete_cart_item(
    cart_id: int,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    item = (
        db.query(models.Cart)
        .filter(models.Cart.id == cart_id, models.Cart.user_id == user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return None


@router.delete("", status_code=204)
def clear_cart(db: Session = Depends(get_db), user=Depends(getCurrentUser)):
    db.query(models.Cart).filter(models.Cart.user_id == user.id).delete()
    db.commit()
    return None
