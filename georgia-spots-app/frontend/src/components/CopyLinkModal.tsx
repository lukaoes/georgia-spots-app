import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Lock } from "../icons";

export function CopyLinkModal({
  title,
  description,
  value,
  onClose,
}: {
  title: string;
  description: string;
  value: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may be unavailable (e.g. non-HTTPS) - select the text instead
      const el = document.getElementById("copy-link-modal-input") as HTMLInputElement | null;
      el?.select();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[3000] bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-[color:var(--color-surface)] rounded-2xl p-6 max-w-md w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[color:var(--color-ink-soft)]"
          aria-label="დახურვა"
        >
          <X size={18} />
        </button>
        <div className="w-12 h-12 rounded-full bg-[color:var(--color-bg)] flex items-center justify-center mb-4 text-[color:var(--color-forest)]">
          <Lock size={22} />
        </div>
        <h3 className="font-display text-lg font-semibold text-[color:var(--color-forest)] mb-2">{title}</h3>
        <p className="text-sm text-[color:var(--color-ink-soft)] mb-4">{description}</p>

        <div className="flex gap-2 mb-2">
          <input
            id="copy-link-modal-input"
            readOnly
            value={value}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 rounded-lg border border-[color:var(--color-stone-dark)] px-3 py-2 text-sm bg-[color:var(--color-bg)]"
          />
          <button
            onClick={copy}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
              copied ? "bg-[color:var(--color-moss)] text-white" : "bg-[color:var(--color-forest)] text-white hover:bg-[color:var(--color-forest-dark)]"
            }`}
          >
            {copied ? "დაკოპირდა!" : "კოპირება"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-[color:var(--color-ink-soft)] mt-3"
        >
          დახურვა
        </button>
      </div>
    </div>,
    document.body
  );
}
