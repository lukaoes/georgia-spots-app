import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pledge, setPledge] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pledge) {
      setError("გასაგრძელებლად საჭიროა თანხმობა ბუნების დაცვის პირობაზე");
      return;
    }
    setBusy(true);
    try {
      await register(name, username.toLowerCase(), email, password, pledge);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12 px-4 pb-12">
      <h1 className="font-display text-2xl font-semibold text-[color:var(--color-forest)] mb-1">რეგისტრაცია</h1>
      <p className="text-sm text-[color:var(--color-ink-soft)] mb-6">
        შექმენით ანგარიში, რომ ნახოთ ადგილების დეტალები, დაამატოთ ადგილები და დატოვოთ შეფასებები.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="სახელი"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
        />
        <div>
          <input
            required
            placeholder="მომხმარებლის სახელი (username)"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            pattern="[a-z0-9_]{3,24}"
            title="3-24 სიმბოლო: ლათინური ასოები, ციფრები, ქვედა ტირე"
            className="w-full rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
          />
          <p className="text-xs text-[color:var(--color-ink-soft)] mt-1">
            თქვენი პროფილის ბმული იქნება: /users/{username || "username"}
          </p>
        </div>
        <input
          type="email"
          required
          placeholder="ელ-ფოსტა"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="პაროლი (მინ. 6 სიმბოლო)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
        />

        <label className="flex items-start gap-2 text-sm bg-[color:var(--color-bg)] rounded-lg p-3 mt-1">
          <input
            type="checkbox"
            checked={pledge}
            onChange={(e) => setPledge(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>ვპირდები, რომ ადგილს დავტოვებ ისეთივე სუფთა, როგორც დამხვდა</strong> — ნაგავს არ დავტოვებ და პატივს ვცემ ბუნებას და ადგილობრივ თემს.
          </span>
        </label>

        {error && <p className="text-sm text-[color:var(--color-clay)]">{error}</p>}
        <button
          disabled={busy || !pledge}
          className="bg-[color:var(--color-forest)] text-white rounded-lg py-2 font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
        >
          {busy ? "..." : "რეგისტრაცია"}
        </button>
      </form>

      <div className="mt-4">
        {pledge ? (
          <GoogleSignInButton agreedPledge={pledge} onDone={() => navigate("/")} />
        ) : (
          <p className="text-xs text-center text-[color:var(--color-ink-soft)] mt-2">
            მონიშნეთ ზემოთ თანხმობა Google-ით გასაგრძელებლად
          </p>
        )}
      </div>

      <p className="text-sm text-[color:var(--color-ink-soft)] mt-4">
        უკვე გაქვთ ანგარიში?{" "}
        <Link to="/login" className="text-[color:var(--color-clay)] underline">
          შედით სისტემაში
        </Link>
      </p>
    </div>
  );
}
