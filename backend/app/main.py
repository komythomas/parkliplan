"""Parkliplan FastAPI Entry Point."""
from contextlib import asynccontextmanager
import uuid
from typing import List
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    PlanCreateRequest,
    PlanSummaryResponse,
    GeoJSONFeatureCollection,
)
from app.database import (
    init_db,
    save_plan,
    list_plans,
    get_plan_by_id,
    delete_plan_by_id,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema upon server startup."""
    await init_db()
    yield


app = FastAPI(
    title="Parkliplan API",
    description="Geospatial Pavement Line Marking and Layout Planning API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for local development and containerized web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def healthcheck():
    """Healthcheck endpoint verifying backend availability."""
    return {"status": "ok", "service": "parkliplan-api"}


@app.post(
    "/api/plans",
    response_model=PlanSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Plans"],
)
async def create_or_save_plan(payload: PlanCreateRequest):
    """Persists a new plan with its RFC 7946 GeoJSON FeatureCollection."""
    plan_id = f"plan-{uuid.uuid4().hex[:10]}"
    features = payload.geojson.features
    features_count = len(features)

    # Compute or aggregate total length from feature properties
    total_length = sum(
        float(f.properties.get("length_m", 0.0)) for f in features
    )
    total_length = round(total_length, 2)

    saved = await save_plan(
        plan_id=plan_id,
        name=payload.name,
        total_length_m=total_length,
        features_count=features_count,
        geojson_dict=payload.geojson.model_dump(),
    )

    return saved


@app.get(
    "/api/plans",
    response_model=List[PlanSummaryResponse],
    tags=["Plans"],
)
async def get_plans_list():
    """Lists summaries of all persisted plans."""
    return await list_plans()


@app.get(
    "/api/plans/{plan_id}",
    tags=["Plans"],
)
async def get_single_plan(plan_id: str):
    """Retrieves full GeoJSON for a plan by its ID."""
    plan = await get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan '{plan_id}' not found.",
        )
    return plan


@app.delete(
    "/api/plans/{plan_id}",
    tags=["Plans"],
)
async def delete_single_plan(plan_id: str):
    """Deletes a plan by its ID."""
    deleted = await delete_plan_by_id(plan_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan '{plan_id}' not found.",
        )
    return {"status": "deleted", "id": plan_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
