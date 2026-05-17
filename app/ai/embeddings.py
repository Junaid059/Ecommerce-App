"""Local sentence-transformer embeddings + FAISS vector store for products.

Uses 'all-MiniLM-L6-v2' (384 dim, ~80MB) which is free, fast, and runs on CPU.
Heavy deps are imported lazily so the API starts without them.
"""
import os
import threading
from pathlib import Path
from typing import List, Tuple

try:
    import numpy as np
except ImportError:
    np = None  # type: ignore


_MODEL = None
_LOCK = threading.Lock()
_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


def get_model():
    """Lazy-load the sentence-transformer model on first use."""
    global _MODEL
    if _MODEL is None:
        with _LOCK:
            if _MODEL is None:
                from sentence_transformers import SentenceTransformer

                _MODEL = SentenceTransformer(_MODEL_NAME)
    return _MODEL


def embed_texts(texts: List[str]) -> np.ndarray:
    """Return a (n, dim) float32 array of L2-normalised embeddings."""
    if not texts:
        return np.zeros((0, 384), dtype="float32")
    vecs = get_model().encode(
        texts, normalize_embeddings=True, show_progress_bar=False
    )
    return np.asarray(vecs, dtype="float32")


def embed_query(text: str) -> np.ndarray:
    return embed_texts([text])[0]


# --------- FAISS index ---------

_INDEX = None  # tuple (faiss.IndexFlatIP, list[int] of product ids)
_INDEX_LOCK = threading.Lock()
_INDEX_PATH = Path(os.getenv("VECTOR_INDEX_PATH", "vector_index.faiss"))
_IDS_PATH = Path(os.getenv("VECTOR_INDEX_PATH", "vector_index.faiss")).with_suffix(".ids.npy")


def _product_text(p, category_name: str | None = None) -> str:
    parts = [p.name]
    if category_name:
        parts.append(f"category: {category_name}")
    if p.description:
        parts.append(p.description)
    return " — ".join(parts)


def build_index(db) -> int:
    """Re-build the FAISS index from all products in DB. Returns count."""
    import faiss
    from app.models import models

    products = db.query(models.Product).all()
    if not products:
        with _INDEX_LOCK:
            global _INDEX
            _INDEX = None
        return 0

    cat_map = {c.id: c.name for c in db.query(models.Category).all()}
    texts = [_product_text(p, cat_map.get(p.category)) for p in products]
    vecs = embed_texts(texts)
    dim = vecs.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vecs)
    ids = np.asarray([p.id for p in products], dtype="int64")

    # persist
    try:
        faiss.write_index(index, str(_INDEX_PATH))
        np.save(_IDS_PATH, ids)
    except Exception as e:
        print(f"[vector] warn: could not persist index: {e}")

    with _INDEX_LOCK:
        _INDEX = (index, ids)
    return len(products)


def _load_index():
    import faiss
    global _INDEX
    if _INDEX is not None:
        return _INDEX
    if _INDEX_PATH.exists() and _IDS_PATH.exists():
        try:
            index = faiss.read_index(str(_INDEX_PATH))
            ids = np.load(_IDS_PATH)
            with _INDEX_LOCK:
                _INDEX = (index, ids)
            return _INDEX
        except Exception as e:
            print(f"[vector] could not load persisted index: {e}")
    return None


def search(db, query: str, k: int = 10) -> List[Tuple[int, float]]:
    """Returns [(product_id, score)] for the top-k matches.

    Gracefully falls back to a simple LIKE-based keyword search when FAISS or
    sentence-transformers aren't installed — so the demo still feels alive.
    """
    try:
        idx = _load_index()
        if idx is None:
            count = build_index(db)
            if count == 0:
                return _keyword_fallback(db, query, k)
            idx = _INDEX
        index, ids = idx
        qv = embed_query(query).reshape(1, -1)
        k_eff = min(k, index.ntotal)
        scores, positions = index.search(qv, k_eff)
        return [(int(ids[positions[0][i]]), float(scores[0][i])) for i in range(k_eff) if positions[0][i] != -1]
    except Exception as e:
        print(f"[vector] semantic search unavailable ({e}); falling back to keyword search")
        return _keyword_fallback(db, query, k)


