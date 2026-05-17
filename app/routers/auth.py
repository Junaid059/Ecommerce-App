from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from dotenv import load_dotenv
import os

from app.database import get_db
from app.models import models
from app.schemas import schemas
from ..utils import verifyPassword
from .Oauth2 import create_token, create_refresh_token, getCurrentUser

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=schemas.Token)
def login(
    user_credentials: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == user_credentials.username)
        .first()
    )
    if not user or not verifyPassword(user_credentials.password, str(user.password)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    access_token = create_token(data={"id": user.id, "role": user.role})
    new_refresh_token = create_refresh_token(data={"id": user.id, "role": user.role})
    user.refresh_token = new_refresh_token  # type: ignore[assignment]
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=schemas.Token)
def refresh_token_endpoint(
    token: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(token, str(SECRET_KEY), algorithms=[str(ALGORITHM)])
        user_id = payload.get("id")
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user or str(user.refresh_token) != token:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        access_token = create_token(data={"id": user.id, "role": user.role})
        return {"access_token": access_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout")
def logout(user=Depends(getCurrentUser), db: Session = Depends(get_db)):
    user.refresh_token = None  # type: ignore[assignment]
    db.commit()
    return {"message": "Successfully logged out"}
