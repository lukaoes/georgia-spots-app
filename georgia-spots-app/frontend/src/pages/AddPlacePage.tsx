import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { pinIcon } from "../components/markerIcon";
import {
  CATEGORIES,
  VEHICLE_TYPES,
  ROAD_DIFFICULTY,
  SURFACES,
  ENVIRONMENTS,
  QUIETNESS,
  GROUND_LEVELS,
  SERVICES,
} from "../constants";
import { ServiceIcon, Navigation, X } from "../icons";

const GEORGIA_CENTER: [number, number] = [42.15, 43.5];

function ClickToPlace({
  position,
  onPick,
}: {
  position: [number, number] | null;
  onPick: (p: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? (
    <Marker position={position} icon={pinIcon("other", true)} />
  ) : null;
}

export function AddPlacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // present only when editing an existing place
  const isEdit = !!id;

  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [existingPhotos, setExistingPhotos] = useState<
    { id: string; url: string }[]
  >([]);
  const [canEdit, setCanEdit] = useState(true);

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("wild_spot");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [services, setServices] = useState<Record<string, boolean>>({});
  const [vehicleType, setVehicleType] = useState("any");
  const [roadDifficulty, setRoadDifficulty] = useState("easy");
  const [surface, setSurface] = useState("gravel");
  const [environment, setEnvironment] = useState("mountain");
  const [capacity, setCapacity] = useState("");
  const [openAllYear, setOpenAllYear] = useState(true);
  const [petsAllowed, setPetsAllowed] = useState(true);
  const [quietness, setQuietness] = useState("quiet");
  const [shade, setShade] = useState(false);
  const [groundLevel, setGroundLevel] = useState("flat");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    api
      .getPlace(id)
      .then((d) => {
        const p = d.place;
        if (p.owner_id !== user.id && !user.is_admin) {
          setCanEdit(false);
          return;
        }
        setPosition([p.lat, p.lng]);
        setName(p.name);
        setDescription(p.description || "");
        setCategory(p.category);
        setIsFree(p.is_free);
        setPrice(p.price_amount ? String(p.price_amount) : "");
        setServices(
          Object.fromEntries(SERVICES.map((s) => [s.key, !!p[s.key]])),
        );
        setVehicleType(p.vehicle_type);
        setRoadDifficulty(p.road_difficulty);
        setSurface(p.surface);
        setEnvironment(p.environment);
        setCapacity(p.capacity_estimate ? String(p.capacity_estimate) : "");
        setOpenAllYear(p.open_all_year);
        setPetsAllowed(p.pets_allowed);
        setQuietness(p.quietness);
        setShade(p.shade);
        setGroundLevel(p.ground_level);
        setExistingPhotos(d.photos || []);
      })
      .finally(() => setLoadingExisting(false));
  }, [id, user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4 text-center">
        <p className="text-[color:var(--color-ink-soft)]">
          ადგილის დასამატებლად საჭიროა ავტორიზაცია.
        </p>
      </div>
    );
  }

  if (loadingExisting) {
    return (
      <p className="text-center mt-16 text-[color:var(--color-ink-soft)]">
        იტვირთება...
      </p>
    );
  }

  if (isEdit && !canEdit) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4 text-center">
        <p className="text-[color:var(--color-ink-soft)]">
          ამ ადგილის რედაქტირება მხოლოდ ავტორს ან ადმინისტრატორს შეუძლია.
        </p>
      </div>
    );
  }

  async function removeExistingPhoto(photoId: string) {
    if (!id) return;
    if (!confirm("წავშალო ეს ფოტო?")) return;
    await api.deletePlacePhoto(id, photoId);
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!position) {
      setError("გთხოვთ, დააჭირეთ რუკას და მონიშნეთ ზუსტი ადგილმდებარეობა.");
      return;
    }
    if (!name.trim()) {
      setError("ადგილის სახელი სავალდებულოა.");
      return;
    }
    setBusy(true);
    try {
      let photo_urls: string[] = [];
      if (photos.length > 0) {
        const up = await api.uploadPhotos(photos, "place");
        photo_urls = up.urls;
      }
      const payload = {
        name,
        description,
        lat: position[0],
        lng: position[1],
        category,
        is_free: isFree,
        price_amount: isFree ? null : Number(price) || null,
        ...Object.fromEntries(Object.entries(services).map(([k, v]) => [k, v])),
        vehicle_type: vehicleType,
        road_difficulty: roadDifficulty,
        surface,
        environment,
        capacity_estimate: capacity ? Number(capacity) : null,
        open_all_year: openAllYear,
        pets_allowed: petsAllowed,
        quietness,
        shade,
        ground_level: groundLevel,
        photo_urls,
      };

      if (isEdit && id) {
        await api.updatePlace(id, payload);
        navigate(`/place/${id}`);
      } else {
        const place = await api.createPlace(payload);
        navigate(`/place/${place.place.id}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function locateMe() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    });
  }

  const isOwnerNotAdmin = isEdit && user && !user.is_admin;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="font-display text-2xl font-semibold text-[color:var(--color-forest)] mb-1">
        {isEdit ? "ადგილის რედაქტირება" : "ახალი ადგილის დამატება"}
      </h1>
      <p className="text-sm text-[color:var(--color-ink-soft)] mb-4">
        {isEdit
          ? isOwnerNotAdmin
            ? "რედაქტირების შემდეგ ადგილი დროებით მოიხსნება საჯარო რუკიდან, სანამ ადმინისტრატორი არ დაამტკიცებს ცვლილებებს."
            : "ცვლილებები დაუყოვნებლივ გამოქვეყნდება."
          : "დააჭირეთ რუკას ზუსტ წერტილზე, სადაც ადგილი მდებარეობს — კოორდინატები ავტომატურად შეინახება."}
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="rounded-xl overflow-hidden border border-[color:var(--color-stone)] h-72 relative">
          <MapContainer
            center={position || GEORGIA_CENTER}
            zoom={position ? 12 : 7}
            className="w-full h-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToPlace position={position} onPick={setPosition} />
          </MapContainer>
          <button
            type="button"
            onClick={locateMe}
            className="absolute bottom-3 right-3 z-[1000] bg-white shadow-md rounded-full px-3 py-1.5 text-sm font-medium border border-[color:var(--color-stone-dark)] flex items-center gap-1.5"
          >
            <Navigation size={14} /> ჩემი მდებარეობა
          </button>
        </div>
        {position && (
          <p className="text-xs text-[color:var(--color-ink-soft)] -mt-3">
            მონიშნული კოორდინატები: {position[0].toFixed(5)},{" "}
            {position[1].toFixed(5)}
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">ადგილის სახელი</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
              placeholder="მაგ: ჯვრის უღელტეხილი"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">აღწერა</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
              placeholder="მოკლედ აღწერეთ ადგილი — ხედი, წვდომა, გამოცდილება..."
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">კატეგორია</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">გარემო</span>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            >
              {ENVIRONMENTS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">ფასი</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={isFree}
                  onChange={() => setIsFree(true)}
                />{" "}
                უფასო
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={!isFree}
                  onChange={() => setIsFree(false)}
                />{" "}
                ფასიანი
              </label>
              {!isFree && (
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="₾"
                  className="w-20 rounded-lg border border-[color:var(--color-stone-dark)] px-2 py-1"
                />
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">დაახლ. ტევადობა (მანქანა)</span>
            <input
              type="number"
              min="0"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">შესაფერისი ტრანსპორტი</span>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            >
              {VEHICLE_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">გზის სირთულე</span>
            <select
              value={roadDifficulty}
              onChange={(e) => setRoadDifficulty(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            >
              {ROAD_DIFFICULTY.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">საფარი</span>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            >
              {SURFACES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">რელიეფი</span>
            <select
              value={groundLevel}
              onChange={(e) => setGroundLevel(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            >
              {GROUND_LEVELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">სიმშვიდე</span>
            <select
              value={quietness}
              onChange={(e) => setQuietness(e.target.value)}
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            >
              {QUIETNESS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={openAllYear}
              onChange={(e) => setOpenAllYear(e.target.checked)}
            />
            ღიაა მთელი წლის განმავლობაში
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={petsAllowed}
              onChange={(e) => setPetsAllowed(e.target.checked)}
            />
            შინაური ცხოველები დაშვებულია
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shade}
              onChange={(e) => setShade(e.target.checked)}
            />
            ჩრდილიანია
          </label>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium">სერვისები</span>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                type="button"
                key={s.key}
                onClick={() =>
                  setServices((prev) => ({ ...prev, [s.key]: !prev[s.key] }))
                }
                className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-1.5 ${
                  services[s.key]
                    ? "bg-[color:var(--color-moss)] text-white border-[color:var(--color-moss)]"
                    : "border-[color:var(--color-stone-dark)]"
                }`}
              >
                <ServiceIcon service={s.key} size={14} /> {s.label}
              </button>
            ))}
          </div>
        </div>

        {existingPhotos.length > 0 && (
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-medium">არსებული ფოტოები</span>
            <div className="flex flex-wrap gap-2">
              {existingPhotos.map((p) => (
                <div key={p.id} className="relative">
                  <img
                    src={p.url}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(p.id)}
                    className="absolute -top-1.5 -right-1.5 bg-[color:var(--color-clay)] text-white rounded-full p-1"
                    aria-label="ფოტოს წაშლა"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {isEdit ? "ახალი ფოტოების დამატება (მაქს. 6)" : "ფოტოები (მაქს. 6)"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setPhotos(Array.from(e.target.files || []).slice(0, 6))
            }
            className="text-sm"
          />
        </label>

        {error && (
          <p className="text-sm text-[color:var(--color-clay)]">{error}</p>
        )}

        <button
          disabled={busy}
          className="bg-[color:var(--color-forest)] text-white rounded-lg py-2.5 font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
        >
          {busy
            ? "ინახება..."
            : isEdit
              ? "ცვლილებების შენახვა"
              : "ადგილის დამატება"}
        </button>
      </form>
    </div>
  );
}
