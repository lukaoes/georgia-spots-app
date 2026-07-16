import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { pinIcon } from "../components/markerIcon";
import { StarRating, StarRatingInput } from "../components/StarRating";
import { useLightbox } from "../components/Lightbox";
import {
  categoryLabel,
  regionLabel,
  labelFrom,
  VEHICLE_TYPES,
  ROAD_DIFFICULTY,
  SURFACES,
  ENVIRONMENTS,
  QUIETNESS,
  GROUND_LEVELS,
  SERVICES,
} from "../constants";
import {
  CategoryIcon,
  ServiceIcon,
  Heart,
  CircleCheck,
  Navigation as NavIcon,
  Pencil,
  Trash2,
  Flag,
  CircleUser,
  MapPin,
  Clock,
  CircleX,
  Lock,
} from "../icons";

export function PlaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [visitedDate, setVisitedDate] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [status, setStatus] = useState<{
    is_favorite: boolean;
    is_visited: boolean;
    visited_date: string | null;
  } | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  function load() {
    if (!id || !user) return;
    api
      .getPlace(id)
      .then(setData)
      .catch((e) => setError(e.message));
    api
      .myStatusFor(id)
      .then(setStatus)
      .catch(() => {});
  }

  useEffect(load, [id, user]);

  const allPhotoUrls: string[] = data
    ? [
        ...data.photos.map((p: any) => p.url),
        ...data.reviews.flatMap((r: any) =>
          (r.photos || []).map((p: any) => p.url),
        ),
      ]
    : [];
  const lightbox = useLightbox(allPhotoUrls);

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] flex items-center justify-center mx-auto mb-4 text-[color:var(--color-forest)]">
          <Lock size={24} />
        </div>
        <h1 className="font-display text-xl font-semibold text-[color:var(--color-forest)] mb-2">
          ამ ადგილის დეტალები
        </h1>
        <p className="text-sm text-[color:var(--color-ink-soft)] mb-5">
          დეტალების, ფოტოებისა და შეფასებების სანახავად საჭიროა რეგისტრაცია.
        </p>
        <div className="flex gap-2 justify-center">
          <Link
            to="/register"
            className="bg-[color:var(--color-forest)] text-white rounded-lg px-5 py-2.5 text-sm font-medium"
          >
            რეგისტრაცია
          </Link>
          <Link
            to="/login"
            className="border border-[color:var(--color-stone-dark)] rounded-lg px-5 py-2.5 text-sm font-medium"
          >
            შესვლა
          </Link>
        </div>
      </div>
    );
  }

  if (error)
    return (
      <p className="text-center mt-16 text-[color:var(--color-clay)]">
        {error}
      </p>
    );
  if (!data)
    return (
      <p className="text-center mt-16 text-[color:var(--color-ink-soft)]">
        იტვირთება...
      </p>
    );

  const { place, photos, reviews } = data;
  const isOwner = user && user.id === place.owner_id;
  const isAdmin = user?.is_admin;
  const canManage = isOwner || isAdmin;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    try {
      let photo_urls: string[] = [];
      if (reviewPhotos.length > 0) {
        const up = await api.uploadPhotos(reviewPhotos, "review");
        photo_urls = up.urls;
      }
      await api.addReview(id, {
        rating,
        text: reviewText,
        visited_date: visitedDate || null,
        photo_urls,
      });
      setReviewText("");
      setVisitedDate("");
      setRating(5);
      setReviewPhotos([]);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    if (!id || !reportReason.trim()) return;
    try {
      await api.reportPlace(id, reportReason);
      setReportOpen(false);
      setReportReason("");
      alert(
        "გმადლობთ, თქვენი შეტყობინება გადაეგზავნა მოდერატორებს განსახილველად.",
      );
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function toggleFavorite() {
    if (!id || !user) return;
    setStatusBusy(true);
    try {
      if (status?.is_favorite) await api.removeFavorite(id);
      else await api.addFavorite(id);
      setStatus(await api.myStatusFor(id));
    } finally {
      setStatusBusy(false);
    }
  }

  async function toggleVisited() {
    if (!id || !user) return;
    setStatusBusy(true);
    try {
      if (status?.is_visited) await api.unmarkVisited(id);
      else await api.markVisited(id);
      setStatus(await api.myStatusFor(id));
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    const msg = isAdmin
      ? "დარწმუნებული ხართ, რომ გსურთ ამ ადგილის სამუდამოდ წაშლა?"
      : "დარწმუნებული ხართ, რომ გსურთ ამ ადგილის წაშლა? მოთხოვნა გადაეგზავნება ადმინისტრატორს დასადასტურებლად.";
    if (!confirm(msg)) return;
    const result = await api.deletePlace(id);
    if (result.queued) {
      alert("წაშლის მოთხოვნა გაიგზავნა ადმინისტრატორთან დასადასტურებლად.");
      navigate("/profile");
    } else {
      navigate("/");
    }
  }

  const attrRows: [string, string][] = [
    ["ტრანსპორტი", labelFrom(VEHICLE_TYPES, place.vehicle_type)],
    ["გზის სირთულე", labelFrom(ROAD_DIFFICULTY, place.road_difficulty)],
    ["საფარი", labelFrom(SURFACES, place.surface)],
    ["გარემო", labelFrom(ENVIRONMENTS, place.environment)],
    ["სიმშვიდე", labelFrom(QUIETNESS, place.quietness)],
    ["რელიეფი", labelFrom(GROUND_LEVELS, place.ground_level)],
    ["ღიაა მთელი წელი", place.open_all_year ? "დიახ" : "არა"],
    [
      "შინაური ცხოველები",
      place.pets_allowed ? "დაშვებულია" : "არ არის დაშვებული",
    ],
    ["ჩრდილი", place.shade ? "არის" : "არ არის"],
  ];
  if (place.capacity_estimate)
    attrRows.push(["ტევადობა", `${place.capacity_estimate} მანქანა`]);
  if (place.region) attrRows.push(["რეგიონი", regionLabel(place.region)]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/"
        className="text-sm text-[color:var(--color-clay)] underline mb-3 inline-block"
      >
        ← უკან რუკაზე
      </Link>

      {isOwner && place.status !== "approved" && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
            place.status === "pending" || place.status === "pending_deletion"
              ? "bg-[#F2E9CE] text-[#6B5220]"
              : "bg-[#F3DBD3] text-[color:var(--color-clay-dark)]"
          }`}
        >
          {place.status === "rejected" ? (
            <CircleX size={16} className="shrink-0 mt-0.5" />
          ) : (
            <Clock size={16} className="shrink-0 mt-0.5" />
          )}
          <span>
            {place.status === "pending" &&
              "ეს ადგილი ელოდება ადმინისტრატორის დამტკიცებას — ჯერჯერობით მხოლოდ თქვენ ხედავთ მას."}
            {place.status === "pending_deletion" &&
              "თქვენ მოითხოვეთ ამ ადგილის წაშლა — ის მოხსნილია საჯარო რუკიდან და ელოდება ადმინისტრატორის დადასტურებას."}
            {place.status === "rejected" && (
              <>
                ეს ადგილი უარყოფილია მოდერატორის მიერ.
                {place.rejection_reason
                  ? ` მიზეზი: ${place.rejection_reason}`
                  : ""}
              </>
            )}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="font-display text-2xl font-semibold text-[color:var(--color-forest)] flex items-center gap-2">
          <CategoryIcon category={place.category} size={22} />
          {place.name}
        </h1>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            <Link
              to={`/edit/${place.id}`}
              className="p-2 rounded-full border border-[color:var(--color-stone-dark)] hover:bg-[color:var(--color-bg)]"
              title="რედაქტირება"
            >
              <Pencil size={15} />
            </Link>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full border border-[color:var(--color-clay)] text-[color:var(--color-clay)] hover:bg-[#F3DBD3]"
              title="წაშლა"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-[color:var(--color-ink-soft)] mb-1">
        {categoryLabel(place.category)}
      </p>
      {place.owner_name && (
        <Link
          to={`/users/${place.owner_username}`}
          className="text-sm text-[color:var(--color-clay)] hover:underline inline-flex items-center gap-1.5 mb-4"
        >
          {place.owner_avatar ? (
            <img
              src={place.owner_avatar}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <CircleUser size={16} />
          )}
          დაამატა {place.owner_name}
        </Link>
      )}

      {user && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={toggleFavorite}
            disabled={statusBusy}
            className={`text-sm px-3 py-1.5 rounded-full border flex items-center gap-1.5 disabled:opacity-60 ${
              status?.is_favorite
                ? "bg-[color:var(--color-clay)] text-white border-[color:var(--color-clay)]"
                : "border-[color:var(--color-stone-dark)]"
            }`}
          >
            <Heart
              size={14}
              fill={status?.is_favorite ? "currentColor" : "none"}
            />{" "}
            სასურველებში
          </button>
          <button
            onClick={toggleVisited}
            disabled={statusBusy}
            className={`text-sm px-3 py-1.5 rounded-full border flex items-center gap-1.5 disabled:opacity-60 ${
              status?.is_visited
                ? "bg-[color:var(--color-moss)] text-white border-[color:var(--color-moss)]"
                : "border-[color:var(--color-stone-dark)]"
            }`}
          >
            <CircleCheck size={14} /> ნამყოფი ვარ
          </button>
        </div>
      )}

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto mb-4 -mx-1 px-1">
          {photos.map((p: any, i: number) => (
            <button
              key={p.id}
              onClick={() => lightbox.open(i)}
              className="shrink-0"
            >
              <img
                src={p.url}
                alt={place.name}
                className="h-48 rounded-lg object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
              />
            </button>
          ))}
        </div>
      )}
      {lightbox.node}

      {place.description && (
        <p className="mb-4 leading-relaxed">{place.description}</p>
      )}

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4 bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl p-4">
        <div className="flex justify-between sm:col-span-2 font-medium">
          <span>
            {place.is_free ? "უფასო" : `${place.price_amount ?? "?"} ₾`}
          </span>
          {reviews.length > 0 && (
            <span className="flex items-center gap-1">
              <StarRating
                value={
                  reviews.reduce((s: number, r: any) => s + r.rating, 0) /
                  reviews.length
                }
              />
              <span className="text-[color:var(--color-ink-soft)]">
                ({reviews.length})
              </span>
            </span>
          )}
        </div>
        {attrRows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between border-t border-[color:var(--color-stone)] pt-1"
          >
            <span className="text-[color:var(--color-ink-soft)]">{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SERVICES.filter((s) => place[s.key]).map((s) => (
          <span
            key={s.key}
            className="text-xs bg-[color:var(--color-moss)] text-white px-3 py-1 rounded-full flex items-center gap-1.5"
          >
            <ServiceIcon service={s.key} size={12} /> {s.label}
          </span>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden border border-[color:var(--color-stone)] h-56 mb-2">
        <MapContainer
          center={[place.lat, place.lng]}
          zoom={13}
          className="w-full h-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap"
          />
          <Marker
            position={[place.lat, place.lng]}
            icon={pinIcon(place.category)}
          />
        </MapContainer>
      </div>
      <div className="flex items-center justify-between mb-6 text-xs text-[color:var(--color-ink-soft)]">
        <span className="flex items-center gap-1">
          <MapPin size={12} /> {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
        </span>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[color:var(--color-clay)] underline font-medium flex items-center gap-1"
        >
          <NavIcon size={12} /> გახსნა Google Maps-ში
        </a>
      </div>

      <h2 className="font-display text-xl font-semibold text-[color:var(--color-forest)] mb-3">
        შეფასებები ({reviews.length})
      </h2>

      {user ? (
        <form
          onSubmit={submitReview}
          className="flex flex-col gap-3 mb-6 bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl p-4"
        >
          <StarRatingInput value={rating} onChange={setRating} />
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="გაუზიარეთ სხვებს თქვენი გამოცდილება..."
            rows={2}
            className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[color:var(--color-ink-soft)]">
                ვიზიტის თარიღი
              </span>
              <input
                type="date"
                value={visitedDate}
                onChange={(e) => setVisitedDate(e.target.value)}
                className="rounded-lg border border-[color:var(--color-stone-dark)] px-2 py-1 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-[color:var(--color-ink-soft)]">
                ფოტოები
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setReviewPhotos(Array.from(e.target.files || []).slice(0, 6))
                }
                className="text-xs"
              />
            </label>
          </div>
          <button
            disabled={busy}
            className="self-start bg-[color:var(--color-forest)] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
          >
            {busy ? "..." : "შეფასების დამატება"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-[color:var(--color-ink-soft)] mb-6">
          <Link
            to="/login"
            className="text-[color:var(--color-clay)] underline"
          >
            შედით სისტემაში
          </Link>{" "}
          შეფასების დასატოვებლად.
        </p>
      )}

      <div className="flex flex-col gap-3 mb-8">
        {reviews.map((r: any, reviewIdx: number) => {
          const photosBefore =
            photos.length +
            reviews
              .slice(0, reviewIdx)
              .reduce(
                (sum: number, rv: any) => sum + (rv.photos?.length || 0),
                0,
              );
          return (
            <div
              key={r.id}
              className="border-b border-[color:var(--color-stone)] pb-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{r.author_name}</span>
                <StarRating value={r.rating} size={13} />
              </div>
              {r.text && (
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  {r.text}
                </p>
              )}
              {r.photos && r.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto mt-2">
                  {r.photos.map((p: any, photoIdx: number) => (
                    <img
                      key={p.id}
                      src={p.url}
                      alt=""
                      onClick={() => lightbox.open(photosBefore + photoIdx)}
                      className="h-20 w-20 rounded-lg object-cover shrink-0 cursor-zoom-in hover:opacity-90"
                    />
                  ))}
                </div>
              )}
              {r.visited_date && (
                <p className="text-xs text-[color:var(--color-ink-soft)] mt-1">
                  ეწვია: {r.visited_date}
                </p>
              )}
            </div>
          );
        })}
        {reviews.length === 0 && (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            ჯერ არავის დაუტოვებია შეფასება.
          </p>
        )}
      </div>

      {user && (
        <div className="text-right">
          {reportOpen ? (
            <div className="flex flex-col gap-2 items-end">
              <input
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="მიზეზი (მაგ: არასწორი მდებარეობა, აღარ არსებობს)"
                className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-1.5 text-sm w-72"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setReportOpen(false)}
                  className="text-sm text-[color:var(--color-ink-soft)]"
                >
                  გაუქმება
                </button>
                <button
                  onClick={submitReport}
                  className="text-sm text-white bg-[color:var(--color-clay)] px-3 py-1.5 rounded-lg"
                >
                  გაგზავნა
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setReportOpen(true)}
              className="text-xs text-[color:var(--color-ink-soft)] underline flex items-center gap-1 ml-auto"
            >
              <Flag size={12} /> შეტყობინება პრობლემის შესახებ — გადაეგზავნება
              მოდერატორებს
            </button>
          )}
        </div>
      )}
    </div>
  );
}
