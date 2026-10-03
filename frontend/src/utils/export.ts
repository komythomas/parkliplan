import GeoJSON from 'ol/format/GeoJSON';
import VectorSource from 'ol/source/Vector';
import { PlanFeature } from '../types/planner';

/**
 * Downloads a text or JSON/CSV blob to the user's browser.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Normalizes a plan name for file naming.
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'parkliplan';
}

/**
 * Generates an RFC 7946 GeoJSON FeatureCollection string from an OpenLayers VectorSource or PlanFeatures.
 * Coordinates are projected to EPSG:4326 (WGS84) [longitude, latitude].
 */
export function generateGeoJSONString(
  vectorSource: VectorSource | null,
  features: PlanFeature[],
  planName: string
): string {
  if (vectorSource && vectorSource.getFeatures().length > 0) {
    const format = new GeoJSON();
    const geojsonObject = format.writeFeaturesObject(vectorSource.getFeatures(), {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326',
    });

    // Ensure all features have required properties per RFC 7946 and Cap-5
    geojsonObject.features = geojsonObject.features.map((f: any, i: number) => {
      const matching = features.find((item) => String(item.id) === String(f.id));
      return {
        ...f,
        properties: {
          ...f.properties,
          id: f.id || matching?.id || `feat-${i + 1}`,
          type: f.geometry?.type || matching?.type || 'LineString',
          length_m: matching ? matching.lengthMeters : (f.properties?.length_m ?? 0),
          label: matching?.label || `Element #${i + 1}`,
          marking_type: matching?.markingType || f.properties?.markingType || 'standard',
          color: matching?.color || f.properties?.color || '#ffffff',
          plan_name: planName,
        },
      };
    });

    return JSON.stringify(geojsonObject, null, 2);
  }

  // Fallback: build GeoJSON from PlanFeature array if vectorSource is empty or not provided
  const featureCollection = {
    type: 'FeatureCollection',
    name: planName,
    features: features.map((f) => ({
      type: 'Feature',
      id: f.id,
      geometry: {
        type: f.type,
        coordinates: f.coordinates,
      },
      properties: {
        id: f.id,
        type: f.type,
        length_m: f.lengthMeters,
        label: f.label || f.id,
        marking_type: f.markingType || 'standard',
        color: f.color || '#ffffff',
        plan_name: planName,
      },
    })),
  };

  return JSON.stringify(featureCollection, null, 2);
}

/**
 * Generates structured CSV content with individual feature rows and cumulative total.
 * If unitCostEur is provided, includes marking classification and cost estimates.
 */
export function generateCSVContent(
  features: PlanFeature[],
  totalLengthMeters: number,
  unitCostEur?: number
): string {
  if (unitCostEur !== undefined && unitCostEur > 0) {
    const headers = 'id,type,marking_type,length_meters,cost_eur';
    const rows = features.map((f) => {
      const cost = (f.lengthMeters * unitCostEur).toFixed(2);
      return `${f.id},${f.type},${f.markingType || 'standard'},${f.lengthMeters.toFixed(1)},${cost}`;
    });
    const totalCost = (totalLengthMeters * unitCostEur).toFixed(2);
    const totalRow = `TOTAL,,,${totalLengthMeters.toFixed(1)},${totalCost}`;

    return [headers, ...rows, totalRow].join('\n');
  }

  const headers = 'id,type,length_meters';
  const rows = features.map((f) => `${f.id},${f.type},${f.lengthMeters.toFixed(1)}`);
  const totalRow = `TOTAL,,${totalLengthMeters.toFixed(1)}`;

  return [headers, ...rows, totalRow].join('\n');
}

/**
 * Triggers browser download of the GeoJSON file.
 */
export function exportGeoJSON(
  vectorSource: VectorSource | null,
  features: PlanFeature[],
  planName: string
): boolean {
  if (!features || features.length === 0) {
    return false;
  }

  const jsonStr = generateGeoJSONString(vectorSource, features, planName);
  const filename = `${sanitizeFilename(planName)}-${Date.now()}.geojson`;
  downloadFile(jsonStr, filename, 'application/geo+json;charset=utf-8');
  return true;
}

/**
 * Triggers browser download of the CSV summary file.
 */
export function exportCSV(
  features: PlanFeature[],
  totalLengthMeters: number,
  planName: string,
  unitCostEur?: number
): boolean {
  if (!features || features.length === 0) {
    return false;
  }

  const csvContent = generateCSVContent(features, totalLengthMeters, unitCostEur);
  const filename = `${sanitizeFilename(planName)}-${Date.now()}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
  return true;
}
