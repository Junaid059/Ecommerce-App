from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from .Oauth2 import getCurrentUser

router = APIRouter(prefix="/api/ratings", tags=["Ratings"])


@router.post("", response_model=schemas.RatingRead, status_code=201)
def create_rating(
    rating: schemas.RatingCreate,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    # Upsert: one rating per user per product
    existing = (
        db.query(models.Rating)
        .filter(
            models.Rating.user_id == user.id,
            models.Rating.product_id == rating.product_id,
        )
        .first()
    )
    if existing:
        existing.rating = rating.rating  # type: ignore[assignment]
        db.commit()
        db.refresh(existing)
        return existing
    new_rating = models.Rating(
        product_id=rating.product_id,
        user_id=user.id,
        rating=rating.rating,
    )
    db.add(new_rating)
    db.commit()
    db.refresh(new_rating)
    return new_rating


@router.get("/product/{product_id}", response_model=list[schemas.RatingRead])
def list_product_ratings(product_id: int, db: Session = Depends(get_db)):
    return db.query(models.Rating).filter(models.Rating.product_id == product_id).all()


@router.get("/product/{product_id}/average")
def average_rating(product_id: int, db: Session = Depends(get_db)):
    ratings = db.query(models.Rating).filter(models.Rating.product_id == product_id).all()
    if not ratings:
        return {"product_id": product_id, "average": 0, "count": 0}
    avg = sum(r.rating for r in ratings) / len(ratings)
    return {"product_id": product_id, "average": round(avg, 2), "count": len(ratings)}


@router.delete("/{rating_id}", status_code=204)
def delete_rating(
    rating_id: int,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    r = db.query(models.Rating).filter(models.Rating.id == rating_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Rating not found")
    if user.role != "admin" and r.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(r)
    db.commit()
    return None
