import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import { MapView } from "../components/MapView";
import { FilterPanel } from "../components/FilterPanel";
import type { Filters } from "../components/FilterPanel";
import { PlaceCard } from "../components/PlaceCard";
import { Settings, Navigation, MapIcon, ListIcon, X } from "../icons";

export function MapPage() {
  const [places, setPlaces] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listPlaces(filters as any)
      .then((d) => setPlaces(d.places))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => alert("მდებარეობის დადგენა ვერ მოხერხდა"),
    );
  }

  return (
    <div className="flex flex-col app-shell-height">
      <div className="flex flex-wrap items-center gap-2 gap-y-2 px-3 sm:px-4 py-2 border-b border-[color:var(--color-stone)] bg-[color:var(--color-surface)]">
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium px-2.5 sm:px-3 py-1.5 rounded-full border border-[color:var(--color-stone-dark)] hover:bg-[color:var(--color-bg)] shrink-0"
        >
          <Settings size={15} /> ფილტრები
        </button>
        <button
          onClick={locateMe}
          aria-label="ჩემი მდებარეობა"
          title="ჩემი მდებარეობა"
          className="flex items-center gap-1.5 text-sm font-medium px-2.5 sm:px-3 py-1.5 rounded-full border border-[color:var(--color-stone-dark)] hover:bg-[color:var(--color-bg)] shrink-0"
        >
          <Navigation size={15} />{" "}
          <span className="hidden sm:inline">ჩემი მდებარეობა</span>
        </button>
        <div className="ml-auto flex gap-1 bg-[color:var(--color-bg)] rounded-full p-1 shrink-0">
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-1.5 text-sm px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap ${view === "map" ? "bg-[color:var(--color-forest)] text-white" : ""}`}
          >
            <MapIcon size={14} /> რუკა
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 text-sm px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap ${view === "list" ? "bg-[color:var(--color-forest)] text-white" : ""}`}
          >
            <ListIcon size={14} /> სია{" "}
            <span className="tabular-nums">({places.length})</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {showFilters && (
          <div className="absolute sm:static z-[1001] top-0 left-0 h-full w-full sm:w-80 bg-[color:var(--color-surface)] border-r border-[color:var(--color-stone)] overflow-y-auto shadow-xl sm:shadow-none">
            <div className="sm:hidden flex justify-end p-2">
              <button onClick={() => setShowFilters(false)} className="p-2">
                <X size={20} />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters({})}
            />
          </div>
        )}

        <div className="flex-1 min-h-0">
          {view === "map" ? (
            <MapView places={places} userLocation={userLocation} />
          ) : (
            <div className="h-full overflow-y-auto p-4">
              {loading ? (
                <p className="text-center text-[color:var(--color-ink-soft)] py-10">
                  იტვირთება...
                </p>
              ) : places.length === 0 ? (
                <p className="text-center text-[color:var(--color-ink-soft)] py-10">
                  ამ ფილტრებით ადგილი ვერ მოიძებნა.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
                  {places.map((p) => (
                    <PlaceCard key={p.id} place={p} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
