from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from .Oauth2 import getCurrentUser, require_roles

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.get("", response_model=list[schemas.OrderRead])
def list_my_orders(
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
    limit: int = 50,
    offset: int = 0,
):
    q = db.query(models.Order)
    if user.role != "admin":
        q = q.filter(models.Order.user_id == user.id)
    return q.order_by(models.Order.order_id.desc()).limit(limit).offset(offset).all()


@router.get("/{order_id}", response_model=schemas.OrderRead)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    order = db.query(models.Order).filter(models.Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role != "admin" and order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return order


@router.post("", response_model=schemas.OrderRead, status_code=201)
def create_order(
    order: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles("customer")),
):
    product = db.query(models.Product).filter(models.Product.id == order.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < order.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock available")
    new_order = models.Order(
        user_id=user.id,
        product_id=order.product_id,
        quantity=order.quantity,
        address=order.address,
        payment_status="pending",
        total_amount=product.price * order.quantity,
    )
    product.stock = product.stock - order.quantity  # type: ignore[assignment]
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


@router.put("/{order_id}/status", response_model=schemas.OrderRead)
def update_order_status(
    order_id: int,
    payload: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    order = db.query(models.Order).filter(models.Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    if payload.tracking_number is not None:
        order.tracking_number = payload.tracking_number
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=204)
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    user=Depends(getCurrentUser),
):
    order = db.query(models.Order).filter(models.Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role != "admin" and order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    db.delete(order)
    db.commit()
    return None
