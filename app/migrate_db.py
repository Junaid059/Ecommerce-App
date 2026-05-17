"""Lightweight in-place schema migration for SQLite.

SQLAlchemy `Base.metadata.create_all()` only creates *missing tables*. When you add
columns to an existing model, the DB silently goes out of sync. This script adds any
missing columns at startup so the demo "just works".

Strategy: for every model in `models.Base`, check the live table's columns vs what
SQLAlchemy expects and `ALTER TABLE ... ADD COLUMN` for each missing column.
SQLite supports ADD COLUMN since 3.2; we render a sensible default for each.

Note: this is intentionally minimal — for a real product use Alembic.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.models import models


def _column_ddl(col) -> str:
    """Render `name TYPE [DEFAULT ...] [NOT NULL]` for SQLite ADD COLUMN."""
    parts = [col.name, str(col.type.compile(dialect=None))]
    type_str = parts[1].upper()
    default = col.default
    server_default = col.server_default

    if server_default is not None:
        parts.append(f"DEFAULT {server_default.arg}")
    elif default is not None and getattr(default, "is_scalar", False):
        v = default.arg
        if isinstance(v, bool):
            parts.append(f"DEFAULT {1 if v else 0}")
        elif isinstance(v, (int, float)):
            parts.append(f"DEFAULT {v}")
        elif isinstance(v, str):
            parts.append(f"DEFAULT '{v}'")
        else:
            # callable like `datetime.utcnow` — SQLite ALTER TABLE only accepts
            # constant defaults, so backfill with a hardcoded epoch timestamp.
            if "DATETIME" in type_str or "TIMESTAMP" in type_str:
                parts.append("DEFAULT '1970-01-01 00:00:00'")
    elif col.nullable is False:
        if "INT" in type_str:
            parts.append("DEFAULT 0")
        elif "BOOL" in type_str:
            parts.append("DEFAULT 0")
        elif "DATETIME" in type_str or "TIMESTAMP" in type_str:
            parts.append("DEFAULT '1970-01-01 00:00:00'")
        else:
            parts.append("DEFAULT ''")
    return " ".join(parts)


def migrate(engine: Engine) -> list[str]:
    """Add missing columns. Returns list of executed ALTER statements."""
    executed: list[str] = []
    insp = inspect(engine)

    for table_name, table in models.Base.metadata.tables.items():
        if not insp.has_table(table_name):
            # create_all() will handle brand-new tables
            continue
        existing = {c["name"] for c in insp.get_columns(table_name)}
        for col in table.columns:
            if col.name in existing:
                continue
            ddl = _column_ddl(col)
            stmt = f"ALTER TABLE {table_name} ADD COLUMN {ddl}"
            try:
                with engine.begin() as conn:
                    conn.execute(text(stmt))
                executed.append(stmt)
                print(f"[migrate] {stmt}")
            except Exception as e:
                print(f"[migrate] FAILED: {stmt} -> {e}")
    return executed


if __name__ == "__main__":
    from app.database import engine
    models.Base.metadata.create_all(bind=engine)
    n = migrate(engine)
    print(f"[migrate] done, {len(n)} column(s) added")
