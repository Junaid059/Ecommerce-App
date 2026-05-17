"""LangGraph-style tool-calling agent for Shopwave's customer support assistant.

A lightweight ReAct loop on top of Groq's tool-calling API. We avoid a hard
dependency on LangGraph itself so the project stays a one-`pip install` setup
on Windows.

Tools exposed to the model:
  - search_products(query, limit)      semantic catalog search
  - get_product(product_id)            full product detail
  - check_stock(product_id)            quick availability check
  - list_categories()                  what kinds of products we sell
  - recommend_for_user(limit)          personalised picks for the logged-in user
  - get_my_orders()                    order history with tracking + status
  - track_order(order_id)              status + tracking for a single order
  - apply_coupon_info(code)            explain whether a coupon is valid
  - get_faq(topic)                     shipping/returns/payment/sizing/contact
"""
import json
from datetime import datetime

from sqlalchemy import func

from app.models import models
from app.ai import llm, rag


SYSTEM_PROMPT = """You are Maya, a senior customer support specialist at Shopwave, an online retail store. You are NOT an AI assistant — speak as a real human support agent would. You're warm, professional, knowledgeable, and you genuinely care about helping the customer find what they need.

## Your responsibilities
- Help customers discover and compare products (tools: search_products, recommend_for_user, get_product).
- Check live inventory before making promises (tool: check_stock).
- Look up orders and tracking info (tools: get_my_orders, track_order).
- Validate and explain discount codes (tool: apply_coupon_info).
- Answer questions about shipping, returns, payment, sizing, warranty, account, and privacy (tool: get_faq).
- Help customers browse the catalogue (tool: list_categories).

## How you communicate
- Write like a human: natural sentence rhythm, contractions ("you'll", "I've", "let's"), occasional friendly asides.
- DO NOT use emojis, exclamation marks every line, or canned phrases like "Great question!" or "I'd be happy to help!". Real support agents don't talk like that.
- DO NOT introduce yourself as an AI, chatbot, language model, or "assistant". You're Maya, a member of the support team.
- Keep replies focused and concise — usually 2-4 short sentences. Use a short bulleted list only when comparing several items.
- When you reference a product, format it as **[Product Name](#id)** so the customer can tap through. Quote the price in dollars and note stock status.
- If you're not certain about something, say so plainly and offer to look it up or escalate to email.

## Hard rules
1. ALWAYS call the relevant tool before stating facts about products, stock, orders, coupons or policies. Don't guess.
2. For shipping, returns, payment, sizing, warranty etc. — always call get_faq first, even if you think you know the answer.
3. If the customer isn't signed in and asks about their orders, politely ask them to sign in.
4. If a tool returns an error, apologise briefly and offer an alternative path (e.g. "I couldn't pull up that order — could you double-check the number, or I can look at all your recent orders if you sign in?").
5. We're currently running in demo mode with a test payment processor. If a customer specifically asks about payment, be transparent: test card 4242 4242 4242 4242 with any future expiry works for demo purchases. Don't bring this up unprompted.
6. Never expose internal database ids or session ids in conversation. Order numbers are fine.
"""


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Semantic search the product catalog. Use whenever the user describes what they want or asks for gift ideas / recommendations / 'something for X'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural-language description of what the user is looking for."},
                    "limit": {"type": "integer", "default": 5, "minimum": 1, "maximum": 10},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product",
            "description": "Fetch full details of a single product by its numeric id.",
            "parameters": {
                "type": "object",
                "properties": {"product_id": {"type": "integer"}},
                "required": ["product_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_stock",
            "description": "Check how many units of a product are currently in stock.",
            "parameters": {
                "type": "object",
                "properties": {"product_id": {"type": "integer"}},
                "required": ["product_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_categories",
            "description": "List the product categories the store offers, so you can suggest browsing options.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_for_user",
            "description": "Get personalised recommendations for the CURRENTLY LOGGED-IN user, based on their searches, views and past purchases. Use when the user asks 'what should I buy?' or 'recommend something for me'.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "default": 5, "minimum": 1, "maximum": 10}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_my_orders",
            "description": "Return up to 10 of the current authenticated user's most recent orders with status and tracking.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "track_order",
            "description": "Look up a single order by its numeric order_id and return status, tracking number, ETA and items.",
            "parameters": {
                "type": "object",
                "properties": {"order_id": {"type": "integer"}},
                "required": ["order_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "apply_coupon_info",
            "description": "Explain whether a coupon code is valid, how much it saves, and any restrictions (min order, expiry, uses remaining).",
            "parameters": {
                "type": "object",
                "properties": {"code": {"type": "string"}},
                "required": ["code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_faq",
            "description": "Look up the store's policy answer for a topic. Use for shipping, returns, payment, sizing, contact, or general 'about us' questions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "enum": [
                            "shipping",
                            "returns",
                            "payment",
                            "sizing",
                            "warranty",
                            "contact",
                            "account",
                            "privacy",
                            "general",
                        ],
                    }
                },
                "required": ["topic"],
            },
        },
    },
]


FAQS = {
    "shipping": (
        "Standard shipping is free and arrives in 3 to 5 business days anywhere in the continental US. "
        "Express (2 business days) is $9.99, and overnight is $19.99. We also ship internationally to 40+ countries — "
        "rates are calculated at checkout based on weight and destination. You'll get a tracking number by email within "
        "24 hours of dispatch."
    ),
    "returns": (
        "We offer a 30-day return window on unworn, unwashed items in their original packaging. "
        "Just head to 'My Orders', pick the order, and click 'Return' — we'll email a prepaid shipping label. "
        "Once the item reaches our warehouse, refunds usually settle on your original payment method within 5 to 7 business days. "
        "Sale items and personalised products are final sale."
    ),
    "payment": (
        "We're currently running in demo mode with a test payment processor — no real charges go through. "
        "For testing you can use card 4242 4242 4242 4242, any future expiry, and any 3-digit CVC. "
        "In production we accept Visa, Mastercard, Amex, Apple Pay and Google Pay through Stripe."
    ),
    "sizing": (
        "Every product page has a detailed size guide. For apparel we generally suggest sizing up if you're between sizes, "
        "and we offer free exchanges within 30 days if the fit isn't quite right."
    ),
    "warranty": (
        "All electronics include a one-year limited manufacturer warranty against defects. "
        "Extended two-year coverage is available at checkout for an additional 10% of the item price."
    ),
    "contact": (
        "You can reach our team at support@shopwave.test — average reply time is under an hour during business hours "
        "(9am to 7pm Eastern, Monday through Saturday). You're also welcome to keep chatting with me here for quicker answers."
    ),
    "account": (
        "From the profile menu you can update your email and password, review past orders, manage your wishlist, "
        "and save delivery addresses. If you ever want to delete your account, email us and we'll take care of it within 48 hours."
    ),
    "privacy": (
        "We never sell your personal data, and payment details aren't stored on our servers. "
        "The full privacy policy lives at shopwave.test/privacy if you'd like the details."
    ),
    "general": (
        "Shopwave is an online retail store with AI-assisted search and personalised recommendations. "
        "Have a browse through the catalogue, save favourites to your wishlist, and check out securely when you're ready. "
        "We're currently in demo mode using a test payment processor."
    ),
}


def _run_tool(name: str, args: dict, db, user) -> dict:
    if name == "search_products":
        products = rag.retrieve_products(db, args.get("query", ""), k=args.get("limit", 5))
        return {
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "price": p.price,
                    "stock": p.stock,
                    "in_stock": p.stock > 0,
                    "description": (p.description or "")[:200],
                }
                for p in products
            ]
        }

    if name == "get_product":
        p = db.query(models.Product).filter(models.Product.id == args.get("product_id")).first()
        if not p:
            return {"error": "Product not found"}
        return {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "stock": p.stock,
            "in_stock": p.stock > 0,
            "is_featured": bool(p.is_featured),
        }

    if name == "check_stock":
        p = db.query(models.Product).filter(models.Product.id == args.get("product_id")).first()
        if not p:
            return {"error": "Product not found"}
        return {
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "status": (
                "in stock" if p.stock > 5 else
                f"low stock — only {p.stock} left" if p.stock > 0 else
                "out of stock"
            ),
        }

    if name == "list_categories":
        cats = db.query(models.Category).all()
        return {"categories": [{"id": c.id, "name": c.name} for c in cats]}

    if name == "recommend_for_user":
        if not user:
            return {"error": "User not logged in. Suggest they sign in for personalised picks, or call search_products for a generic query instead."}
        limit = max(1, min(int(args.get("limit", 5)), 10))
        # purchase history
        purchased_ids = {
            o.product_id for o in db.query(models.Order)
            .filter(models.Order.user_id == user.id)
            .order_by(models.Order.order_id.desc()).limit(20).all()
        }
        # searches
        searches = [
            s.query for s in db.query(models.SearchHistory)
            .filter(models.SearchHistory.user_id == user.id)
            .order_by(models.SearchHistory.id.desc()).limit(15).all()
            if s.query
        ]
        # views
        viewed_ids = [
            v.product_id for v in db.query(models.ProductView)
            .filter(models.ProductView.user_id == user.id)
            .order_by(models.ProductView.id.desc()).limit(15).all()
        ]
        parts: list[str] = list(searches)
        if purchased_ids:
            past = db.query(models.Product).filter(models.Product.id.in_(list(purchased_ids))).all()
            parts += [f"{p.name} {(p.description or '')[:60]}" for p in past]
        if viewed_ids:
            viewed = db.query(models.Product).filter(models.Product.id.in_(viewed_ids)).all()
            parts += [f"{p.name}" for p in viewed]
        if not parts:
            return {"products": [], "note": "No history yet — fall back to search_products with a generic query, or list_categories."}
        profile = " ".join(parts)[:1500]
        cands = rag.retrieve_products(db, profile, k=limit * 3)
        fresh = [c for c in cands if c.id not in purchased_ids][:limit]
        return {
            "products": [
                {"id": p.id, "name": p.name, "price": p.price, "stock": p.stock, "in_stock": p.stock > 0}
                for p in fresh
            ]
        }

    if name == "get_my_orders":
        if not user:
            return {"error": "User is not logged in. Ask them to sign in to view orders."}
        orders = (
            db.query(models.Order)
            .filter(models.Order.user_id == user.id)
            .order_by(models.Order.order_id.desc())
            .limit(10)
            .all()
        )
        if not orders:
            return {"orders": [], "note": "You have no orders yet."}
        out = []
        for o in orders:
            p = db.query(models.Product).filter(models.Product.id == o.product_id).first()
            out.append({
                "order_id": o.order_id,
                "product": p.name if p else f"#{o.product_id}",
                "quantity": o.quantity,
                "status": o.status,
                "payment_status": o.payment_status,
                "tracking_number": o.tracking_number,
                "total_amount": o.total_amount,
                "placed_at": o.created_at.isoformat() if o.created_at else None,
            })
        return {"orders": out}

    if name == "track_order":
        if not user:
            return {"error": "User must be logged in to track orders."}
        o = db.query(models.Order).filter(
            models.Order.order_id == args.get("order_id"),
            models.Order.user_id == user.id,
        ).first()
        if not o:
            return {"error": "Order not found, or it doesn't belong to your account."}
        p = db.query(models.Product).filter(models.Product.id == o.product_id).first()
        eta = None
        if o.created_at and o.status not in ("delivered", "cancelled"):
            from datetime import timedelta
            eta_days = {"pending": 5, "processing": 4, "shipped": 2}.get(o.status, 5)
            eta = (o.created_at + timedelta(days=eta_days)).strftime("%Y-%m-%d")
        return {
            "order_id": o.order_id,
            "product": p.name if p else f"#{o.product_id}",
            "quantity": o.quantity,
            "status": o.status,
            "payment_status": o.payment_status,
            "tracking_number": o.tracking_number or "—",
            "total_amount": o.total_amount,
            "estimated_delivery": eta,
            "placed_at": o.created_at.isoformat() if o.created_at else None,
        }

    if name == "apply_coupon_info":
        code = (args.get("code") or "").strip().upper()
        if not code:
            return {"error": "No code provided."}
        c = db.query(models.Coupon).filter(func.upper(models.Coupon.code) == code).first()
        if not c:
            return {"valid": False, "reason": f"Coupon '{code}' doesn't exist."}
        now = datetime.utcnow()
        if not c.is_active:
            return {"valid": False, "code": c.code, "reason": "This coupon is disabled."}
        if c.expires_at and c.expires_at < now:
            return {"valid": False, "code": c.code, "reason": f"Expired on {c.expires_at.date()}."}
        if c.max_uses is not None and c.times_used >= c.max_uses:
            return {"valid": False, "code": c.code, "reason": "All uses redeemed."}
        return {
            "valid": True,
            "code": c.code,
            "discount_type": c.discount_type,
            "discount_value": c.discount_value,
            "min_order_amount": c.min_order_amount,
            "uses_remaining": (c.max_uses - c.times_used) if c.max_uses else "unlimited",
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "summary": (
                f"{c.discount_value}% off" if c.discount_type == "percent"
                else f"${c.discount_value} off"
            ) + (f" (min order ${c.min_order_amount})" if c.min_order_amount else ""),
        }

    if name == "get_faq":
        return {"answer": FAQS.get(args.get("topic", "general"), FAQS["general"])}

    return {"error": f"Unknown tool {name}"}


