import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { pinIcon, userLocationIcon } from "./markerIcon";
import { categoryLabel } from "../constants";
import { CategoryIcon, Star, Layers } from "../icons";
import { StarRating } from "./StarRating";
import { useAuthGate } from "../AuthGate";

const GEORGIA_CENTER: [number, number] = [42.15, 43.5];

const TILE_LAYERS = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  is_free: boolean;
  price_amount: number | null;
  avg_rating: number | null;
  review_count: number;
  cover_photo: string | null;
  owner_id?: string;
  owner_name?: string;
  owner_username?: string;
}

function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 12, { duration: 1 });
  }, [position]);
  return null;
}

function LayerToggle({ layer, setLayer }: { layer: "standard" | "satellite"; setLayer: (l: "standard" | "satellite") => void }) {
  return (
    <button
      onClick={() => setLayer(layer === "standard" ? "satellite" : "standard")}
      className="absolute bottom-3 right-3 z-[1000] bg-white shadow-md rounded-full px-3 py-2 text-sm font-medium border border-[color:var(--color-stone-dark)] flex items-center gap-1.5"
    >
      <Layers size={15} />
      {layer === "standard" ? "სატელიტი" : "სტანდარტული"}
    </button>
  );
}

export function MapView({
  places,
  userLocation,
}: {
  places: Place[];
  userLocation: [number, number] | null;
}) {
  const [layer, setLayer] = useState<"standard" | "satellite">("standard");
  const tile = TILE_LAYERS[layer];
  const { requireAuth } = useAuthGate();
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-full">
      <MapContainer center={GEORGIA_CENTER} zoom={7} className="w-full h-full" scrollWheelZoom>
        <TileLayer attribution={tile.attribution} url={tile.url} />
        <FlyTo position={userLocation} />
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon()}>
            <Popup>თქვენი მდებარეობა</Popup>
          </Marker>
        )}
        {places.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.category)}>
            <Popup>
              <div className="w-48">
                {p.cover_photo && (
                  <img src={p.cover_photo} alt={p.name} className="w-full h-24 object-cover rounded-md mb-2" />
                )}
                <div className="font-display font-semibold text-[color:var(--color-forest)] mb-1 flex items-center gap-1.5">
                  <CategoryIcon category={p.category} size={15} className="shrink-0 text-[color:var(--color-forest)]" />
                  {p.name}
                </div>
                <div className="text-xs text-[color:var(--color-ink-soft)] mb-1">{categoryLabel(p.category)}</div>
                {p.owner_name && p.owner_username && (
                  <button
                    onClick={() => requireAuth(() => navigate(`/users/${p.owner_username}`))}
                    className="text-xs text-[color:var(--color-clay)] hover:underline"
                  >
                    დაამატა {p.owner_name}
                  </button>
                )}
                <div className="flex items-center justify-between text-xs my-2">
                  <span>{p.is_free ? "უფასო" : `${p.price_amount ?? "?"} ₾`}</span>
                  {p.review_count > 0 && p.avg_rating ? (
                    <StarRating value={p.avg_rating} size={12} />
                  ) : (
                    <span className="text-[color:var(--color-ink-soft)] flex items-center gap-1">
                      <Star size={11} /> შეფასება არ არის
                    </span>
                  )}
                </div>
                <button
                  onClick={() => requireAuth(() => navigate(`/place/${p.id}`))}
                  className="block w-full text-center text-xs font-medium bg-[color:var(--color-forest)] text-white rounded-md py-1.5 hover:bg-[color:var(--color-forest-dark)]"
                >
                  დეტალურად
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <LayerToggle layer={layer} setLayer={setLayer} />
    </div>
  );
}
