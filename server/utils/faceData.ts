const DESCRIPTOR_LENGTH = 128;
const MAX_CAPTURE_HISTORY = 12;
const OUTLIER_DISTANCE_THRESHOLD = 0.65;
const DUPLICATE_DISTANCE_THRESHOLD = 0.015;

export interface FaceProfileCapture {
  vector: number[];
  score?: number;
  capturedAt: string;
}

export interface FaceProfileStats {
  captureCount: number;
  descriptorLength: number;
  consistencyScore: number;
  lastUpdated: string;
}

export interface FaceProfile {
  version: number;
  centroid: number[];
  captures: FaceProfileCapture[];
  stats: FaceProfileStats;
}

type FaceDescriptorEntry = {
  vector: number[];
  score?: number;
  capturedAt?: string;
};

export class FaceDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaceDataError";
  }
}

export function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

export function normalizeDescriptor(descriptor: number[]): number[] {
  const magnitude = Math.sqrt(
    descriptor.reduce((acc, value) => acc + value * value, 0),
  );

  if (!magnitude || !Number.isFinite(magnitude)) {
    return descriptor.map((value) => Number(value));
  }

  return descriptor.map((value) =>
    Number.parseFloat((value / magnitude).toFixed(8)),
  );
}

export function prepareDescriptorForComparison(input: unknown): number[] {
  const vector = ensureNumberArray(input);
  if (!vector || vector.length !== DESCRIPTOR_LENGTH) {
    throw new FaceDataError("Face descriptor tidak valid");
  }
  return normalizeDescriptor(vector);
}

export function extractFaceVectors(faceData: unknown): number[][] {
  const entries = extractFaceDescriptorEntries(faceData);
  const vectors = entries.map((entry) => normalizeDescriptor(entry.vector));

  if (faceData && typeof faceData === "object" && !Array.isArray(faceData)) {
    const centroidVector = ensureNumberArray((faceData as any).centroid);
    if (centroidVector && centroidVector.length === DESCRIPTOR_LENGTH) {
      vectors.push(normalizeDescriptor(centroidVector));
    }
  }

  return deduplicateVectors(vectors);
}

export function createFaceProfilePayload(
  rawDescriptors: unknown,
  existingData?: unknown,
): FaceProfile {
  const existingEntries = extractFaceDescriptorEntries(existingData);
  const timestampBase = Date.now();

  const newEntries = sanitizeDescriptorPayload(rawDescriptors).map(
    (entry, index) => ({
      ...entry,
      capturedAt: new Date(timestampBase + index).toISOString(),
    }),
  );

  const combinedEntries = [...existingEntries, ...newEntries];
  return buildProfileFromEntries(combinedEntries);
}

function buildProfileFromEntries(entries: FaceDescriptorEntry[]): FaceProfile {
  if (!entries.length) {
    throw new FaceDataError("Minimal satu descriptor wajah diperlukan");
  }

  const normalized = entries
    .map((entry) => ({
      ...entry,
      vector: normalizeDescriptor(entry.vector),
    }))
    .filter((entry) => entry.vector.length === DESCRIPTOR_LENGTH);

  if (!normalized.length) {
    throw new FaceDataError("Descriptor wajah tidak valid");
  }

  const withoutOutliers = removeDescriptorOutliers(normalized);
  const deduplicated = deduplicateDescriptorEntries(withoutOutliers);
  const trimmed = trimHistory(deduplicated);

  if (!trimmed.length) {
    throw new FaceDataError(
      "Descriptor wajah tidak valid setelah pemrosesan",
    );
  }

  const captureVectors = trimmed.map((entry) => entry.vector);
  const centroid = computeCentroid(captureVectors);
  const orderedCaptures = [...trimmed].sort(
    (a, b) => getTimestamp(a.capturedAt) - getTimestamp(b.capturedAt),
  );
  const statsLastUpdated =
    orderedCaptures[orderedCaptures.length - 1]?.capturedAt ||
    new Date().toISOString();

  return {
    version: 1,
    centroid,
    captures: orderedCaptures.map((entry) => ({
      vector: entry.vector,
      score: entry.score,
      capturedAt: entry.capturedAt || statsLastUpdated,
    })),
    stats: {
      captureCount: orderedCaptures.length,
      descriptorLength: DESCRIPTOR_LENGTH,
      consistencyScore: computeConsistencyScore(captureVectors, centroid),
      lastUpdated: statsLastUpdated,
    },
  };
}

