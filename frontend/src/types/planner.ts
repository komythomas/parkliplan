/**
 * Core type definitions for Parkliplan spatial planning engine.
 */

export type BasemapType = 'satellite' | 'osm';

export type DrawingTool = 'select' | 'line' | 'polygon' | 'modify' | 'delete';

export interface PlanFeature {
  id: string;
  type: 'LineString' | 'Polygon';
  coordinates: number[][] | number[][][];
  lengthMeters: number;
  label?: string;
}

export interface PlanMetadata {
  id?: string;
  name: string;
  totalLengthMeters: number;
  featuresCount: number;
  createdAt?: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  geometry: {
    type: 'LineString' | 'Polygon';
    coordinates: number[][] | number[][][];
  };
  properties: {
    id?: string;
    type?: string;
    length_m?: number;
    [key: string]: any;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}
