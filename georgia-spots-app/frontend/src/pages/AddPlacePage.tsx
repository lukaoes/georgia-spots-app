import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { pinIcon } from "../components/markerIcon";
import { TILE_LAYERS, LayerToggle } from "../components/MapView";
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
import { ServiceIcon, Navigation, X, Plus } from "../icons";

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

// Recenters the map when coordinates are typed in or "my location" is used. Not triggered by a
// direct map click, since the user has already manually positioned the map there themselves.
function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 0.8 });
  }, [position]);
  return null;
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
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [layer, setLayer] = useState<"standard" | "satellite">("standard");
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
  // Only one photo uploads at a time: the next box only appears once the current one finishes
  // successfully. Multiple boxes existing at once meant a person could tap several of them in
  // quick succession, which still sent multiple concurrent requests to the backend even though
  // each request only carried one file - and that's still enough concurrent load to overwhelm a
  // small free-tier container. Strictly one-at-a-time removes that possibility entirely.
  const MAX_PHOTOS = 6;
  interface PhotoItem {
    id: number;
    file: File;
    status: "uploading" | "done" | "error";
    previewUrl: string;
    uploadedUrl?: string;
    error?: string;
  }
  const [photoList, setPhotoList] = useState<PhotoItem[]>([]);
  const nextPhotoId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function runUpload(id: number, file: File) {
    api
      .uploadPhotos([file], "place")
      .then((res) => {
        setPhotoList((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "done", uploadedUrl: res.urls[0] } : p))
        );
      })
      .catch((err: any) => {
        setPhotoList((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "error", error: err?.message || "ატვირთვა ვერ მოხერხდა" } : p))
        );
      });
  }

  function addPhoto(file: File) {
    const id = nextPhotoId.current++;
    const previewUrl = URL.createObjectURL(file);
    setPhotoList((prev) => [...prev, { id, file, status: "uploading", previewUrl }]);
    runUpload(id, file);
  }

  function retryPhoto(id: number) {
    const item = photoList.find((p) => p.id === id);
    if (!item) return;
    setPhotoList((prev) => prev.map((p) => (p.id === id ? { ...p, status: "uploading", error: undefined } : p)));
    runUpload(id, item.file);
  }

  function removePhoto(id: number) {
    setPhotoList((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  const canShowNextBox =
    photoList.length < MAX_PHOTOS && (photoList.length === 0 || photoList[photoList.length - 1].status === "done");
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
        setLatInput(String(p.lat));
        setLngInput(String(p.lng));
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

  // Drop the pin from typed coordinates. Debounced so it doesn't fire on every keystroke while
  // the numbers are still incomplete, and skipped if it already matches the current pin (e.g.
  // right after a map click filled these same fields) so it doesn't re-fly the map pointlessly.
  useEffect(() => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    if (position && Math.abs(position[0] - lat) < 1e-9 && Math.abs(position[1] - lng) < 1e-9) return;
    const t = setTimeout(() => {
      setPosition([lat, lng]);
      setFlyTarget([lat, lng]);
    }, 500);
    return () => clearTimeout(t);
  }, [latInput, lngInput]);

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
    if (photoList.some((p) => p.status === "uploading")) {
      setError("სურათები ჯერ იტვირთება, გთხოვთ დაელოდოთ.");
      return;
    }
    setBusy(true);
    try {
      const photo_urls = photoList
        .filter((p) => p.status === "done" && p.uploadedUrl)
        .map((p) => p.uploadedUrl!);
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
      // A real server error (validation, auth, etc.) already comes through as a clean message
      // via api.ts's handle(). A raw "Load failed" / "Failed to fetch" means the request itself
      // never completed - a dropped connection, slow mobile network, or the backend taking too
      // long - so show something the person can actually act on instead of that browser text.
      const isNetworkFailure = err instanceof TypeError || /load failed|fetch/i.test(err?.message || "");
      setError(
        isNetworkFailure
          ? "კავშირი შეწყდა ატვირთვისას. გთხოვთ შეამოწმოთ ინტერნეტ კავშირი და სცადოთ ისევ (ნაკლები ან უფრო მსუბუქი ფოტოებით, თუ პრობლემა მეორდება)."
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  function locateMe() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setPosition(p);
      setLatInput(p[0].toFixed(6));
      setLngInput(p[1].toFixed(6));
      setFlyTarget(p);
    });
  }

  function handleMapClick(p: [number, number]) {
    setPosition(p);
    setLatInput(p[0].toFixed(6));
    setLngInput(p[1].toFixed(6));
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
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">განედი (lat)</span>
            <input
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="42.15"
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">გრძედი (lng)</span>
            <input
              type="text"
              inputMode="decimal"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="43.50"
              className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
            />
          </label>
        </div>

        <div className="rounded-xl overflow-hidden border border-[color:var(--color-stone)] h-72 relative">
          <MapContainer
            center={position || GEORGIA_CENTER}
            zoom={position ? 12 : 7}
            className="w-full h-full"
          >
            <TileLayer
              attribution={TILE_LAYERS[layer].attribution}
              url={TILE_LAYERS[layer].url}
            />
            <ClickToPlace position={position} onPick={handleMapClick} />
            <FlyToPosition position={flyTarget} />
          </MapContainer>
          <button
            type="button"
            onClick={locateMe}
            className="absolute bottom-3 left-3 z-[1000] bg-white shadow-md rounded-full px-3 py-1.5 text-sm font-medium border border-[color:var(--color-stone-dark)] flex items-center gap-1.5"
          >
            <Navigation size={14} /> ჩემი მდებარეობა
          </button>
          <LayerToggle layer={layer} setLayer={setLayer} />
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

        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {isEdit ? "ახალი ფოტოების დამატება (მაქს. 6)" : "ფოტოები (მაქს. 6)"}
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {photoList.map((item) => (
              <div key={item.id} className="relative aspect-square">
                <div className="w-full h-full rounded-xl overflow-hidden border border-[color:var(--color-stone)] relative">
                  <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                  {item.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  {item.status === "error" && (
                    <button
                      type="button"
                      onClick={() => retryPhoto(item.id)}
                      className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-0.5 text-center px-1"
                    >
                      <span className="text-white text-[10px] leading-tight">ვერ აიტვირთა</span>
                      <span className="text-white text-[10px] underline">თავიდან ცდა</span>
                    </button>
                  )}
                  {item.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => removePhoto(item.id)}
                      className="absolute -top-1.5 -right-1.5 bg-[color:var(--color-clay)] text-white rounded-full p-1"
                      aria-label="ფოტოს წაშლა"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {canShowNextBox && (
              <div className="relative aspect-square">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full rounded-xl border-2 border-dashed border-[color:var(--color-stone-dark)] flex items-center justify-center text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-bg)]"
                  aria-label="ფოტოს დამატება"
                >
                  <Plus size={26} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) addPhoto(file);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
          {photoList.some((p) => p.status === "uploading") && (
            <p className="text-xs text-[color:var(--color-ink-soft)]">
              სურათი იტვირთება... შემდეგი სურათის დამატება შესაძლებელი იქნება ატვირთვის დასრულების შემდეგ.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-[color:var(--color-clay)]">{error}</p>
        )}

        <button
          disabled={busy || photoList.some((p) => p.status === "uploading")}
          className="bg-[color:var(--color-forest)] text-white rounded-lg py-2.5 font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
        >
          {busy
            ? "ინახება..."
            : photoList.some((p) => p.status === "uploading")
              ? "ფოტოები იტვირთება..."
              : isEdit
                ? "ცვლილებების შენახვა"
                : "ადგილის დამატება"}
        </button>
      </form>
    </div>
  );
}