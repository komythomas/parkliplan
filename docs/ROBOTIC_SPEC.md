# Autonomous Striping Robotics — GeoJSON Ingestion Specification

> **Hypothetical design notes.** This document describes a plausible GeoJSON ingestion pipeline for an autonomous pavement-marking robot and is intended to illustrate how Parkkiplan exports could be consumed by such a system. It is not based on internal documentation from 10Lines OÜ or any other company, and it does not describe the actual behaviour of any real product.

---

## 1. Overview & Operational Context

Autonomous pavement marking robots execute line striping by converting vector plans into localized physical trajectory waypoints. A typical system relies on RTK-GNSS centimeter-level positioning, IMUs, and wheel encoders to follow designed paths.

**Parkkiplan** outputs standardized **RFC 7946 GeoJSON FeatureCollections** suited for autonomous mission planning software. This document describes a hypothetical data contract between Parkkiplan exports and a robotic vehicle control system.

---

## 2. Spatial Reference & Precision Contract

| Parameter | Specification | Engineering Requirement |
|:---|:---|:---|
| **Coordinate Reference System (CRS)** | **EPSG:4326 (WGS84)** | Standard geographic coordinates. |
| **Coordinate Axis Ordering** | `[longitude, latitude]` | Strict RFC 7946 compliance (Easting before Northing). |
| **Decimal Precision** | **7 decimal places** | Resolves to $\approx 1.1\text{ cm}$ at $59.4^\circ\text{ N}$, consistent with RTK-GNSS precision. |
| **Elevation / Altitude** | Omitted (2D Planar) | Assumed local asphalt surface tangent plane. |
| **Topology Tolerance** | $\le 12\text{ px}$ capture | Snapped vertices share exact identical coordinate tuples. |

---

## 3. Feature Schema Definition

Each geometric element exported from Parkkiplan carries operational metadata in its `properties` block:

### Common Properties Schema

```typescript
interface RoboticFeatureProperties {
  id: string;             // Unique identifier (e.g., "line-1728145920123")
  type: 'LineString' | 'Polygon';
  length_m: number;       // Ground-truth spherical geodesic length in meters
  label: string;          // Operator designation (e.g., "Stall Line #4")
  plan_name: string;      // Site layout identifier
  stroke_width_cm?: number; // Optional spray nozzle width (default: 10.0 cm)
}
```

### Feature Semantics

1. **`LineString` (Striping Toolpaths)**:
   - Represents physical paint markings: stall dividers, perimeter lines, lane markers, and directional markings.
   - Vertices define the centerline of the paint nozzle trajectory.
2. **`Polygon` (Zoned Regions & Hatched Areas)**:
   - Demarcates safety buffers, pedestrian aisles, accessible spaces, and EV charging bays.
   - Robotic trajectory planners could parse polygons into infill raster/hatching patterns.

---

## 4. Sample RFC 7946 Payload

```json
{
  "type": "FeatureCollection",
  "name": "Tallinn Logistics Hub - Bay 3",
  "features": [
    {
      "type": "Feature",
      "id": "line-1728145920101",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [24.7937105, 59.4225120],
          [24.7937850, 59.4225600]
        ]
      },
      "properties": {
        "id": "line-1728145920101",
        "type": "LineString",
        "length_m": 6.5,
        "label": "Stall Divider #1",
        "plan_name": "Tallinn Logistics Hub - Bay 3"
      }
    },
    {
      "type": "Feature",
      "id": "zone-1728145920202",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [24.7937000, 59.4225000],
            [24.7937500, 59.4225000],
            [24.7937500, 59.4225300],
            [24.7937000, 59.4225300],
            [24.7937000, 59.4225000]
          ]
        ]
      },
      "properties": {
        "id": "zone-1728145920202",
        "type": "Polygon",
        "length_m": 12.8,
        "label": "Pedestrian Safety Zone A",
        "plan_name": "Tallinn Logistics Hub - Bay 3"
      }
    }
  ]
}
```

---

## 5. Hypothetical Trajectory Generation Pipeline

The following pipeline illustrates how a robot might consume Parkkiplan GeoJSON. Implementation details would vary by platform.

```
[Parkkiplan GeoJSON (WGS84)]
            │
            ▼
[Local Frame Projection (ENU / Tangent Plane)]
            │
            ▼
[Toolpath Optimization & Turn Smoothing]
            │
            ▼
[Nozzle Actuation Control]
            │
            ▼
[Odometry Verification vs length_m]
```

### Local Frame Projection (ENU)

A base station could establish a local **East-North-Up (ENU)** Cartesian coordinate frame at reference origin $(\phi_0, \lambda_0)$. Incoming GeoJSON coordinates $(\phi, \lambda)$ would be converted via:

$$x = R \cdot (\lambda - \lambda_0) \cdot \cos(\phi_0)$$
$$y = R \cdot (\phi - \phi_0)$$

---

## 6. Compatibility & Testing

The exported GeoJSON is validated against the official RFC 7946 test suite:
- Tested with **QGIS 3.x** and **ArcGIS Pro**.
- Validated with Pydantic v2 schemas on the backend ([`backend/app/models.py`](file:///e:/Projects/parkliplan/backend/app/models.py)).
- Strict rejection of corrupted topologies with **HTTP 422**.
