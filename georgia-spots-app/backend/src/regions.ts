// Assigns each place to the nearest known anchor town/landmark, then maps that anchor back
// to its region. This is an offline, dependency-free approximation (no external geocoding
// calls) — using several anchors per region (rather than one centroid) handles Georgia's
// long, irregularly-shaped regions (e.g. Samegrelo-Zemo Svaneti stretching from the coast at
// Zugdidi up into the high mountains around Mestia) much better than a single center point.
// It's precise enough for a filter/label feature, though places very close to a genuine
// border may occasionally land on the "wrong" side.

export interface RegionDef {
  key: string;
  label: string;
}

export const REGIONS: RegionDef[] = [
  { key: "tbilisi", label: "თბილისი" },
  { key: "kvemo_kartli", label: "ქვემო ქართლი" },
  { key: "shida_kartli", label: "შიდა ქართლი" },
  { key: "mtskheta_mtianeti", label: "მცხეთა-მთიანეთი" },
  { key: "kakheti", label: "კახეთი" },
  { key: "samtskhe_javakheti", label: "სამცხე-ჯავახეთი" },
  { key: "imereti", label: "იმერეთი" },
  { key: "racha_lechkhumi", label: "რაჭა-ლეჩხუმი და ქვემო სვანეთი" },
  { key: "samegrelo_zemo_svaneti", label: "სამეგრელო-ზემო სვანეთი" },
  { key: "guria", label: "გურია" },
  { key: "adjara", label: "აჭარა" },
  { key: "abkhazia", label: "აფხაზეთი" },
];

interface Anchor {
  region: string;
  lat: number;
  lng: number;
}

const ANCHORS: Anchor[] = [
  { region: "tbilisi", lat: 41.7151, lng: 44.8271 },
  { region: "kvemo_kartli", lat: 41.5495, lng: 45.0092 }, // Rustavi
  { region: "kvemo_kartli", lat: 41.4453, lng: 44.5386 }, // Bolnisi
  { region: "shida_kartli", lat: 41.9847, lng: 44.1088 }, // Gori
  { region: "shida_kartli", lat: 41.9256, lng: 44.4234 }, // Kaspi
  { region: "mtskheta_mtianeti", lat: 41.8453, lng: 44.7197 }, // Mtskheta
  { region: "mtskheta_mtianeti", lat: 42.6567, lng: 44.6428 }, // Stepantsminda / Kazbegi
  { region: "mtskheta_mtianeti", lat: 42.0764, lng: 44.7 }, // Dusheti
  { region: "kakheti", lat: 41.9163, lng: 45.4738 }, // Telavi
  { region: "kakheti", lat: 41.6194, lng: 45.9219 }, // Sighnaghi
  { region: "kakheti", lat: 41.8258, lng: 46.2725 }, // Lagodekhi
  { region: "samtskhe_javakheti", lat: 41.64, lng: 42.9814 }, // Akhaltsikhe
  { region: "samtskhe_javakheti", lat: 41.842, lng: 43.3928 }, // Borjomi
  { region: "samtskhe_javakheti", lat: 41.25, lng: 43.5833 }, // Ninotsminda
  { region: "imereti", lat: 42.2662, lng: 42.718 }, // Kutaisi
  { region: "imereti", lat: 42.115, lng: 43.045 }, // Zestaponi
  { region: "racha_lechkhumi", lat: 42.5228, lng: 43.15 }, // Ambrolauri
  { region: "racha_lechkhumi", lat: 42.5828, lng: 43.4467 }, // Oni
  { region: "samegrelo_zemo_svaneti", lat: 42.5088, lng: 41.8709 }, // Zugdidi
  { region: "samegrelo_zemo_svaneti", lat: 42.15, lng: 41.67 }, // Poti
  { region: "samegrelo_zemo_svaneti", lat: 43.045, lng: 42.722 }, // Mestia
  { region: "samegrelo_zemo_svaneti", lat: 42.9139, lng: 43.0086 }, // Ushguli
  { region: "guria", lat: 41.9261, lng: 41.9989 }, // Ozurgeti
  { region: "guria", lat: 42.0964, lng: 41.9878 }, // Lanchkhuti
  { region: "adjara", lat: 41.6168, lng: 41.6367 }, // Batumi
  { region: "adjara", lat: 41.6394, lng: 42.3053 }, // Khulo
  { region: "abkhazia", lat: 43.0033, lng: 41.0219 }, // Sukhumi
  { region: "abkhazia", lat: 43.3197, lng: 40.2306 }, // Gagra
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inferRegion(lat: number, lng: number): string {
  let best = ANCHORS[0];
  let bestDist = Infinity;
  for (const a of ANCHORS) {
    const d = haversineKm(lat, lng, a.lat, a.lng);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best.region;
}

export function regionLabel(key: string | null): string {
  return REGIONS.find((r) => r.key === key)?.label || "უცნობი";
}
