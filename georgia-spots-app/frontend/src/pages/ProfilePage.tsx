import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";

// Kept as a lightweight redirect so old /profile links/bookmarks still work -
// the real profile experience now lives at /users/:username (own profile included),
// so the URL itself is always a copyable, shareable link.
export function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(`/users/${user.username}`, { replace: true });
  }, [user, navigate]);

  if (loading) return <p className="text-center mt-16 text-[color:var(--color-ink-soft)]">იტვირთება...</p>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 px-4 text-center">
        <p className="text-[color:var(--color-ink-soft)]">
          პროფილის სანახავად საჭიროა{" "}
          <Link to="/login" className="text-[color:var(--color-clay)] underline">
            ავტორიზაცია
          </Link>
          .
        </p>
      </div>
    );
  }

  return null;
}