def run_agent(user_message: str, history: list[dict], db, user=None) -> dict:
    """Run the ReAct-style loop. Returns {'reply': str, 'sources': [products]}.

    `history` is a list of {role, content} dicts already trimmed to last N turns.
    """
    auth_note = f"\n\n[Context: user is logged in as {user.email} (id={user.id}).]" if user else "\n\n[Context: user is anonymous.]"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + auth_note},
        *history,
        {"role": "user", "content": user_message},
    ]
    sources = []

    for _ in range(5):  # max tool-call iterations
        out = llm.chat(messages, tools=TOOLS, tool_choice="auto", temperature=0.3)
        tool_calls = out.get("tool_calls") or []

        if not tool_calls:
            return {"reply": out["content"] or "I'm not sure how to help with that — could you rephrase?", "sources": sources}

        # Append the assistant turn that requested tool calls
        messages.append({
            "role": "assistant",
            "content": out["content"] or "",
            "tool_calls": tool_calls,
        })

        for tc in tool_calls:
            name = tc["function"]["name"]
            try:
                args = json.loads(tc["function"]["arguments"] or "{}")
            except json.JSONDecodeError:
                args = {}
            result = _run_tool(name, args, db, user)
            if name in ("search_products", "recommend_for_user") and result.get("products"):
                sources.extend(result["products"])
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "name": name,
                "content": json.dumps(result),
            })

    # Out of iterations - ask for a final summary
    final = llm.chat(messages, temperature=0.3)
    # Dedupe sources by id while preserving order
    seen = set()
    deduped = []
    for s in sources:
        if s.get("id") in seen:
            continue
        seen.add(s.get("id"))
        deduped.append(s)
    return {"reply": final["content"] or "Sorry, I couldn't complete that request.", "sources": deduped[:6]}
