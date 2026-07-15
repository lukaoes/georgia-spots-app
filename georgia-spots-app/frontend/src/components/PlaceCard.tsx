import { useNavigate } from "react-router-dom";
import { categoryLabel } from "../constants";
import { CategoryIcon } from "../icons";
import { StarRating } from "./StarRating";
import { useAuthGate } from "../AuthGate";

interface Place {
  id: string;
  name: string;
  category: string;
  is_free: boolean;
  price_amount: number | null;
  avg_rating: number | null;
  review_count: number;
  cover_photo: string | null;
  environment: string;
}

export function PlaceCard({ place }: { place: Place }) {
  const { requireAuth } = useAuthGate();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => requireAuth(() => navigate(`/place/${place.id}`))}
      className="flex gap-3 text-left bg-[color:var(--color-surface)] rounded-xl border border-[color:var(--color-stone)] p-3 hover:shadow-md hover:border-[color:var(--color-moss)] transition-all"
    >
      <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-[color:var(--color-stone)] flex items-center justify-center">
        {place.cover_photo ? (
          <img src={place.cover_photo} alt={place.name} className="w-full h-full object-cover" />
        ) : (
          <CategoryIcon category={place.category} size={26} className="text-[color:var(--color-forest)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-[color:var(--color-forest)] truncate">{place.name}</div>
        <div className="text-xs text-[color:var(--color-ink-soft)] mb-1">{categoryLabel(place.category)}</div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{place.is_free ? "უფასო" : `${place.price_amount ?? "?"} ₾`}</span>
          {place.review_count > 0 && place.avg_rating ? (
            <span className="flex items-center gap-1 text-xs">
              <StarRating value={place.avg_rating} size={13} />
              <span className="text-[color:var(--color-ink-soft)]">({place.review_count})</span>
            </span>
          ) : (
            <span className="text-xs text-[color:var(--color-ink-soft)]">ჯერ არ არის შეფასებული</span>
          )}
        </div>
      </div>
    </button>
  );
}
