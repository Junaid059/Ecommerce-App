from typing import Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/api/search", tags=["Search"])


def _log_search(db: Session, request: Request, q: str, count: int):
    if not q or not q.strip():
        return
    try:
        from .Oauth2 import verifyToken
        from fastapi import HTTPException
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
        db.add(models.SearchHistory(user_id=uid, session_id=sid, query=q.strip()[:200], result_count=count))
        db.commit()
    except Exception:
        db.rollback()


@router.get("/products", response_model=list[schemas.ProductRead])
def search_products(
    request: Request,
    q: str = "",
    category: Optional[int] = None,
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    query = db.query(models.Product)
    if q:
        query = query.filter(models.Product.name.ilike(f"%{q}%"))
    if category is not None:
        query = query.filter(models.Product.category == category)
    results = query.limit(limit).offset(offset).all()
    if q:
        _log_search(db, request, q, len(results))
    return results


@router.get("/categories", response_model=list[schemas.CategoryRead])
def search_categories(q: str = "", db: Session = Depends(get_db)):
    query = db.query(models.Category)
    if q:
        query = query.filter(models.Category.name.ilike(f"%{q}%"))
    return query.limit(50).all()

