import { getLength } from 'ol/sphere';
import Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';

/**
 * Calculates the accurate geodesic ground distance in meters on the WGS84 sphere.
 * This corrects for Web Mercator scale distortion (1/cos(lat)), which inflates
 * measured distances by ~1.96x at northern latitudes (such as Tallinn, Estonia 59.4°N).
 *
 * @param geometry OpenLayers Geometry in EPSG:3857 (Spherical Mercator)
 * @returns Ground distance in meters rounded to 2 decimal places
 */
export function calculateGeodesicLength(geometry: Geometry): number {
  if (!geometry) return 0;
  
  // getLength computes spherical geodesic distance over the ellipsoid/sphere
  const lengthInMeters = getLength(geometry, { projection: 'EPSG:3857' });
  return Math.round(lengthInMeters * 100) / 100;
}

/**
 * Computes the total cumulative length in meters for an array of geometries.
 */
export function calculateTotalGeodesicLength(geometries: Geometry[]): number {
  const total = geometries.reduce((sum, geom) => sum + calculateGeodesicLength(geom), 0);
  return Math.round(total * 10) / 10;
}

/**
 * Formats a metric distance nicely for UI presentation.
 */
export function formatMeters(meters: number): string {
  return `${meters.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
}
