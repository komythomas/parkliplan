"""Parkkiplan FastAPI Entry Point."""
from contextlib import asynccontextmanager
import uuid
from typing import List
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

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

# Initialize slowapi rate limiter based on client IP
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema upon server startup."""
    await init_db()
    yield


app = FastAPI(
    title="Parkkiplan API",
    description="Geospatial Pavement Line Marking and Layout Planning API",
    version="1.0.0",
    lifespan=lifespan,
)

# Attach slowapi rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
@limiter.limit("30/minute")
async def create_or_save_plan(request: Request, payload: PlanCreateRequest):
    """Persists a new plan with its RFC 7946 GeoJSON FeatureCollection."""
    # Payload sanity constraints
    if len(payload.name.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan name cannot be empty.",
        )

    if len(payload.name) > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan name exceeds 120 characters limit.",
        )

    features = payload.geojson.features
    if len(features) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload exceeds maximum limit of 1000 features per plan.",
        )

    plan_id = f"plan-{uuid.uuid4().hex[:10]}"
    features_count = len(features)

    # Compute or aggregate total length from feature properties
    total_length = sum(
        float(f.properties.get("length_m", 0.0)) for f in features
    )
    total_length = round(total_length, 2)

    saved = await save_plan(
        plan_id=plan_id,
        name=payload.name.strip(),
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
@limiter.limit("120/minute")
async def get_plans_list(request: Request):
    """Lists summaries of all persisted plans."""
    return await list_plans()


@app.get(
    "/api/plans/{plan_id}",
    tags=["Plans"],
)
@limiter.limit("120/minute")
async def get_single_plan(request: Request, plan_id: str):
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
@limiter.limit("30/minute")
async def delete_single_plan(request: Request, plan_id: str):
    """Deletes a plan by its ID."""
    deleted = await delete_plan_by_id(plan_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan '{plan_id}' not found.",
        )
    return {"status": "deleted", "id": plan_id}


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
