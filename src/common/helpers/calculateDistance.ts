export const EARTH_RADIUS_KM = 6371;

type Coordinate = {
  lat: number;
  lon: number;
};

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 *
 * @param start - The starting coordinate (latitude and longitude).
 * @param end - The ending coordinate (latitude and longitude).
 * @returns The distance in kilometers between the two coordinates.
 */
export function calculateDistanceInKm(
  start: Coordinate,
  end: Coordinate,
): number {
  const startLatRad = toRadians(start.lat);
  const endLatRad = toRadians(end.lat);
  const deltaLatRad = toRadians(end.lat - start.lat);
  const deltaLonRad = toRadians(end.lon - start.lon);

  const a =
    Math.sin(deltaLatRad / 2) ** 2 +
    Math.cos(startLatRad) *
      Math.cos(endLatRad) *
      Math.sin(deltaLonRad / 2) ** 2; /// a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)

  const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * angularDistance;
}

const toRadians = (degrees: number) => degrees * (Math.PI / 180);
