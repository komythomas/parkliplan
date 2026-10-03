/**
 * Core type definitions for Parkkiplan spatial planning engine.
 */

export type BasemapType = 'satellite' | 'osm';

export type DrawingTool = 'select' | 'line' | 'polygon' | 'modify' | 'delete';

export type MarkingType = 'standard' | 'prm' | 'safety' | 'ev';

export interface MarkingConfig {
  id: MarkingType;
  label: string;
  color: string;
  badgeLabel: string;
  description: string;
}

export const MARKING_CONFIGS: Record<MarkingType, MarkingConfig> = {
  standard: {
    id: 'standard',
    label: 'Standard (White)',
    color: '#ffffff',
    badgeLabel: 'White',
    description: 'Standard parking stalls and traffic lanes',
  },
  prm: {
    id: 'prm',
    label: 'PRM / Disabled (Blue)',
    color: '#38bdf8',
    badgeLabel: 'Blue PMR',
    description: 'Accessible & disabled parking bays',
  },
  safety: {
    id: 'safety',
    label: 'Safety / Loading (Yellow)',
    color: '#facc15',
    badgeLabel: 'Yellow Safety',
    description: 'Loading zones, hatching & no parking',
  },
  ev: {
    id: 'ev',
    label: 'EV Charging (Green)',
    color: '#4ade80',
    badgeLabel: 'Green EV',
    description: 'Electric vehicle charging bays',
  },
};

export interface PlanFeature {
  id: string;
  type: 'LineString' | 'Polygon';
  coordinates: number[][] | number[][][];
  lengthMeters: number;
  label?: string;
  markingType?: MarkingType;
  color?: string;
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
    marking_type?: MarkingType;
    color?: string;
    [key: string]: any;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}
