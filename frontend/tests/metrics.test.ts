import { describe, it, expect } from 'vitest';
import LineString from 'ol/geom/LineString';
import { fromLonLat } from 'ol/proj';
import { calculateGeodesicLength, formatMeters } from '../src/utils/metrics';

describe('Geodesic Metric Precision Tests (AD-1 & CAP-3)', () => {
  it('correctly calculates ground-truth distance at high latitude (Tallinn 59.4°N) avoiding Mercator inflation', () => {
    // Coordinates near Tallinn, Estonia (59.437° N, 24.753° E)
    // A north-south line segment of exactly 5.0 meters on Earth ground
    const lon = 24.753574;
    const lat1 = 59.436960;
    // 1 degree latitude ~ 111,139 meters. 5.0 meters = 5.0 / 111139 degrees ~ 0.0000450°
    const deltaLat = 5.0 / 111139.0;
    const lat2 = lat1 + deltaLat;

    // Convert both endpoints to Web Mercator (EPSG:3857)
    const p1 = fromLonLat([lon, lat1]);
    const p2 = fromLonLat([lon, lat2]);

    const line = new LineString([p1, p2]);

    // Naive Cartesian measurement would yield ~9.8m (1.96x inflation at lat 59.4°)
    const naiveCartesianLength = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    expect(naiveCartesianLength).toBeGreaterThan(9.0); // Verifying the distortion exists

    // Geodesic calculation via ol/sphere MUST yield 5.0 meters (within ±0.05 m tolerance)
    const geodesicLength = calculateGeodesicLength(line);
    expect(geodesicLength).toBeGreaterThanOrEqual(4.95);
    expect(geodesicLength).toBeLessThanOrEqual(5.05);
  });

  it('formats metric distances with standard spacing and units', () => {
    expect(formatMeters(5)).toBe('5.0 m');
    expect(formatMeters(124.56)).toBe('124.6 m');
  });
});
