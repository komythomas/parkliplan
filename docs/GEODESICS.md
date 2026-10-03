# WGS84 Spherical Geodesic Metrology & Latitude Scale Correction

## Executive Summary

A critical failure point in naive web-GIS applications is the direct measurement of Euclidean distance in **Web Mercator (EPSG:3857)**. While Web Mercator is the ubiquitous standard for web tile rendering, it introduces an accelerating scale distortion away from the equator.

At the latitude of **Tallinn, Estonia ($59.437^\circ\text{ N}$)**—the operational home base of autonomous striping companies like **10Lines OÜ**—naive planar distance measurements result in a **$+96.7\%$ scale inflation**. A real-world $5.00\text{ m}$ parking stall divider measures $\approx 9.83\text{ m}$ on the projected plane.

**Parkliplan** implements real-time spherical geodesic integration via `ol/sphere.getLength`, computing physical ground distance on a sphere of radius $R = 6{,}371{,}008.8\text{ m}$. This eliminates the Mercator scale error entirely. The deviation between a spherical great-circle calculation and a true WGS84 ellipsoidal calculation is less than **0.5 %** for the segment lengths encountered in parking lot planning — well within the accuracy limits imposed by satellite imagery resolution and mouse-click precision.

---

## 1. The Mercator Scale Distortion Problem

Web Mercator maps the spherical Earth onto a flat cylinder tangent at the equator. While angles are preserved locally (conformal projection), areas and linear scales expand with latitude according to the secant of the geodetic latitude $\phi$:

$$k(\phi) = \sec(\phi) = \frac{1}{\cos(\phi)}$$

Where:
- $\phi$ is the geodetic latitude.
- $k(\phi)$ is the linear scale factor representing the ratio between projected Mercator distance and true ground distance on Earth.

### Latitude Distortion Comparison Table

| Location | Latitude ($\phi$) | Scale Factor ($k$) | Naive Cartesian Measurement of a 5.0m Stall | Error Percentage |
|:---|:---:|:---:|:---:|:---:|
| **Equator** | $0.00^\circ$ | $1.0000$ | $5.00\text{ m}$ | **$0.0\%$** |
| **Austin, Texas (US)** | $30.26^\circ\text{ N}$ | $1.1578$ | $5.79\text{ m}$ | **$+15.8\%$** |
| **Paris, France** | $48.85^\circ\text{ N}$ | $1.5197$ | $7.60\text{ m}$ | **$+52.0\%$** |
| **Berlin, Germany** | $52.52^\circ\text{ N}$ | $1.6433$ | $8.22\text{ m}$ | **$+64.3\%$** |
| **Tallinn, Estonia** | **$59.437^\circ\text{ N}$** | **$1.9670$** | **$9.83\text{ m}$** | **$+96.7\%$** |
| **Stockholm / Helsinki** | $60.16^\circ\text{ N}$ | $2.0097$ | $10.05\text{ m}$ | **$+101.0\%$** |
| **Oulu, Northern Finland** | $65.01^\circ\text{ N}$ | $2.3670$ | $11.83\text{ m}$ | **$+136.7\%$** |

> [!CAUTION]
> Feeding uncorrected Web Mercator distance metrics into an autonomous vehicle would cause paint tanks to run empty in half the calculated distance, double the project cost estimates, and corrupt robotic dead-reckoning algorithms.

---

## 2. Geodesic Calculation Engine

Parkliplan calculates distances using great-circle integration over a sphere of radius $R = 6{,}371{,}008.8\text{ m}$ (the mean radius used by OpenLayers `ol/sphere`).

> **Note on precision**: `ol/sphere.getLength` uses a spherical model, not the WGS84 ellipsoid. For the short segment lengths typical in parking-lot planning (5–100 m), the spherical approximation differs from a rigorous ellipsoidal calculation by less than 0.5 %. This is negligible compared to the positional uncertainty introduced by clicking on satellite imagery, which is typically 20–50 cm or more.

### Mathematical Formulation: The Haversine / Great-Circle Metric

For two points on the sphere $P_1(\phi_1, \lambda_1)$ and $P_2(\phi_2, \lambda_2)$, the central angle $\Delta\sigma$ is calculated by:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$

The true ground geodesic distance $d$ is:

$$d = R \cdot \Delta\sigma$$

For polylines with $N$ vertices:

$$d_{\text{total}} = \sum_{i=1}^{N-1} d(P_i, P_{i+1})$$

---

## 3. Implementation in Parkliplan (`metrics.ts`)

```typescript
import { getLength } from 'ol/sphere';
import Geometry from 'ol/geom/Geometry';

/**
 * Calculates spherical geodesic ground distance in meters.
 * Corrects for Web Mercator scale distortion (1/cos(lat)).
 * Deviation from a rigorous ellipsoidal calculation: < 0.5 % for
 * segment lengths below 1 km.
 *
 * @param geometry OpenLayers Geometry in EPSG:3857 (Spherical Mercator)
 * @returns Ground distance in meters rounded to 2 decimal places
 */
export function calculateGeodesicLength(geometry: Geometry): number {
  if (!geometry) return 0;
  
  // Computes spherical geodesic distance on the mean-radius sphere
  const lengthInMeters = getLength(geometry, { projection: 'EPSG:3857' });
  return Math.round(lengthInMeters * 100) / 100;
}
```

---

## 4. Automated Verification Test Suite

Parkliplan enforces this precision through automated Vitest tests ([`metrics.test.ts`](file:///e:/Projects/parkliplan/frontend/tests/metrics.test.ts)):

```typescript
it('correctly calculates ground-truth distance at high latitude (Tallinn 59.4°N) avoiding Mercator inflation', () => {
  const lon = 24.753574;
  const lat1 = 59.436960;
  
  // 1 degree latitude ~ 111,139 m. Exactly 5.0m ground delta:
  const deltaLat = 5.0 / 111139.0;
  const lat2 = lat1 + deltaLat;

  const p1 = fromLonLat([lon, lat1]);
  const p2 = fromLonLat([lon, lat2]);
  const line = new LineString([p1, p2]);

  // Naive Cartesian measurement would yield ~9.83m
  const naiveCartesianLength = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  expect(naiveCartesianLength).toBeGreaterThan(9.0);

  // Geodesic measurement MUST yield 5.00 m ± 0.05 m
  const geodesicLength = calculateGeodesicLength(line);
  expect(geodesicLength).toBeGreaterThanOrEqual(4.95);
  expect(geodesicLength).toBeLessThanOrEqual(5.05);
});
```

---

## 5. Summary & Key Takeaways

1. **Projection vs Calculation**: Rendering is executed in `EPSG:3857` for maximum web performance with Esri and OSM raster tiles, while all measurements and exports are computed using spherical great-circle integration.
2. **Practical Accuracy**: The spherical model agrees with the WGS84 ellipsoid to within 0.5 % for short segments. The dominant source of error in practice is the operator's click precision on the map, which is typically ±20–50 cm depending on zoom level and imagery resolution.
3. **Nordic-Ready**: Tailored specifically for high-latitude deployments in Estonia, Scandinavia, Canada, and Northern US states where Mercator distortion exceeds 100 %.
