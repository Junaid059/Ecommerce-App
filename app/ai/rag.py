"""Retrieval helpers used by the chatbot for grounded answers (RAG)."""
from app.models import models
from app.ai import embeddings


def retrieve_products(db, query: str, k: int = 5):
    """Return product objects most semantically relevant to the query."""
    hits = embeddings.search(db, query, k=k)
    if not hits:
        return []
    id_to_score = {pid: s for pid, s in hits}
    products = (
        db.query(models.Product)
        .filter(models.Product.id.in_(list(id_to_score.keys())))
        .all()
    )
    products.sort(key=lambda p: -id_to_score.get(p.id, 0))
    return products


def format_product_context(products) -> str:
    if not products:
        return "(no matching products in catalog)"
    lines = []
    for p in products:
        lines.append(
            f"- [#{p.id}] {p.name} | ${p.price} | stock {p.stock} | "
            f"{(p.description or '')[:140]}"
        )
    return "\n".join(lines)
