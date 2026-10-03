import { describe, it, expect } from 'vitest';
import {
  generateCSVContent,
  generateGeoJSONString,
  sanitizeFilename,
} from '../src/utils/export';
import { PlanFeature } from '../src/types/planner';

describe('Direct Export Engine Tests (CAP-5 & Stories #4, #6)', () => {
  const sampleFeatures: PlanFeature[] = [
    {
      id: 'line-1',
      type: 'LineString',
      coordinates: [
        [2755250, 8272800],
        [2755260, 8272810],
      ],
      lengthMeters: 14.5,
      label: 'Stall Divider #1',
    },
    {
      id: 'line-2',
      type: 'LineString',
      coordinates: [
        [2755270, 8272800],
        [2755280, 8272810],
      ],
      lengthMeters: 5.0,
      label: 'Stall Divider #2',
    },
    {
      id: 'zone-1',
      type: 'Polygon',
      coordinates: [
        [
          [2755250, 8272800],
          [2755260, 8272800],
          [2755260, 8272810],
          [2755250, 8272810],
          [2755250, 8272800],
        ],
      ],
      lengthMeters: 28.2,
      label: 'Safety Zone A',
    },
  ];

  it('generates structured CSV with headers, individual feature lengths, and cumulative total', () => {
    const total = 47.7;
    const csv = generateCSVContent(sampleFeatures, total);

    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,type,length_meters');
    expect(lines[1]).toBe('line-1,LineString,14.5');
    expect(lines[2]).toBe('line-2,LineString,5.0');
    expect(lines[3]).toBe('zone-1,Polygon,28.2');
    expect(lines[4]).toBe('TOTAL,,47.7');
  });

  it('generates RFC 7946 GeoJSON FeatureCollection with properties and geometry intact', () => {
    const jsonStr = generateGeoJSONString(null, sampleFeatures, 'Tallinn Test Bay');
    const parsed = JSON.parse(jsonStr);

    expect(parsed.type).toBe('FeatureCollection');
    expect(parsed.name).toBe('Tallinn Test Bay');
    expect(parsed.features).toHaveLength(3);

    // Feature 1 validation
    const f1 = parsed.features[0];
    expect(f1.type).toBe('Feature');
    expect(f1.id).toBe('line-1');
    expect(f1.geometry.type).toBe('LineString');
    expect(f1.properties.length_m).toBe(14.5);
    expect(f1.properties.label).toBe('Stall Divider #1');

    // Polygon Feature validation
    const f3 = parsed.features[2];
    expect(f3.type).toBe('Feature');
    expect(f3.geometry.type).toBe('Polygon');
    expect(f3.properties.length_m).toBe(28.2);
  });

  it('sanitizes plan names safely for file exports', () => {
    expect(sanitizeFilename('Tallinn Logistics Bay Layout #1!')).toBe('tallinn-logistics-bay-layout-1');
    expect(sanitizeFilename('   ')).toBe('parkliplan');
    expect(sanitizeFilename('Parking-Area_2026')).toBe('parking-area-2026');
  });
});
