import { Star } from "../icons";

export function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`შეფასება ${value} 5-დან`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rounded ? "text-[color:var(--color-gold)]" : "text-[color:var(--color-stone-dark)]"}
          fill={n <= rounded ? "currentColor" : "none"}
          strokeWidth={1.75}
        />
      ))}
    </span>
  );
}

export function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          aria-label={`${n} ვარსკვლავი`}
          className="hover:scale-110 transition-transform text-[color:var(--color-gold)]"
        >
          <Star size={26} fill={n <= value ? "currentColor" : "none"} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}
