import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { PlaceCard } from "../components/PlaceCard";
import { CategoryIcon, CircleUser, Lock, Pencil, Link2 } from "../icons";
import {
  InstagramIcon,
  YoutubeIcon,
  FacebookIcon,
  TiktokIcon,
} from "../components/SocialIcons";

type Tab = "places" | "reviews" | "favorites" | "visits";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "განხილვაშია", className: "bg-[#F2E9CE] text-[#6B5220]" },
  approved: {
    label: "გამოქვეყნებულია",
    className: "bg-[#DCEAD6] text-[color:var(--color-forest)]",
  },
  rejected: {
    label: "უარყოფილია",
    className: "bg-[#F3DBD3] text-[color:var(--color-clay-dark)]",
  },
  pending_deletion: {
    label: "წაშლა ელოდება დადასტურებას",
    className: "bg-[#F2E9CE] text-[#6B5220]",
  },
};

function OwnedPlaceRow({ place }: { place: any }) {
  const status = STATUS_LABEL[place.status] || STATUS_LABEL.approved;
  return (
    <Link
      to={`/place/${place.id}`}
      className="flex gap-3 bg-[color:var(--color-surface)] rounded-xl border border-[color:var(--color-stone)] p-3 hover:shadow-md transition-shadow"
    >
      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[color:var(--color-stone)] flex items-center justify-center">
        {place.cover_photo ? (
          <img
            src={place.cover_photo}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <CategoryIcon
            category={place.category}
            size={22}
            className="text-[color:var(--color-forest)]"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-[color:var(--color-forest)] truncate">
          {place.name}
        </div>
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${status.className}`}
        >
          {status.label}
        </span>
      </div>
    </Link>
  );
}

function EditProfileForm({ onDone }: { onDone: () => void }) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [instagram, setInstagram] = useState(user?.social_instagram || "");
  const [youtube, setYoutube] = useState(user?.social_youtube || "");
  const [facebook, setFacebook] = useState(user?.social_facebook || "");
  const [tiktok, setTiktok] = useState(user?.social_tiktok || "");
  const [favPublic, setFavPublic] = useState(user?.favorites_public || false);
  const [visitsPublic, setVisitsPublic] = useState(
    user?.visits_public || false,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function save() {
    setError("");
    setBusy(true);
    try {
      let avatar_url: string | undefined;
      if (avatarFile) {
        const up = await api.uploadPhotos([avatarFile], "avatar");
        avatar_url = up.urls[0];
      }
      const usernameChanged = username.toLowerCase() !== user?.username;
      const d = await api.updateMyProfile({
        name,
        username: username.toLowerCase(),
        email,
        ...(avatar_url ? { avatar_url } : {}),
        bio,
        social_instagram: instagram,
        social_youtube: youtube,
        social_facebook: facebook,
        social_tiktok: tiktok,
        favorites_public: favPublic,
        visits_public: visitsPublic,
      });
      setUser(d.user);
      onDone();
      if (usernameChanged)
        navigate(`/users/${d.user.username}`, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl p-4 mb-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">პროფილის ფოტო</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
          className="text-sm"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">სახელი</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">მომხმარებლის სახელი</span>
          <input
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
              )
            }
            className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">ელ-ფოსტა</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">შესახებ</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          placeholder="რამდენიმე სიტყვა შენს შესახებ..."
        />
      </label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium flex items-center gap-1.5">
            <InstagramIcon size={15} /> Instagram
          </span>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="username"
            className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium flex items-center gap-1.5">
            <YoutubeIcon size={15} /> YouTube
          </span>
          <input
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="channel"
            className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium flex items-center gap-1.5">
            <FacebookIcon size={15} /> Facebook
          </span>
          <input
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            placeholder="username"
            className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium flex items-center gap-1.5">
            <TiktokIcon size={15} /> TikTok
          </span>
          <input
            value={tiktok}
            onChange={(e) => setTiktok(e.target.value)}
            placeholder="username"
            className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          />
        </label>
      </div>
      <p className="text-xs text-[color:var(--color-ink-soft)]">
        სოციალური ბმულები არჩევითია — შეავსეთ მხოლოდ ის, რისი გაზიარებაც გსურთ.
      </p>

      <div className="flex flex-col gap-2 border-t border-[color:var(--color-stone)] pt-3">
        <span className="text-sm font-medium">კონფიდენციალურობა</span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={favPublic}
            onChange={(e) => setFavPublic(e.target.checked)}
          />
          სასურველების სია საჯაროდ ჩანდეს ჩემს პროფილზე
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visitsPublic}
            onChange={(e) => setVisitsPublic(e.target.checked)}
          />
          ნამყოფი ადგილების სია საჯაროდ ჩანდეს ჩემს პროფილზე
        </label>
      </div>

      {error && (
        <p className="text-sm text-[color:var(--color-clay)]">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onDone}
          className="text-sm text-[color:var(--color-ink-soft)] px-3 py-2"
        >
          გაუქმება
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="bg-[color:var(--color-forest)] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
        >
          {busy ? "..." : "შენახვა"}
        </button>
      </div>
    </div>
  );
}

export function PublicProfilePage() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("places");
  const [editing, setEditing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function load() {
    if (!username) return;
    api
      .getPublicProfile(username)
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(load, [username]);

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

  const { user, places, reviews, favorites, visits, is_self } = data;
  const isSelf = is_self || (me && me.username === username);

  async function copyProfileLink() {
    const url = `${window.location.origin}/users/${user.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      prompt("დააკოპირეთ ბმული:", url);
    }
  }

  const tabs: { key: Tab; label: string; count: number; locked?: boolean }[] = [
    { key: "places", label: "ადგილები", count: places.length },
    { key: "reviews", label: "შეფასებები", count: reviews.length },
    {
      key: "favorites",
      label: "სასურველები",
      count: favorites.length,
      locked: !isSelf && !user.favorites_public,
    },
    {
      key: "visits",
      label: "ნამყოფი",
      count: visits.length,
      locked: !isSelf && !user.visits_public,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <CircleUser
              size={48}
              className="text-[color:var(--color-stone-dark)]"
            />
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold text-[color:var(--color-forest)]">
              {user.name}
            </h1>
            <button
              onClick={copyProfileLink}
              className="text-xs text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-clay)] flex items-center gap-1"
              title="პროფილის ბმულის კოპირება"
            >
              @{user.username}
              <Link2 size={11} />
              {linkCopied && (
                <span className="text-[color:var(--color-forest)]">
                  დაკოპირდა!
                </span>
              )}
            </button>
          </div>
        </div>
        {isSelf && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border border-[color:var(--color-stone-dark)] hover:bg-[color:var(--color-bg)] shrink-0"
          >
            <Pencil size={13} /> რედაქტირება
          </button>
        )}
      </div>
      <p className="text-xs text-[color:var(--color-ink-soft)] mt-1">
        წევრია {new Date(user.created_at).toLocaleDateString("ka-GE")}-დან
      </p>

      {user.bio && <p className="text-sm mt-3 mb-1 max-w-xl">{user.bio}</p>}
      {(user.social_instagram ||
        user.social_youtube ||
        user.social_facebook ||
        user.social_tiktok) && (
        <div className="flex gap-3 mt-2 mb-4 text-[color:var(--color-forest)]">
          {user.social_instagram && (
            <a
              href={`https://instagram.com/${user.social_instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
            >
              <InstagramIcon size={19} />
            </a>
          )}
          {user.social_youtube && (
            <a
              href={`https://youtube.com/@${user.social_youtube}`}
              target="_blank"
              rel="noopener noreferrer"
              title="YouTube"
            >
              <YoutubeIcon size={19} />
            </a>
          )}
          {user.social_facebook && (
            <a
              href={`https://facebook.com/${user.social_facebook}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Facebook"
            >
              <FacebookIcon size={19} />
            </a>
          )}
          {user.social_tiktok && (
            <a
              href={`https://tiktok.com/@${user.social_tiktok}`}
              target="_blank"
              rel="noopener noreferrer"
              title="TikTok"
            >
              <TiktokIcon size={19} />
            </a>
          )}
        </div>
      )}

      {isSelf && editing && (
        <EditProfileForm
          onDone={() => {
            setEditing(false);
            load();
          }}
        />
      )}

      <div className="flex gap-2 mb-6 mt-4 bg-[color:var(--color-bg)] rounded-full p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
              tab === t.key
                ? "bg-[color:var(--color-forest)] text-white"
                : "text-[color:var(--color-ink)]"
            }`}
          >
            {t.locked && <Lock size={12} />}
            {t.label} {!t.locked && `(${t.count})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tab === "places" &&
          (places.length === 0 ? (
            <p className="text-sm text-[color:var(--color-ink-soft)] sm:col-span-2">
              {isSelf ? (
                <>
                  ჯერ არ დაგიმატებიათ ადგილი.{" "}
                  <Link
                    to="/add"
                    className="text-[color:var(--color-clay)] underline"
                  >
                    დაამატეთ პირველი
                  </Link>
                  .
                </>
              ) : (
                "ჯერ არ დაუმატებია ადგილი."
              )}
            </p>
          ) : isSelf ? (
            places.map((p: any) => <OwnedPlaceRow key={p.id} place={p} />)
          ) : (
            places.map((p: any) => <PlaceCard key={p.id} place={p} />)
          ))}

        {tab === "reviews" && (
          <div className="sm:col-span-2 flex flex-col gap-2">
            {reviews.length === 0 ? (
              <p className="text-sm text-[color:var(--color-ink-soft)]">
                ჯერ არცერთი შეფასება არ დაუტოვებია.
              </p>
            ) : (
              reviews.map((r: any) => (
                <Link
                  key={r.id}
                  to={`/place/${r.place_id}`}
                  className="bg-[color:var(--color-surface)] border border-[color:var(--color-stone)] rounded-xl p-3 hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-sm text-[color:var(--color-forest)]">
                    {r.place_name}
                  </div>
                  {r.text && (
                    <p className="text-sm text-[color:var(--color-ink-soft)] mt-1">
                      {r.text}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "favorites" &&
          (!isSelf && !user.favorites_public ? (
            <p className="text-sm text-[color:var(--color-ink-soft)] sm:col-span-2 flex items-center gap-2">
              <Lock size={14} /> ეს სია პირადია.
            </p>
          ) : favorites.length === 0 ? (
            <p className="text-sm text-[color:var(--color-ink-soft)] sm:col-span-2">
              სია ცარიელია.
            </p>
          ) : (
            favorites.map((p: any) => <PlaceCard key={p.id} place={p} />)
          ))}

        {tab === "visits" &&
          (!isSelf && !user.visits_public ? (
            <p className="text-sm text-[color:var(--color-ink-soft)] sm:col-span-2 flex items-center gap-2">
              <Lock size={14} /> ეს სია პირადია.
            </p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-[color:var(--color-ink-soft)] sm:col-span-2">
              სია ცარიელია.
            </p>
          ) : (
            visits.map((p: any) => <PlaceCard key={p.id} place={p} />)
          ))}
      </div>
    </div>
  );
}
