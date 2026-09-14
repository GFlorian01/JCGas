"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const points = [
  { name: "Hilasaca, Ica", position: [-14.0446, -75.734] as [number, number] },
  { name: "Toshi 5, Huaura", position: [-11.111, -77.61] as [number, number] },
  { name: "Plantel 261, Chincha", position: [-13.42, -76.13] as [number, number] },
];

export default function PeruMap() {
  return <div className="real-map"><MapContainer center={[-9.19, -75.015]} zoom={5} scrollWheelZoom={false} aria-label="Mapa de Perú con ubicaciones de cotizaciones"><TileLayer attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{points.map((point) => <CircleMarker center={point.position} radius={8} pathOptions={{ color: "#ffffff", fillColor: "#237461", fillOpacity: 1, weight: 3 }} key={point.name}><Popup><strong>{point.name}</strong><br/>{point.position[0]}; {point.position[1]}</Popup></CircleMarker>)}</MapContainer><div className="map-note">○ Pamplona Alta se muestra como referencia aproximada: no se coloca un marcador hasta registrar coordenadas.</div></div>;
}
