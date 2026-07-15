import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

function ForgotPasswordForm({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.requestPasswordReset(email, username, message);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="bg-[color:var(--color-bg)] rounded-lg p-4 text-sm mt-2">
        <p className="text-[color:var(--color-forest)] font-medium mb-1">მოთხოვნა გაიგზავნა.</p>
        <p className="text-[color:var(--color-ink-soft)]">
          თქვენი მოთხოვნა გაეგზავნა ადმინისტრატორს — ის შეამოწმებს მას და ხელით გამოგიგზავნით აღდგენის ბმულს ან დროებით
          პაროლს იმ ელ-ფოსტაზე, რომელიც მიუთითეთ.
        </p>
        <button onClick={onClose} className="text-[color:var(--color-clay)] underline mt-2 text-sm">
          დახურვა
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-[color:var(--color-bg)] rounded-lg p-4 flex flex-col gap-2 mt-2">
      <p className="text-xs text-[color:var(--color-ink-soft)] mb-1">
        მიუთითეთ თქვენი ელ-ფოსტა და მომხმარებლის სახელი — ადმინისტრატორი დაინახავს მოთხოვნას და ხელით გამოგიგზავნით
        პაროლის აღდგენის ბმულს იმ ელ-ფოსტაზე, როცა ის შეამჩნევს მას.
      </p>
      <input
        type="email"
        required
        placeholder="ელ-ფოსტა"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="მომხმარებლის სახელი (username)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2 text-sm"
      />
      <textarea
        placeholder="დამატებითი შენიშვნა (არასავალდებულო)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-[color:var(--color-clay)]">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="flex-1 bg-[color:var(--color-forest)] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
        >
          {busy ? "..." : "მოთხოვნის გაგზავნა"}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-[color:var(--color-ink-soft)] px-3">
          გაუქმება
        </button>
      </div>
    </form>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h1 className="font-display text-2xl font-semibold text-[color:var(--color-forest)] mb-1">შესვლა</h1>
      <p className="text-sm text-[color:var(--color-ink-soft)] mb-6">
        დემო ანგარიში: demo@georgiaspots.ge / password123
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
          placeholder="პაროლი"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
        />
        {error && <p className="text-sm text-[color:var(--color-clay)]">{error}</p>}
        <button
          disabled={busy}
          className="bg-[color:var(--color-forest)] text-white rounded-lg py-2 font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
        >
          {busy ? "..." : "შესვლა"}
        </button>
      </form>

      <button
        onClick={() => setShowForgot((v) => !v)}
        className="text-xs text-[color:var(--color-clay)] underline mt-3"
      >
        დაგავიწყდათ პაროლი?
      </button>
      {showForgot && <ForgotPasswordForm onClose={() => setShowForgot(false)} />}

      <div className="mt-4">
        <GoogleSignInButton agreedPledge={true} onDone={() => navigate("/")} />
      </div>

      <p className="text-sm text-[color:var(--color-ink-soft)] mt-4">
        არ გაქვთ ანგარიში?{" "}
        <Link to="/register" className="text-[color:var(--color-clay)] underline">
          დარეგისტრირდით
        </Link>
      </p>
    </div>
  );
}
