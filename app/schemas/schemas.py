from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, List


# ---------- USERS ----------
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserRead(UserBase):
    id: int
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


# ---------- CATEGORIES ----------
class CategoryBase(BaseModel):
    name: str


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# ---------- PRODUCTS ----------
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: int
    image_url: Optional[str] = None
    category: Optional[int] = None
    stock: int
    is_featured: Optional[bool] = False


class ProductCreate(ProductBase):
    pass


class ProductRead(ProductBase):
    id: int

    class Config:
        from_attributes = True


# ---------- ORDERS ----------
class OrderCreate(BaseModel):
    product_id: int
    quantity: int
    address: str


class OrderRead(BaseModel):
    order_id: int
    user_id: int
    product_id: int
    quantity: int
    address: str
    payment_status: str
    status: str
    tracking_number: Optional[str] = None
    total_amount: Optional[int] = None
    discount_amount: int = 0
    coupon_code: Optional[str] = None
    stripe_session_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "processing", "shipped", "delivered", "cancelled"]
    tracking_number: Optional[str] = None


# ---------- RATINGS ----------
class RatingCreate(BaseModel):
    product_id: int
    rating: int = Field(..., ge=1, le=5)


class RatingRead(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int

    class Config:
        from_attributes = True


# ---------- COMMENTS ----------
class CommentCreate(BaseModel):
    product_id: int
    comment: str


class CommentRead(BaseModel):
    id: int
    product_id: int
    user_id: int
    comment: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- CART ----------
class CartCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)


class CartUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartRead(BaseModel):
    id: int
    user_id: int
    product_id: int
    quantity: int

    class Config:
        from_attributes = True


# ---------- WISHLIST ----------
class WishlistCreate(BaseModel):
    product_id: int


class WishListRead(BaseModel):
    id: int
    user_id: int
    product_id: int

    class Config:
        from_attributes = True


# ---------- AUTH ----------
class TokenData(BaseModel):
    id: int | None = None
    role: str | None = None


class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str


# ---------- CHECKOUT ----------
class CheckoutSessionCreate(BaseModel):
    success_url: str
    cancel_url: str
    address: str
    coupon_code: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    session_id: str
    client_secret: str | None = None
    url: str | None = None

    class Config:
        from_attributes = True


class PaymentSuccessResponse(BaseModel):
    message: str
    orders_count: int
    total_amount: int


class ProductSuggestionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: int
    image_url: Optional[str] = None
    category: Optional[int] = None
    stock: int

    class Config:
        from_attributes = True


# ---------- COUPONS ----------
class CouponBase(BaseModel):
    code: str
    discount_type: Literal["percent", "fixed"] = "percent"
    discount_value: int = Field(..., ge=1)
    min_order_amount: int = 0
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True


class CouponCreate(CouponBase):
    pass


class CouponRead(CouponBase):
    id: int
    times_used: int

    class Config:
        from_attributes = True


class CouponApply(BaseModel):
    code: str
    subtotal: int


class CouponApplyResponse(BaseModel):
    valid: bool
    discount: int = 0
    new_total: int = 0
    message: Optional[str] = None


# ---------- AI ----------
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    sources: List[dict] = []


class AIDescriptionRequest(BaseModel):
    name: str
    keywords: Optional[str] = None
    category: Optional[str] = None


class AIDescriptionResponse(BaseModel):
    description: str


class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 10
