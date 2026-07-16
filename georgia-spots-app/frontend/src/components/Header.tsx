import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Tent, Plus, Shield, CircleUser, LogOut } from "../icons";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-[1000] bg-[color:var(--color-forest)] text-[#F2F0E4] shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <Tent size={24} strokeWidth={2} />
          <span className="font-display text-xl font-semibold tracking-wide group-hover:opacity-90">
            Vanlife.Ge
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link
                to="/add"
                className="hidden sm:inline-flex items-center gap-1.5 bg-[color:var(--color-clay)] hover:bg-[color:var(--color-clay-dark)] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
              >
                <Plus size={16} /> ადგილის დამატება
              </Link>
              <Link
                to="/add"
                className="sm:hidden bg-[color:var(--color-clay)] text-white p-2 rounded-full"
                aria-label="ადგილის დამატება"
              >
                <Plus size={18} />
              </Link>
              {user.is_admin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-sm font-medium hover:text-[#D9D4BE]"
                  title="ადმინ პანელი"
                >
                  <Shield size={18} />
                  <span className="hidden sm:inline">ადმინი</span>
                </Link>
              )}
              <Link
                to={`/users/${user.username}`}
                className="flex items-center gap-1.5 text-sm text-[#D9D4BE] hover:text-white"
                title={user.name}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <CircleUser size={20} />
                )}
                <span className="hidden md:inline">{user.name}</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                aria-label="გასვლა"
                className="text-[#D9D4BE] hover:text-white"
                title="გასვლა"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium hover:text-[#D9D4BE]"
              >
                შესვლა
              </Link>
              <Link
                to="/register"
                className="bg-[color:var(--color-clay)] hover:bg-[color:var(--color-clay-dark)] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
              >
                რეგისტრაცია
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="contour-divider" />
    </header>
  );
}