function sanitizeDescriptorPayload(input: unknown): FaceDescriptorEntry[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new FaceDataError("Minimal satu descriptor wajah diperlukan");
  }

  return input.map((item, index) => {
    if (Array.isArray(item)) {
      const vector = ensureNumberArray(item);
      if (!vector || vector.length !== DESCRIPTOR_LENGTH) {
        throw new FaceDataError(
          `Descriptor pada index ${index} tidak memiliki panjang ${DESCRIPTOR_LENGTH}`,
        );
      }
      return { vector };
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
      const vector = ensureNumberArray((item as any).vector);
      if (!vector || vector.length !== DESCRIPTOR_LENGTH) {
        throw new FaceDataError(
          `Descriptor pada index ${index} tidak memiliki panjang ${DESCRIPTOR_LENGTH}`,
        );
      }

      const rawScore = (item as any).score ?? (item as any).confidence;
      const score =
        typeof rawScore === "number" && Number.isFinite(rawScore)
          ? Math.max(0, Math.min(1, rawScore))
          : undefined;

      const capturedAt =
        typeof (item as any).capturedAt === "string"
          ? (item as any).capturedAt
          : undefined;

      return { vector, score, capturedAt };
    }

    throw new FaceDataError("Format descriptor tidak didukung");
  });
}

function extractFaceDescriptorEntries(data: unknown): FaceDescriptorEntry[] {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    try {
      return sanitizeDescriptorPayload(data);
    } catch {
      return [];
    }
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const captures = Array.isArray(obj.captures) ? obj.captures : [];

    if (captures.length) {
      const parsedCaptures: FaceDescriptorEntry[] = [];

      for (const capture of captures) {
        const vector = ensureNumberArray((capture as any)?.vector);
        if (!vector || vector.length !== DESCRIPTOR_LENGTH) {
          continue;
        }

        const scoreValue = (capture as any)?.score;
        const capturedAtValue = (capture as any)?.capturedAt;

        parsedCaptures.push({
          vector,
          score:
            typeof scoreValue === "number"
              ? Math.max(0, Math.min(1, scoreValue))
              : undefined,
          capturedAt:
            typeof capturedAtValue === "string" ? capturedAtValue : undefined,
        });
      }

      if (parsedCaptures.length) {
        return parsedCaptures;
      }
    }

    if (Array.isArray(obj.centroid)) {
      const centroidVector = ensureNumberArray(obj.centroid);
      if (centroidVector && centroidVector.length === DESCRIPTOR_LENGTH) {
        return [
          {
            vector: centroidVector,
            capturedAt:
              typeof (obj as any)?.stats?.lastUpdated === "string"
                ? ((obj as any).stats as any).lastUpdated
                : undefined,
          },
        ];
      }
    }
  }

  return [];
}

function removeDescriptorOutliers(
  entries: FaceDescriptorEntry[],
): FaceDescriptorEntry[] {
  if (entries.length <= 2) {
    return entries;
  }

  const centroid = computeCentroid(entries.map((entry) => entry.vector));
  const filtered = entries.filter(
    (entry) =>
      euclideanDistance(entry.vector, centroid) <= OUTLIER_DISTANCE_THRESHOLD,
  );

  return filtered.length ? filtered : entries;
}

function deduplicateDescriptorEntries(
  entries: FaceDescriptorEntry[],
): FaceDescriptorEntry[] {
  const unique: FaceDescriptorEntry[] = [];

  for (const entry of entries) {
    const exists = unique.some(
      (candidate) =>
        euclideanDistance(candidate.vector, entry.vector) <
        DUPLICATE_DISTANCE_THRESHOLD,
    );

    if (!exists) {
      unique.push(entry);
    }
  }

  return unique;
}

function trimHistory(entries: FaceDescriptorEntry[]): FaceDescriptorEntry[] {
  if (entries.length <= MAX_CAPTURE_HISTORY) {
    return entries;
  }

  return [...entries]
    .sort((a, b) => getTimestamp(a.capturedAt) - getTimestamp(b.capturedAt))
    .slice(-MAX_CAPTURE_HISTORY);
}

function computeCentroid(vectors: number[][]): number[] {
  if (!vectors.length) {
    throw new FaceDataError("Tidak ada data wajah untuk dihitung");
  }

  const length = vectors[0].length;
  const sums = new Array(length).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < length; i++) {
      sums[i] += vector[i];
    }
  }

  return sums.map((value) =>
    Number.parseFloat((value / vectors.length).toFixed(8)),
  );
}

function computeConsistencyScore(
  vectors: number[][],
  centroid: number[],
): number {
  if (!vectors.length) {
    return 0;
  }

  if (vectors.length === 1) {
    return 1;
  }

  const averageDistance =
    vectors.reduce(
      (sum, vector) => sum + euclideanDistance(vector, centroid),
      0,
    ) / vectors.length;

  const normalized = Math.max(0, 1 - averageDistance / 0.8);
  return Number.parseFloat(Math.min(1, normalized).toFixed(4));
}

function ensureNumberArray(input: unknown): number[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const vector: number[] = [];
  for (const value of input) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    vector.push(parsed);
  }
  return vector;
}

function deduplicateVectors(vectors: number[][]): number[][] {
  const unique: number[][] = [];
  for (const vector of vectors) {
    const exists = unique.some(
      (candidate) =>
        euclideanDistance(candidate, vector) < DUPLICATE_DISTANCE_THRESHOLD,
    );
    if (!exists) {
      unique.push(vector);
    }
  }
  return unique;
}

function getTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
