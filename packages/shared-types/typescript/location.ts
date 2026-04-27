export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationSummary extends GeoPoint {
  id: string;
  countryCode: string;
  countryName: string;
  region: string | null;
  city: string;
  neighbourhood: string | null;
}
