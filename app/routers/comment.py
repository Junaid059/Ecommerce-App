from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from .Oauth2 import getCurrentUser

router = APIRouter(prefix="/api/comments", tags=["Comments"])


@router.post("", response_model=schemas.CommentRead, status_code=201)
def create_comment(
    comment: schemas.CommentCreate,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    new_comment = models.Comment(
        product_id=comment.product_id,
        user_id=user.id,
        comment=comment.comment,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment


@router.get("/product/{product_id}", response_model=list[schemas.CommentRead])
def list_product_comments(
    product_id: int,
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    return (
        db.query(models.Comment)
        .filter(models.Comment.product_id == product_id)
        .order_by(models.Comment.id.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )


@router.delete("/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    c = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    if user.role != "admin" and c.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(c)
    db.commit()
    return None
