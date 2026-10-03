"""Tests for FastAPI Plan Persistence REST Endpoints."""
from fastapi.testclient import TestClient
from app.main import app


def test_create_and_retrieve_plan():
    """Verify creating a plan persists GeoJSON and allows retrieval."""
    with TestClient(app) as client:
        sample_geojson = {
            "type": "FeatureCollection",
            "name": "Tallinn Test Bay",
            "features": [
                {
                    "type": "Feature",
                    "id": "line-1",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [24.7535, 59.4369],
                            [24.7536, 59.4370],
                        ],
                    },
                    "properties": {
                        "id": "line-1",
                        "type": "LineString",
                        "length_m": 12.5,
                        "label": "Line #1",
                    },
                }
            ],
        }

        # 1. Create plan
        post_res = client.post(
            "/api/plans",
            json={
                "name": "Tallinn Test Bay",
                "geojson": sample_geojson,
            },
        )
        assert post_res.status_code == 201
        data = post_res.json()
        assert "id" in data
        assert data["name"] == "Tallinn Test Bay"
        assert data["total_length_m"] == 12.5
        assert data["features_count"] == 1
        plan_id = data["id"]

        # 2. List plans
        list_res = client.get("/api/plans")
        assert list_res.status_code == 200
        plans_list = list_res.json()
        assert any(p["id"] == plan_id for p in plans_list)

        # 3. Retrieve single plan
        get_res = client.get(f"/api/plans/{plan_id}")
        assert get_res.status_code == 200
        single_plan = get_res.json()
        assert single_plan["id"] == plan_id
        assert single_plan["geojson"]["type"] == "FeatureCollection"
        assert len(single_plan["geojson"]["features"]) == 1
        assert single_plan["geojson"]["features"][0]["properties"]["length_m"] == 12.5

        # 4. Delete plan
        del_res = client.delete(f"/api/plans/{plan_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # 5. Verify 404 after deletion
        not_found_res = client.get(f"/api/plans/{plan_id}")
        assert not_found_res.status_code == 404


def test_reject_corrupted_geojson_geometry():
    """Verify corrupted or invalid geometries are strictly rejected with HTTP 422."""
    with TestClient(app) as client:
        # Invalid geometry type "InvalidType"
        corrupted_payload = {
            "name": "Corrupted Plan",
            "geojson": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {
                            "type": "InvalidType",
                            "coordinates": ["corrupted", "coords"],
                        },
                    }
                ],
            },
        }

        res = client.post("/api/plans", json=corrupted_payload)
        assert res.status_code == 422

