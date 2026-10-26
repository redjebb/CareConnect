import type { GeoPoint } from '../utils/geo';

const CACHE_KEY = 'careconnect_geocode_cache_v1';

const readCache = (): Record<string, GeoPoint> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const writeCache = (cache: Record<string, GeoPoint>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full or unavailable: geocoding still works, just uncached
  }
};

// Resolves an address through ArcGIS. Successful lookups are cached on the
// device so the route map keeps working without a connection; network
// failures return null and are never cached, so they are retried later.
export const geocodeAddress = async (address: string): Promise<GeoPoint | null> => {
  const key = address.trim();
  const cached = readCache()[key];
  if (cached) return cached;

  try {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
      key
    )}&countryCode=BGR&maxLocations=1`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const payload = (await response.json()) as { candidates?: Array<{ location?: { x: number; y: number } }> };
    const location = payload.candidates?.[0]?.location;
    if (!location) return null;

    const point = { lat: location.y, lng: location.x };
    writeCache({ ...readCache(), [key]: point });
    return point;
  } catch {
    return null;
  }
};
