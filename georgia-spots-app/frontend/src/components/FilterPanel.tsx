import {
  CATEGORIES,
  REGIONS,
  VEHICLE_TYPES,
  ROAD_DIFFICULTY,
  SURFACES,
  ENVIRONMENTS,
  QUIETNESS,
  GROUND_LEVELS,
  SERVICES,
} from "../constants";
import { ServiceIcon } from "../icons";

export interface Filters {
  category?: string;
  is_free?: string;
  vehicle_type?: string;
  road_difficulty?: string;
  surface?: string;
  environment?: string;
  quietness?: string;
  ground_level?: string;
  open_all_year?: string;
  pets_allowed?: string;
  shade?: string;
  [service: string]: string | undefined;
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[color:var(--color-ink-soft)] font-medium">{label}</span>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[color:var(--color-stone-dark)] bg-white px-3 py-2 text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-moss)]"
      >
        <option value="">ყველა</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
}) {
  function set(key: string, value: string) {
    onChange({ ...filters, [key]: value });
  }
  function toggleService(key: string) {
    onChange({ ...filters, [key]: filters[key] === "true" ? "" : "true" });
  }

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-[color:var(--color-forest)]">ფილტრები</h2>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-xs text-[color:var(--color-clay)] underline">
            გასუფთავება ({activeCount})
          </button>
        )}
      </div>

      <Select label="კატეგორია" value={filters.category} onChange={(v) => set("category", v)} options={CATEGORIES} />
      <Select label="რეგიონი" value={filters.region} onChange={(v) => set("region", v)} options={REGIONS} />

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-[color:var(--color-ink-soft)] font-medium">ფასი</span>
        <div className="flex gap-2">
          {[
            { v: "true", l: "უფასო" },
            { v: "false", l: "ფასიანი" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => set("is_free", filters.is_free === o.v ? "" : o.v)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filters.is_free === o.v
                  ? "bg-[color:var(--color-forest)] text-white border-[color:var(--color-forest)]"
                  : "border-[color:var(--color-stone-dark)] text-[color:var(--color-ink)]"
              }`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <Select label="ტრანსპორტი" value={filters.vehicle_type} onChange={(v) => set("vehicle_type", v)} options={VEHICLE_TYPES} />
      <Select label="გზის სირთულე" value={filters.road_difficulty} onChange={(v) => set("road_difficulty", v)} options={ROAD_DIFFICULTY} />
      <Select label="საფარი" value={filters.surface} onChange={(v) => set("surface", v)} options={SURFACES} />
      <Select label="გარემო" value={filters.environment} onChange={(v) => set("environment", v)} options={ENVIRONMENTS} />
      <Select label="სიმშვიდე" value={filters.quietness} onChange={(v) => set("quietness", v)} options={QUIETNESS} />
      <Select label="რელიეფი" value={filters.ground_level} onChange={(v) => set("ground_level", v)} options={GROUND_LEVELS} />

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-[color:var(--color-ink-soft)] font-medium">დამატებით</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => set("open_all_year", filters.open_all_year === "true" ? "" : "true")}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filters.open_all_year === "true"
                ? "bg-[color:var(--color-forest)] text-white border-[color:var(--color-forest)]"
                : "border-[color:var(--color-stone-dark)]"
            }`}
          >
            მთელი წლის განმავლობაში
          </button>
          <button
            onClick={() => set("pets_allowed", filters.pets_allowed === "true" ? "" : "true")}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filters.pets_allowed === "true"
                ? "bg-[color:var(--color-forest)] text-white border-[color:var(--color-forest)]"
                : "border-[color:var(--color-stone-dark)]"
            }`}
          >
            შინაური ცხოველები დაშვებულია
          </button>
          <button
            onClick={() => set("shade", filters.shade === "true" ? "" : "true")}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filters.shade === "true"
                ? "bg-[color:var(--color-forest)] text-white border-[color:var(--color-forest)]"
                : "border-[color:var(--color-stone-dark)]"
            }`}
          >
            ჩრდილიანი
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-[color:var(--color-ink-soft)] font-medium">სერვისები</span>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <button
              key={s.key}
              onClick={() => toggleService(s.key)}
              className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-1.5 ${
                filters[s.key] === "true"
                  ? "bg-[color:var(--color-moss)] text-white border-[color:var(--color-moss)]"
                  : "border-[color:var(--color-stone-dark)]"
              }`}
            >
              <ServiceIcon service={s.key} size={14} /> {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
