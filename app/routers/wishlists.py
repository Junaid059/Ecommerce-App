from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from .Oauth2 import getCurrentUser

router = APIRouter(prefix="/api/wishlist", tags=["Wishlist"])


@router.post("", response_model=schemas.WishListRead, status_code=201)
def add_to_wishlist(
    wishlist: schemas.WishlistCreate,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    existing = (
        db.query(models.Wishlist)
        .filter(
            models.Wishlist.user_id == user.id,
            models.Wishlist.product_id == wishlist.product_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Product already in wishlist")
    item = models.Wishlist(user_id=user.id, product_id=wishlist.product_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[schemas.WishListRead])
def get_wishlist(db: Session = Depends(get_db), user=Depends(getCurrentUser)):
    return db.query(models.Wishlist).filter(models.Wishlist.user_id == user.id).all()


@router.delete("/{product_id}", status_code=204)
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    item = (
        db.query(models.Wishlist)
        .filter(
            models.Wishlist.product_id == product_id,
            models.Wishlist.user_id == user.id,
        )
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Wishlist item not found")
    db.delete(item)
    db.commit()
    return None
