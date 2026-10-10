import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

from app.config import load_settings
from app.models import CorporateEvent, NewsItem


def _database_path() -> Path:
    path = load_settings().data_dir / "state" / "seen.db"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(_database_path())
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS seen (
            id TEXT PRIMARY KEY,
            tipo TEXT NOT NULL,
            visto_em TEXT NOT NULL
        )
        """
    )
    connection.commit()
    return connection


def _item_type(item: NewsItem | CorporateEvent) -> str:
    if isinstance(item, NewsItem):
        return "noticia"
    if isinstance(item, CorporateEvent):
        return "evento_corporativo"
    raise TypeError(f"tipo de item nao suportado: {type(item).__name__}")


def filter_new(items: Iterable[NewsItem | CorporateEvent]) -> list[NewsItem | CorporateEvent]:
    """Retorna apenas itens que ainda nao foram marcados como vistos."""
    materialized = list(items)
    if not materialized:
        return []
    with _connect() as connection:
        ids = [item.id for item in materialized]
        placeholders = ",".join("?" for _ in ids)
        rows = connection.execute(
            f"SELECT id FROM seen WHERE id IN ({placeholders})", ids
        ).fetchall()
    seen_ids = {row[0] for row in rows}
    return [item for item in materialized if item.id not in seen_ids]


def mark_seen(items: Iterable[NewsItem | CorporateEvent]) -> None:
    """Marca itens como vistos depois do processamento bem-sucedido."""
    materialized = list(items)
    if not materialized:
        return
    timestamp = datetime.now(timezone.utc).isoformat()
    rows = [(item.id, _item_type(item), timestamp) for item in materialized]
    with _connect() as connection:
        connection.executemany(
            "INSERT OR REPLACE INTO seen (id, tipo, visto_em) VALUES (?, ?, ?)",
            rows,
        )
        connection.commit()


def prune(dias: int = 30) -> int:
    """Remove registros antigos e retorna a quantidade removida."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()
    with _connect() as connection:
        cursor = connection.execute("DELETE FROM seen WHERE visto_em < ?", (cutoff,))
        connection.commit()
        return cursor.rowcount
