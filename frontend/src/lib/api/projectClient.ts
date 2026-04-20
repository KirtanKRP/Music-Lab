import { API_BASE_URL } from "@/lib/constants/index";

/**
 * Payload shape matching the Java MusicProject POJO.
 * This is what gets serialized via ObjectOutputStream on the backend.
 */
export interface MusicProjectPayload {
  projectId: string;
  userId: string;
  projectName: string;
  bpm: number;
  tracks: {
    trackId: string;
    name: string;
    volume: number;
    isMuted: boolean;
    regions: {
      sampleId: string;
      startTime: number;
      duration: number;
      audioFileUrl: string;
    }[];
  }[];
}

export interface SaveProjectResponse {
  status: string;
  message: string;
  projectId: string;
  projectName: string;
}

/**
 * Saves a MusicProject to the Java backend.
 * The backend will:
 *   1. Deserialize JSON → MusicProject POJO (Jackson)
 *   2. Serialize MusicProject → byte[] via ObjectOutputStream (Unit 2)
 *   3. Persist byte[] to PostgreSQL as BYTEA within @Transactional (Unit 4)
 *
 * @param projectData - The project payload matching the Java POJO structure
 */
export async function saveProject(projectData: MusicProjectPayload): Promise<SaveProjectResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(projectData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Save failed" }));
    throw new Error(error.message || `Save failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Loads a saved MusicProject from the Java backend.
 * The backend will:
 *   1. Fetch byte[] from PostgreSQL BYTEA column
 *   2. Deserialize byte[] → MusicProject via ObjectInputStream (Unit 2)
 *   3. Jackson serializes MusicProject → JSON response
 *
 * @param projectId - The unique project identifier used during save
 * @returns The reconstructed project payload
 */
export async function loadProject(projectId: string): Promise<MusicProjectPayload> {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/load/${encodeURIComponent(projectId)}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Load failed" }));
    throw new Error(error.message || `Load failed with status ${response.status}`);
  }

  return response.json();
}

