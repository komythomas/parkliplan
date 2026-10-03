# Autonomous Striping Robotics — GeoJSON Ingestion Specification

## 1. Overview & Operational Context

Autonomous pavement marking robots (such as the **10Lines C-series**) execute line striping by converting vector plans into localized physical trajectory waypoints. The robot relies on RTK-GNSS (Real-Time Kinematic GNSS) centimeter-level positioning, IMUs, and wheel encoders to track designed paths.

**Parkliplan** outputs standardized **RFC 7946 GeoJSON FeatureCollections** tailored directly for autonomous mission planning software. This document formalizes the data contract between Parkliplan exports and robotic vehicle control systems.

---

## 2. Spatial Reference & Precision Contract

| Parameter | Specification | Engineering Requirement |
|:---|:---|:---|
| **Coordinate Reference System (CRS)** | **EPSG:4326 (WGS84)** | Standard ellipsoidal geographic coordinates. |
| **Coordinate Axis Ordering** | `[longitude, latitude]` | Strict RFC 7946 compliance (Easting before Northing). |
| **Decimal Precision** | **7 decimal places** | Resolves to $\approx 1.1\text{ cm}$ at $59.4^\circ\text{ N}$, matching RTK-GNSS precision. |
| **Elevation / Altitude** | Omitted (2D Planar) | Assumed local asphalt surface tangent plane. |
| **Topology Tolerance** | $\le 12\text{ px}$ capture | Snapped vertices share exact identical coordinate tuples. |

---

## 3. Feature Schema Definition

Each geometric element exported from Parkliplan carries operational metadata in its `properties` block:

### Common Properties Schema

```typescript
interface RoboticFeatureProperties {
  id: string;             // Unique identifier (e.g., "line-1728145920123")
  type: 'LineString' | 'Polygon';
  length_m: number;       // Ground-truth WGS84 geodesic length in meters
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
   - Demarcates safety buffers, pedestrian aisles, handicapped zones, and EV charging bays.
   - Robotic trajectory planners parse polygons into infill raster/hatching patterns.

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

## 5. Robotic Trajectory Generation Pipeline

Autonomous striping robots process Parkliplan GeoJSON through the following sequential pipeline:

```
[Parkliplan GeoJSON (WGS84)]
            │
            ▼
[RTK-GNSS Local Frame Projection (ENU / Tangent Plane)]
            │
            ▼
[Toolpath Optimization & Turn Smoothing (Dubins / Reeds-Shepp Paths)]
            │
            ▼
[Nozzle Actuation Control (Speed-Proportional Paint Valve)]
            │
            ▼
[Closed-Loop Odometry Verification (Dead-Reckoning vs length_m)]
```

### 1. Local Frame Projection (ENU)
The robot's base station establishes a local **East-North-Up (ENU)** Cartesian coordinate frame at reference origin $(\phi_0, \lambda_0)$. Incoming GeoJSON coordinates $(\phi, \lambda)$ are converted via standard geodetic transformation:

$$x = R \cdot (\lambda - \lambda_0) \cdot \cos(\phi_0)$$
$$y = R \cdot (\phi - \phi_0)$$

### 2. Path Generation & Nozzle Synchronization
- **Waypoints**: Centerline coordinates provide the steering targets for autonomous path-following algorithms (Pure Pursuit or Model Predictive Control).
- **Actuation**: The paint nozzle opens upon reaching coordinate $P_0$ (within $\pm 2.0\text{ cm}$ positional tolerance) and shuts off at $P_N$.
- **Speed-Proportional Dispensing**: Paint pump flow is automatically throttled relative to wheel speed ($v_{\text{robot}}$) to guarantee uniform dry film thickness (DFT).

### 3. Verification & Odometry Cross-Check
The `length_m` property is stored in mission telemetry logs. As the robot marks each segment, measured wheel odometry is cross-verified against the pre-computed geodesic length to detect wheel slip or paint exhaustion.

---

## 6. Compatibility & Testing

The exported GeoJSON is validated against the official RFC 7946 test suite:
- Tested with **QGIS 3.x** and **ArcGIS Pro**.
- Validated with Pydantic v2 schemas on the backend ([`backend/app/models.py`](file:///e:/Projects/parkliplan/backend/app/models.py)).
- Strict rejection of corrupted topologies with **HTTP 422**.
