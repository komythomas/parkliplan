"""Asynchronous SQLite Database Engine for Parkliplan."""
import aiosqlite
import json
import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

DB_PATH = os.getenv("DATABASE_PATH", "plans.db")


async def init_db() -> None:
    """Initializes the SQLite database and creates the plans table."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS plans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                total_length_m REAL NOT NULL,
                features_count INTEGER NOT NULL,
                geojson_data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        await db.commit()


async def save_plan(
    plan_id: str,
    name: str,
    total_length_m: float,
    features_count: int,
    geojson_dict: Dict[str, Any],
) -> Dict[str, Any]:
    """Persists a new plan or updates an existing one."""
    created_at = datetime.now(timezone.utc).isoformat()
    geojson_str = json.dumps(geojson_dict)

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT OR REPLACE INTO plans (id, name, total_length_m, features_count, geojson_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (plan_id, name, total_length_m, features_count, geojson_str, created_at),
        )
        await db.commit()

    return {
        "id": plan_id,
        "name": name,
        "total_length_m": total_length_m,
        "features_count": features_count,
        "created_at": created_at,
    }


async def list_plans() -> List[Dict[str, Any]]:
    """Returns a list of all saved plan summaries."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, name, total_length_m, features_count, created_at FROM plans ORDER BY created_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def get_plan_by_id(plan_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full GeoJSON for a plan by its ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, name, total_length_m, features_count, geojson_data, created_at FROM plans WHERE id = ?",
            (plan_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            res["geojson"] = json.loads(res["geojson_data"])
            del res["geojson_data"]
            return res


async def delete_plan_by_id(plan_id: str) -> bool:
    """Deletes a plan by its ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
        await db.commit()
        return cursor.rowcount > 0
