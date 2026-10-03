/**
 * API client for interacting with the Parkliplan FastAPI backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PlanSummary {
  id: string;
  name: string;
  total_length_m: number;
  features_count: number;
  created_at: string;
}

export interface PlanDetailResponse {
  id: string;
  name: string;
  total_length_m: number;
  features_count: number;
  created_at: string;
  geojson: any;
}

/**
 * Saves a plan with its GeoJSON FeatureCollection to the FastAPI SQLite backend.
 */
export async function savePlanToBackend(
  name: string,
  geojson: any
): Promise<PlanSummary> {
  const response = await fetch(`${API_BASE_URL}/api/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      geojson,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save plan (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Fetches the list of all saved plans from the backend.
 */
export async function fetchPlansList(): Promise<PlanSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/plans`);

  if (!response.ok) {
    throw new Error(`Failed to fetch plans (${response.status})`);
  }

  return response.json();
}

/**
 * Fetches a single plan by its ID from the backend.
 */
export async function fetchPlanById(planId: string): Promise<PlanDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/plans/${planId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch plan ${planId} (${response.status})`);
  }

  return response.json();
}

/**
 * Deletes a plan from the backend.
 */
export async function deletePlanFromBackend(planId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/plans/${planId}`, {
    method: 'DELETE',
  });

  return response.ok;
}
