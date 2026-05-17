"""Coupon CRUD (admin) + public validation/apply endpoint."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.Oauth2 import require_roles, getCurrentUser

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


def _validate(coupon: models.Coupon, subtotal: int) -> tuple[bool, str]:
    if not coupon.is_active:
        return False, "Coupon is not active"
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        return False, "Coupon has expired"
    if coupon.max_uses is not None and coupon.times_used >= coupon.max_uses:
        return False, "Coupon usage limit reached"
    if subtotal < coupon.min_order_amount:
        return False, f"Minimum order amount is ${coupon.min_order_amount}"
    return True, ""


def _calc_discount(coupon: models.Coupon, subtotal: int) -> int:
    if coupon.discount_type == "percent":
        return min(subtotal, int(subtotal * coupon.discount_value / 100))
    return min(subtotal, coupon.discount_value)


# ---------- ADMIN CRUD ----------
@router.get("", response_model=list[schemas.CouponRead])
def list_coupons(db: Session = Depends(get_db), _=Depends(require_roles("admin"))):
    return db.query(models.Coupon).order_by(models.Coupon.id.desc()).all()


@router.post("", response_model=schemas.CouponRead, status_code=201)
def create_coupon(
    payload: schemas.CouponCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    if db.query(models.Coupon).filter(models.Coupon.code == payload.code).first():
        raise HTTPException(400, "Coupon code already exists")
    c = models.Coupon(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.put("/{coupon_id}", response_model=schemas.CouponRead)
def update_coupon(
    coupon_id: int,
    payload: schemas.CouponCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    c = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not c:
        raise HTTPException(404, "Coupon not found")
    for k, v in payload.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{coupon_id}", status_code=204)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    c = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
    if not c:
        raise HTTPException(404, "Coupon not found")
    db.delete(c)
    db.commit()
    return None


# ---------- PUBLIC APPLY ----------
@router.post("/apply", response_model=schemas.CouponApplyResponse)
def apply_coupon(
    payload: schemas.CouponApply,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    c = db.query(models.Coupon).filter(models.Coupon.code == payload.code.upper()).first()
    if not c:
        # also try exact case
        c = db.query(models.Coupon).filter(models.Coupon.code == payload.code).first()
    if not c:
        return {"valid": False, "discount": 0, "new_total": payload.subtotal, "message": "Invalid coupon code"}

    ok, msg = _validate(c, payload.subtotal)
    if not ok:
        return {"valid": False, "discount": 0, "new_total": payload.subtotal, "message": msg}

    discount = _calc_discount(c, payload.subtotal)
    return {
        "valid": True,
        "discount": discount,
        "new_total": max(0, payload.subtotal - discount),
        "message": f"Coupon applied: -${discount}",
    }
