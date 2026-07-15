export const CATEGORIES: { value: string; label: string }[] = [
  { value: "campsite", label: "კემპინგი" },
  { value: "service_area", label: "სერვის ზონა" },
  { value: "farm_stay", label: "ფერმის სახლი" },
  { value: "picnic_area", label: "პიკნიკის ადგილი" },
  { value: "free_parking", label: "უფასო პარკინგი" },
  { value: "paid_parking", label: "ფასიანი პარკინგი" },
  { value: "wild_spot", label: "ველური სივრცე" },
  { value: "4x4_spot", label: "4x4 ადგილი" },
  { value: "water_point", label: "წყლის წერტილი" },
  { value: "other", label: "სხვა" },
];

export const REGIONS: { value: string; label: string }[] = [
  { value: "tbilisi", label: "თბილისი" },
  { value: "kvemo_kartli", label: "ქვემო ქართლი" },
  { value: "shida_kartli", label: "შიდა ქართლი" },
  { value: "mtskheta_mtianeti", label: "მცხეთა-მთიანეთი" },
  { value: "kakheti", label: "კახეთი" },
  { value: "samtskhe_javakheti", label: "სამცხე-ჯავახეთი" },
  { value: "imereti", label: "იმერეთი" },
  { value: "racha_lechkhumi", label: "რაჭა-ლეჩხუმი და ქვემო სვანეთი" },
  { value: "samegrelo_zemo_svaneti", label: "სამეგრელო-ზემო სვანეთი" },
  { value: "guria", label: "გურია" },
  { value: "adjara", label: "აჭარა" },
  { value: "abkhazia", label: "აფხაზეთი" },
];

export const VEHICLE_TYPES = [
  { value: "any", label: "ნებისმიერი" },
  { value: "car_trailer", label: "მანქანა + მისაბმელი" },
  { value: "van", label: "ფურგონი" },
  { value: "motorhome", label: "ავტოსახლი" },
  { value: "4x4_only", label: "მხოლოდ 4x4" },
];

export const ROAD_DIFFICULTY = [
  { value: "easy", label: "მარტივი გზა" },
  { value: "gravel", label: "მოხრეშილი გზა" },
  { value: "4x4_required", label: "საჭიროა 4x4" },
];

export const SURFACES = [
  { value: "tarmac", label: "ასფალტი" },
  { value: "gravel", label: "ხრეში" },
  { value: "grass", label: "მწვანე მოედანი" },
  { value: "sand", label: "ქვიშა" },
  { value: "dirt", label: "მიწა" },
];

export const ENVIRONMENTS = [
  { value: "mountain", label: "მთა" },
  { value: "forest", label: "ტყე" },
  { value: "lake", label: "ტბა" },
  { value: "river", label: "მდინარე" },
  { value: "sea", label: "ზღვა" },
  { value: "city", label: "ქალაქი" },
  { value: "countryside", label: "სოფლის რაიონი" },
  { value: "vineyard", label: "ვენახი" },
];

export const QUIETNESS = [
  { value: "quiet", label: "მშვიდი" },
  { value: "moderate", label: "საშუალო" },
  { value: "noisy", label: "ხმაურიანი" },
];

export const GROUND_LEVELS = [
  { value: "flat", label: "ბრტყელი" },
  { value: "sloped", label: "დაქანებული" },
];

export const SERVICES: { key: string; label: string }[] = [
  { key: "service_water", label: "სასმელი წყალი" },
  { key: "service_dump", label: "ჩამდინარე წყლის სადგური" },
  { key: "service_electricity", label: "ელექტროენერგია" },
  { key: "service_shower", label: "შხაპი" },
  { key: "service_toilet", label: "ტუალეტი" },
  { key: "service_wifi", label: "Wi-Fi" },
  { key: "service_shop", label: "მაღაზია ახლოს" },
];

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}
export function regionLabel(value: string | null | undefined) {
  if (!value) return "რეგიონი უცნობია";
  return REGIONS.find((r) => r.value === value)?.label || value;
}
export function labelFrom(list: { value: string; label: string }[], value: string) {
  return list.find((c) => c.value === value)?.label || value;
}
