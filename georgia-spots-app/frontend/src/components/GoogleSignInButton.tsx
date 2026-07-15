import { useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function GoogleSignInButton({ onDone, agreedPledge }: { onDone?: () => void; agreedPledge?: boolean }) {
  const { loginWithGoogle } = useAuth();
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function render() {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response: { credential: string }) => {
          try {
            await loginWithGoogle(response.credential, !!agreedPledge);
            onDone?.();
          } catch (err: any) {
            alert(err.message || "Google-ით შესვლა ვერ მოხერხდა");
          }
        },
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280,
      });
    }

    if (window.google) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);
  }, [agreedPledge]);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="flex items-center gap-2 w-full text-xs text-[color:var(--color-ink-soft)]">
        <div className="flex-1 h-px bg-[color:var(--color-stone)]" />
        ან
        <div className="flex-1 h-px bg-[color:var(--color-stone)]" />
      </div>
      <div ref={divRef} />
    </div>
  );
}
