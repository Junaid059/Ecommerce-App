"""AI endpoints: chatbot, recommendations, semantic search, AI description gen, vector index admin."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.routers.Oauth2 import getCurrentUser, require_roles, verifyToken
from app.ai import llm, embeddings, rag, agent

router = APIRouter(prefix="/api/ai", tags=["AI"])


def _optional_user(request: Request, db: Session = Depends(get_db)):
    """Like getCurrentUser but returns None when no/invalid token (for anonymous chat)."""
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        data = verifyToken(token, HTTPException(status_code=401, detail="bad token"))
        return db.query(models.User).filter(models.User.id == data.id).first()
    except Exception:
        return None


@router.get("/status")
def status():
    return {
        "llm_configured": llm.is_configured(),
        "model": llm.GROQ_MODEL,
    }


# ---------- CHATBOT ----------
@router.post("/chat", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(_optional_user),
):
    if not llm.is_configured():
        raise HTTPException(503, "AI not configured. Set GROQ_API_KEY in .env.")

    session_id = payload.session_id or str(uuid.uuid4())

    # Load last 10 messages for this session (per-session, not per-user, so anonymous works)
    prior = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.id.asc())
        .limit(20)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in prior if m.role in ("user", "assistant")]

    # Persist user message
    db.add(models.ChatMessage(
        user_id=user.id if user else None,
        session_id=session_id,
        role="user",
        content=payload.message,
    ))
    db.commit()

    result = agent.run_agent(payload.message, history, db, user)

    db.add(models.ChatMessage(
        user_id=user.id if user else None,
        session_id=session_id,
        role="assistant",
        content=result["reply"],
    ))
    db.commit()

    return {
        "session_id": session_id,
        "reply": result["reply"],
        "sources": result.get("sources", []),
    }


# ---------- SEMANTIC SEARCH ----------
@router.post("/semantic-search", response_model=list[schemas.ProductRead])
def semantic_search(
    payload: schemas.SemanticSearchRequest,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(_optional_user),
):
    results = rag.retrieve_products(db, payload.query, k=payload.limit)
    # log
    try:
        sid = request.headers.get("X-Session-Id")
        db.add(models.SearchHistory(
            user_id=user.id if user else None,
            session_id=sid,
            query=(payload.query or "")[:200],
            result_count=len(results),
        ))
        db.commit()
    except Exception:
        db.rollback()
    return results


# ---------- RECOMMENDATIONS ----------
@router.get("/recommendations", response_model=list[schemas.ProductRead])
def recommendations(
    request: Request,
    limit: int = 8,
    db: Session = Depends(get_db),
    user=Depends(_optional_user),
):
    """Hybrid recommender blending purchases + searches + product views.

    Strategy:
      1. Gather signals (purchases, recent searches, recent views).
      2. Build a 'taste profile' string from them.
      3. Semantically retrieve similar products, filter out already-purchased.
      4. Fall back to featured / newest when there's no signal.
    """
    sid = request.headers.get("X-Session-Id")
    purchased_ids: set[int] = set()
    profile_parts: list[str] = []

    if user:
        orders = (
            db.query(models.Order)
            .filter(models.Order.user_id == user.id)
            .order_by(models.Order.order_id.desc())
            .limit(20)
            .all()
        )
        purchased_ids = {o.product_id for o in orders}
        if purchased_ids:
            past = (
                db.query(models.Product)
                .filter(models.Product.id.in_(list(purchased_ids)))
                .all()
            )
            profile_parts += [f"{p.name} {(p.description or '')[:80]}" for p in past]

    # Search history (user OR session)
    sh_q = db.query(models.SearchHistory).order_by(models.SearchHistory.id.desc())
    if user:
        sh_q = sh_q.filter(models.SearchHistory.user_id == user.id)
    elif sid:
        sh_q = sh_q.filter(models.SearchHistory.session_id == sid)
    else:
        sh_q = None
    if sh_q is not None:
        recent_searches = sh_q.limit(15).all()
        # weight searches by repeating them
        profile_parts += [s.query for s in recent_searches if s.query]

    # Product views
    pv_q = db.query(models.ProductView).order_by(models.ProductView.id.desc())
    if user:
        pv_q = pv_q.filter(models.ProductView.user_id == user.id)
    elif sid:
        pv_q = pv_q.filter(models.ProductView.session_id == sid)
    else:
        pv_q = None
    viewed_ids: set[int] = set()
    if pv_q is not None:
        recent_views = pv_q.limit(20).all()
        viewed_ids = {v.product_id for v in recent_views}
        if viewed_ids:
            viewed = (
                db.query(models.Product)
                .filter(models.Product.id.in_(list(viewed_ids)))
                .all()
            )
            profile_parts += [f"{p.name} {(p.description or '')[:60]}" for p in viewed]

    # Empty signal -> featured / newest
    if not profile_parts:
        featured = (
            db.query(models.Product)
            .filter(models.Product.is_featured.is_(True))
            .limit(limit)
            .all()
        )
        if featured:
            return featured
        return db.query(models.Product).order_by(models.Product.created_at.desc()).limit(limit).all()

    profile = " ".join(profile_parts)[:1500]
    candidates = rag.retrieve_products(db, profile, k=limit * 4)
    # exclude things they've already bought; lightly de-prioritise recently viewed by appending at end
    fresh = [p for p in candidates if p.id not in purchased_ids and p.id not in viewed_ids]
    seen = [p for p in candidates if p.id in viewed_ids and p.id not in purchased_ids]
    ordered = fresh + seen
    if not ordered:
        return db.query(models.Product).order_by(models.Product.created_at.desc()).limit(limit).all()
    return ordered[:limit]


@router.get("/related/{product_id}", response_model=list[schemas.ProductRead])
def related_products(product_id: int, limit: int = 6, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    text = f"{p.name} {p.description or ''}"
    results = rag.retrieve_products(db, text, k=limit + 1)
    return [r for r in results if r.id != product_id][:limit]


# ---------- AI DESCRIPTION GENERATOR ----------
@router.post("/generate-description", response_model=schemas.AIDescriptionResponse)
def generate_description(
    payload: schemas.AIDescriptionRequest,
    _=Depends(require_roles("admin", "seller")),
):
    if not llm.is_configured():
        raise HTTPException(503, "AI not configured. Set GROQ_API_KEY in .env.")
    prompt = f"""Write a compelling, concise product description (3-4 sentences, ~60 words) for an e-commerce listing.

Product name: {payload.name}
Category: {payload.category or 'general'}
Keywords / features: {payload.keywords or 'none provided'}

Tone: friendly, confident, benefit-focused. Do NOT use markdown or headings. No emojis. Just the description text."""
    out = llm.chat(
        [
            {"role": "system", "content": "You are an expert e-commerce copywriter."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=200,
    )
    return {"description": out["content"].strip()}


# ---------- VECTOR INDEX ADMIN ----------
@router.post("/reindex")
def reindex(
    db: Session = Depends(get_db),
    _=Depends(require_roles("admin")),
):
    count = embeddings.build_index(db)
    return {"indexed": count}

