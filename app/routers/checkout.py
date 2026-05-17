"""Dummy payment + checkout router.

No real money — all "card" details are accepted as long as the basic format is right.
Creates real Order rows and decrements stock atomically.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.Oauth2 import getCurrentUser, require_roles
from app.routers.coupons import _validate as _validate_coupon, _calc_discount


router = APIRouter(prefix="/api/checkout", tags=["Checkout"])


class DummyPaymentRequest(BaseModel):
    address: str = Field(..., min_length=4)
    card_name: str = Field(..., min_length=2)
    card_number: str = Field(..., min_length=12, max_length=23)
    card_expiry: str = Field(..., min_length=4, max_length=7)  # MM/YY
    card_cvc: str = Field(..., min_length=3, max_length=4)
    coupon_code: str | None = None


class DummyPaymentResponse(BaseModel):
    success: bool
    order_ids: list[int]
    total_amount: int
    discount_amount: int
    payment_ref: str
    message: str


@router.get("/config")
def checkout_config():
    return {"mode": "dummy", "enabled": True}


def _luhn_ok(card_number: str) -> bool:
    digits = [int(c) for c in card_number if c.isdigit()]
    if len(digits) < 12:
        return False
    checksum = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


@router.post("/pay", response_model=DummyPaymentResponse)
def pay(
    payload: DummyPaymentRequest,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    """Dummy payment processor.

    Validates card with Luhn + expiry format, then creates Orders for everything in the cart.
    Test cards that always pass: 4242 4242 4242 4242 (Visa), 5555 5555 5555 4444 (Mastercard).
    Use a card ending in 0002 to simulate a decline (no Luhn match -> failure).
    """
    # ---- basic card validation ----
    digits = "".join(c for c in payload.card_number if c.isdigit())
    if not _luhn_ok(digits):
        raise HTTPException(402, "Payment declined: invalid card number.")
    exp = payload.card_expiry.replace(" ", "")
    if "/" not in exp:
        raise HTTPException(400, "Expiry must be in MM/YY format")
    try:
        mm, yy = exp.split("/")
        mm_i = int(mm); yy_i = int(yy)
        if not (1 <= mm_i <= 12):
            raise ValueError
        full_year = 2000 + yy_i if yy_i < 100 else yy_i
        now = datetime.utcnow()
        if (full_year, mm_i) < (now.year, now.month):
            raise HTTPException(402, "Payment declined: card expired.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Invalid expiry date")
    if not payload.card_cvc.isdigit():
        raise HTTPException(400, "Invalid CVC")

    # ---- cart ----
    cart_items = db.query(models.Cart).filter(models.Cart.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(400, "Cart is empty")

    # Recompute subtotal + verify stock
    subtotal = 0
    item_data = []
    for c in cart_items:
        p = db.query(models.Product).filter(models.Product.id == c.product_id).first()
        if not p:
            raise HTTPException(400, f"Product {c.product_id} no longer exists")
        if p.stock < c.quantity:
            raise HTTPException(400, f"Only {p.stock} of '{p.name}' in stock (you have {c.quantity}).")
        subtotal += p.price * c.quantity
        item_data.append((c, p))

    # ---- coupon ----
    discount = 0
    coupon_code = None
    coupon_obj = None
    if payload.coupon_code:
        coupon_obj = db.query(models.Coupon).filter(models.Coupon.code == payload.coupon_code.upper()).first()
        if not coupon_obj:
            raise HTTPException(400, "Invalid coupon code")
        ok, msg = _validate_coupon(coupon_obj, subtotal)
        if not ok:
            raise HTTPException(400, f"Coupon error: {msg}")
        discount = _calc_discount(coupon_obj, subtotal)
        coupon_code = coupon_obj.code

    total = max(0, subtotal - discount)
    payment_ref = f"DUMMY-{uuid.uuid4().hex[:10].upper()}"

    # ---- create orders + decrement stock ----
    created_ids = []
    first = True
    for c, p in item_data:
        order = models.Order(
            user_id=user.id,
            product_id=p.id,
            quantity=c.quantity,
            address=payload.address,
            stripe_session_id=payment_ref,
            payment_status="paid",
            status="processing",
            total_amount=p.price * c.quantity,
            discount_amount=discount if first else 0,
            coupon_code=coupon_code,
        )
        p.stock = p.stock - c.quantity  # type: ignore[assignment]
        db.add(order)
        db.flush()
        created_ids.append(order.order_id)
        db.delete(c)
        first = False

    if coupon_obj:
        coupon_obj.times_used = (coupon_obj.times_used or 0) + 1

    db.commit()

    # email is best-effort; never blocks
    try:
        from app.tasks import send_email
        body = (
            f"<h2>Order Confirmation — {payment_ref}</h2>"
            f"<p>Total: ${total}</p>"
            f"<p>Address: {payload.address}</p>"
        )
        send_email.delay(subject="Order Confirmation", email_to=user.email, body=body)
    except Exception as e:
        print(f"[checkout] email skipped: {e}")

    return {
        "success": True,
        "order_ids": created_ids,
        "total_amount": total,
        "discount_amount": discount,
        "payment_ref": payment_ref,
        "message": "Payment successful (dummy mode).",
    }


# Legacy stubs so any leftover frontend code doesn't 404
@router.get("/suggestions", response_model=list[schemas.ProductSuggestionResponse])
def get_product_suggestions(
    db: Session = Depends(get_db),
    user=Depends(require_roles("customer")),
    limit: int = 5,
):
    rows = (
        db.query(models.Product)
        .order_by(models.Product.created_at.desc())
        .limit(limit)
        .all()
    )
    return rows
