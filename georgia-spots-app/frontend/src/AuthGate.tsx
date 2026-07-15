import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Lock, X } from "./icons";

interface AuthGateState {
  requireAuth: (onAllowed: () => void) => void;
}

const AuthGateContext = createContext<AuthGateState | null>(null);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function requireAuth(onAllowed: () => void) {
    if (user) {
      onAllowed();
    } else {
      setOpen(true);
    }
  }

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[3000] bg-black/50 flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[color:var(--color-surface)] rounded-2xl p-6 max-w-sm w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-[color:var(--color-ink-soft)]"
              aria-label="დახურვა"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-full bg-[color:var(--color-bg)] flex items-center justify-center mb-4 text-[color:var(--color-forest)]">
              <Lock size={22} />
            </div>
            <h3 className="font-display text-lg font-semibold text-[color:var(--color-forest)] mb-2">
              დეტალების სანახავად საჭიროა ავტორიზაცია
            </h3>
            <p className="text-sm text-[color:var(--color-ink-soft)] mb-5">
              რუკაზე ყველას შეუძლია ადგილების ნახვა, მაგრამ დეტალების, ფოტოების და შეფასებების სანახავად საჭიროა უფასო ანგარიშის შექმნა.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/register");
                }}
                className="flex-1 bg-[color:var(--color-forest)] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[color:var(--color-forest-dark)]"
              >
                რეგისტრაცია
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/login");
                }}
                className="flex-1 border border-[color:var(--color-stone-dark)] rounded-lg py-2.5 text-sm font-medium hover:bg-[color:var(--color-bg)]"
              >
                შესვლა
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used within AuthGateProvider");
  return ctx;
}
