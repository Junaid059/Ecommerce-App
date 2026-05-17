from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from ..utils import hashPassword, verifyPassword
from .Oauth2 import getCurrentUser, require_roles

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.post("/register", response_model=schemas.UserRead, status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(
        email=user.email,
        password=hashPassword(user.password),
        role="customer",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/me", response_model=schemas.UserRead)
def me(user=Depends(getCurrentUser)):
    return user


@router.get("", response_model=list[schemas.UserRead])
def list_users(
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
    limit: int = 50,
    offset: int = 0,
):
    return db.query(models.User).limit(limit).offset(offset).all()


@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current=Depends(getCurrentUser),
):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current=Depends(getCurrentUser),
):
    if current.role != "admin" and current.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return None


@router.put("/me/password", response_model=schemas.UserRead)
def update_password(
    payload: schemas.PasswordUpdate,
    db: Session = Depends(get_db),
    current=Depends(getCurrentUser),
):
    if not verifyPassword(payload.old_password, str(current.password)):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    current.password = hashPassword(payload.new_password)  # type: ignore[assignment]
    db.commit()
    db.refresh(current)
    return current
