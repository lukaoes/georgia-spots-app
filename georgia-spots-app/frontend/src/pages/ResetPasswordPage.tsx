import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";

export function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ username: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .getResetTokenInfo(token)
      .then(setInfo)
      .catch((e) => setError(e.message));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს");
      return;
    }
    if (password !== confirm) {
      setError("პაროლები არ ემთხვევა");
      return;
    }
    if (!token) return;
    setBusy(true);
    try {
      await api.submitNewPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !info) {
    return (
      <div className="max-w-sm mx-auto mt-16 px-4 text-center">
        <p className="text-[color:var(--color-clay)] mb-4">{error}</p>
        <Link to="/login" className="text-[color:var(--color-clay)] underline text-sm">
          უკან შესვლის გვერდზე
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto mt-16 px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-[color:var(--color-forest)] mb-2">პაროლი განახლდა</h1>
        <p className="text-sm text-[color:var(--color-ink-soft)]">ახლა შეგიძლიათ შეხვიდეთ ახალი პაროლით. გადამისამართდებით...</p>
      </div>
    );
  }

  if (!info) {
    return <p className="text-center mt-16 text-[color:var(--color-ink-soft)]">იტვირთება...</p>;
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h1 className="font-display text-2xl font-semibold text-[color:var(--color-forest)] mb-1">ახალი პაროლის დაყენება</h1>
      <p className="text-sm text-[color:var(--color-ink-soft)] mb-6">აირჩიეთ ახალი პაროლი თქვენი ანგარიშისთვის.</p>

      <div className="bg-[color:var(--color-bg)] rounded-lg p-3 mb-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-[color:var(--color-ink-soft)]">მომხმარებელი</span>
          <span className="font-medium">@{info.username}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-[color:var(--color-ink-soft)]">ელ-ფოსტა</span>
          <span className="font-medium">{info.email}</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          required
          placeholder="ახალი პაროლი (მინ. 6 სიმბოლო)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="გაიმეორეთ პაროლი"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2"
        />
        {error && <p className="text-sm text-[color:var(--color-clay)]">{error}</p>}
        <button
          disabled={busy}
          className="bg-[color:var(--color-forest)] text-white rounded-lg py-2 font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-60"
        >
          {busy ? "..." : "პაროლის დაყენება"}
        </button>
      </form>
    </div>
  );
}
