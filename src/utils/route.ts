import { GeoPoint, haversineKm } from './geo';

export interface RouteStop<T> {
  item: T;
  coords?: GeoPoint | null;
}

export function pathLengthKm(start: GeoPoint | null, points: GeoPoint[]): number {
  let total = 0;
  let previous = start;
  for (const point of points) {
    if (previous) total += haversineKm(previous, point);
    previous = point;
  }
  return total;
}

// Orders stops to shorten the driver's trip: nearest-neighbour construction
// followed by 2-opt improvement. Stops without coordinates keep their original
// relative order at the end so nothing is ever dropped.
export function optimizeStops<T>(start: GeoPoint | null, stops: RouteStop<T>[]): T[] {
  const located = stops.filter((s): s is RouteStop<T> & { coords: GeoPoint } => Boolean(s.coords));
  const unlocated = stops.filter(s => !s.coords).map(s => s.item);
  if (located.length < 2) return [...located.map(s => s.item), ...unlocated];

  const remaining = [...located];
  const ordered: typeof located = [];
  let cursor: GeoPoint | null = start ?? remaining[0].coords;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((stop, index) => {
      const distance = cursor ? haversineKm(cursor, stop.coords) : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    cursor = next.coords;
  }

  const length = (route: typeof ordered) => pathLengthKm(start, route.map(s => s.coords));

  let best = ordered;
  let bestLength = length(best);
  let improved = true;
  let guard = 0;

  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1)
        ];
        const candidateLength = length(candidate);
        if (candidateLength + 1e-9 < bestLength) {
          best = candidate;
          bestLength = candidateLength;
          improved = true;
        }
      }
    }
  }

  return [...best.map(s => s.item), ...unlocated];
}