def _keyword_fallback(db, query: str, k: int) -> List[Tuple[int, float]]:
    """Best-effort keyword search when the vector index isn't available.

    Handles category-style queries like "find me best pants" by stripping
    intent stopwords and mapping common product synonyms to category names.
    """
    from app.models import models
    from sqlalchemy import func

    # Strip intent/filler words so "find me the best pants" -> "pants"
    STOP = {
        "find", "me", "the", "best", "good", "great", "show", "search", "for", "a", "an",
        "any", "some", "please", "can", "you", "i", "want", "need", "looking", "to", "buy",
        "get", "give", "with", "and", "or", "of", "in", "on", "is", "are", "be", "my",
        "your", "their", "this", "that", "these", "those", "new", "cheap", "expensive",
        "top", "rated", "popular", "trending",
    }
    # Map common synonyms / plurals to category-style keywords we can match
    SYN = {
        "pants": ["pants", "jeans", "chinos", "trousers", "joggers"],
        "trousers": ["trousers", "pants", "chinos"],
        "jeans": ["jeans", "denim", "pants"],
        "shirts": ["shirt", "tee", "polo", "henley"],
        "shirt": ["shirt", "tee", "polo", "henley"],
        "tees": ["tee", "t-shirt", "shirt"],
        "hoodies": ["hoodie", "hooded", "sweatshirt"],
        "sneakers": ["sneaker", "shoes", "trainers"],
        "shoes": ["shoe", "sneaker", "boots", "loafer"],
        "boots": ["boot"],
        "headphones": ["headphone", "earbud"],
        "earbuds": ["earbud", "headphone"],
        "watch": ["watch", "smartwatch"],
        "laptop": ["laptop", "computer"],
        "bag": ["bag", "backpack", "tote"],
        "backpack": ["backpack", "bag"],
        "phone": ["phone", "case"],
    }

    raw_tokens = [t.strip(".,?!") for t in (query or "").lower().split()]
    tokens: list[str] = []
    for t in raw_tokens:
        if not t or t in STOP:
            continue
        # Expand synonyms
        if t in SYN:
            tokens.extend(SYN[t])
        else:
            tokens.append(t)
    # Deduplicate, keep order
    seen_tok: set[str] = set()
    tokens = [t for t in tokens if not (t in seen_tok or seen_tok.add(t))][:8]

    if not tokens:
        rows = db.query(models.Product).order_by(models.Product.is_featured.desc()).limit(k).all()
        return [(p.id, 0.0) for p in rows]

    # Score: name match (3pts) > category match (2pts) > description match (1pt)
    scores: dict[int, float] = {}

    # Match category names too
    matching_cats = (
        db.query(models.Category.id)
        .filter(func.lower(models.Category.name).in_([t.lower() for t in tokens]))
        .all()
    )
    matching_cat_ids = [c[0] for c in matching_cats]
    if matching_cat_ids:
        rows = db.query(models.Product).filter(models.Product.category.in_(matching_cat_ids)).limit(k * 3).all()
        for p in rows:
            scores[p.id] = scores.get(p.id, 0.0) + 2.0

    for t in tokens:
        like = f"%{t}%"
        # Name matches
        for p in db.query(models.Product).filter(models.Product.name.ilike(like)).limit(k * 2).all():
            scores[p.id] = scores.get(p.id, 0.0) + 3.0
        # Description matches
        for p in db.query(models.Product).filter(models.Product.description.ilike(like)).limit(k * 2).all():
            scores[p.id] = scores.get(p.id, 0.0) + 1.0

    # Boost in-stock and featured
    if scores:
        prods = db.query(models.Product).filter(models.Product.id.in_(list(scores.keys()))).all()
        for p in prods:
            if p.is_featured:
                scores[p.id] += 0.5
            if (p.stock or 0) <= 0:
                scores[p.id] -= 0.3

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:k]
    if ranked:
        return ranked
    rows = db.query(models.Product).order_by(models.Product.is_featured.desc()).limit(k).all()
    return [(p.id, 0.0) for p in rows]
