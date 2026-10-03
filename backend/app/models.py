"""GeoJSON and Plan Pydantic Models conforming to RFC 7946."""
from typing import List, Dict, Any, Optional, Literal, Union
from pydantic import BaseModel, Field


class GeoJSONGeometry(BaseModel):
    """GeoJSON Geometry Object (LineString or Polygon)."""
    type: Literal["LineString", "Polygon"]
    coordinates: Union[List[List[float]], List[List[List[float]]]]


class GeoJSONFeature(BaseModel):
    """GeoJSON Feature Object."""
    type: Literal["Feature"] = "Feature"
    id: Optional[Union[str, int]] = None
    geometry: GeoJSONGeometry
    properties: Dict[str, Any] = Field(default_factory=dict)


class GeoJSONFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection RFC 7946."""
    type: Literal["FeatureCollection"] = "FeatureCollection"
    name: Optional[str] = "Parking Layout Plan"
    features: List[GeoJSONFeature] = Field(default_factory=list)


class PlanCreateRequest(BaseModel):
    """Plan persistence request model."""
    name: str = "Parking Layout Plan"
    geojson: GeoJSONFeatureCollection


class PlanSummaryResponse(BaseModel):
    """Summary representation of a persisted plan."""
    id: str
    name: str
    total_length_m: float
    features_count: int
    created_at: str
