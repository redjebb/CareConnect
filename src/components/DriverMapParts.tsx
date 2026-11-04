import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

const arcGisMarkerShadow =
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';
export const pendingMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: arcGisMarkerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
export const deliveredMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: arcGisMarkerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


export function MapBoundsController({
  coordinates,
  fallbackCenter,
  driverPosition
}: {
  coordinates: Array<{ lat: number; lng: number }>;
  fallbackCenter: { lat: number; lng: number };
  driverPosition: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const hasCenteredOnDriver = useRef(false);

  useEffect(() => {
    if (driverPosition && !hasCenteredOnDriver.current) {
      map.setView([driverPosition.lat, driverPosition.lng], 13);
      hasCenteredOnDriver.current = true;
    }

    if (coordinates.length === 0) {
      const center = driverPosition ?? fallbackCenter;
      map.setView([center.lat, center.lng], 12);
      return;
    }

    const boundsPoints = [
      ...coordinates.map(coord => [coord.lat, coord.lng] as [number, number]),
      ...(driverPosition ? [[driverPosition.lat, driverPosition.lng] as [number, number]] : [])
    ];
    const bounds = L.latLngBounds(boundsPoints as L.LatLngBoundsLiteral);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [coordinates, fallbackCenter, map, driverPosition]);

  return null;
}

