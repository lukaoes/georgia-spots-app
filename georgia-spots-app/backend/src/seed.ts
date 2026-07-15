import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "./db";
import { inferRegion } from "./regions";

async function seed() {
  const existing = db.prepare("SELECT COUNT(*) as c FROM places").get() as any;
  if (existing.c > 0) {
    console.log("მონაცემები უკვე არსებობს, სიდი გამოტოვებულია.");
    return;
  }

  const hash = await bcrypt.hash("password123", 10);
  const userId = uuid();
  db.prepare(
    "INSERT INTO users (id, name, username, email, password_hash, is_admin, agreed_pledge) VALUES (?,?,?,?,?,1,1)"
  ).run(userId, "Georgia Spots", "admin", "demo@georgiaspots.ge", hash);

  const places = [
    {
      name: "ჯვრის უღელტეხილი, ყაზბეგის გზა",
      description: "ულამაზესი ხედი ყაზბეგზე. ღამის გასათევად კარგი ადგილია, ზაფხულში ბევრი ვენიანელი ჩერდება.",
      lat: 42.5322, lng: 44.5389,
      category: "wild_spot", is_free: 1, environment: "mountain", surface: "gravel",
      road_difficulty: "easy", quietness: "quiet", shade: 0, ground_level: "flat",
    },
    {
      name: "სვეტიცხოვლის მიმდებარე პარკინგი, მცხეთა",
      description: "ფასიანი პარკინგი ტურისტული ავტობუსებისთვის და კემპერებისთვის, ცენტრთან ახლოს.",
      lat: 41.8453, lng: 44.7197,
      category: "paid_parking", is_free: 0, price_amount: 10, environment: "city", surface: "tarmac",
      road_difficulty: "easy", quietness: "moderate", shade: 1, ground_level: "flat",
      service_toilet: 1,
    },
    {
      name: "სიღნაღის ველი, კახეთი",
      description: "ვენახებს შორის მშვიდი ადგილი ღამისთვის, ულამაზესი მზის ჩასვლა ალაზნის ველზე.",
      lat: 41.6194, lng: 45.9219,
      category: "wild_spot", is_free: 1, environment: "vineyard", surface: "grass",
      road_difficulty: "easy", quietness: "quiet", shade: 0, ground_level: "flat",
    },
    {
      name: "ბათუმის ბულვარი, საზღვაო სადგომი",
      description: "ზღვასთან ახლოს ფასიანი პარკინგი წყლის და ელექტროენერგიის წვდომით.",
      lat: 41.6367, lng: 41.6367,
      category: "service_area", is_free: 0, price_amount: 25, environment: "sea", surface: "tarmac",
      road_difficulty: "easy", quietness: "moderate", shade: 0, ground_level: "flat",
      service_water: 1, service_electricity: 1, service_toilet: 1, service_shower: 1,
    },
    {
      name: "მესტიის ცენტრალური მოედანი",
      description: "თავისუფალი პარკინგი მთის ხედით, ზამთარში ძნელად მისადგომია თოვლის გამო.",
      lat: 43.0450, lng: 42.7220,
      category: "free_parking", is_free: 1, environment: "mountain", surface: "gravel",
      road_difficulty: "gravel", quietness: "moderate", shade: 0, ground_level: "flat",
    },
    {
      name: "უშგულის თავზე, ველური სივრცე",
      description: "საჭიროა მაღალი გამავლობის მანქანა. ულამაზესი ხედი ხუთმთის მასივზე.",
      lat: 42.9139, lng: 43.0086,
      category: "4x4_spot", is_free: 1, environment: "mountain", surface: "dirt",
      road_difficulty: "4x4_required", quietness: "quiet", shade: 0, ground_level: "sloped",
    },
    {
      name: "ვარძიის მიმდებარე კემპინგი",
      description: "ორგანიზებული კემპინგი შხაპით და ტუალეტით, გამოქვაბულების მონასტრიდან 5 წუთში.",
      lat: 41.4453, lng: 43.2739,
      category: "campsite", is_free: 0, price_amount: 15, environment: "mountain", surface: "gravel",
      road_difficulty: "easy", quietness: "quiet", shade: 1, ground_level: "flat",
      service_water: 1, service_toilet: 1, service_shower: 1,
    },
    {
      name: "ბორჯომის ხეობა, მდინარის პირას",
      description: "ტყით დაფარული ველური ადგილი მდინარის პირას, კარგი შუშხუნა ხმა ღამით.",
      lat: 41.8420, lng: 43.3928,
      category: "wild_spot", is_free: 1, environment: "river", surface: "dirt",
      road_difficulty: "gravel", quietness: "quiet", shade: 1, ground_level: "flat",
    },
    {
      name: "ომალოს ფერმის სახლი, თუშეთი",
      description: "ადგილობრივი ოჯახის ფერმა, სადაც შეგიძლიათ შეჩერდეთ და იყიდოთ ადგილობრივი პროდუქტი.",
      lat: 42.2072, lng: 45.6136,
      category: "farm_stay", is_free: 0, price_amount: 20, environment: "mountain", surface: "grass",
      road_difficulty: "4x4_required", quietness: "quiet", shade: 0, ground_level: "sloped",
      pets_allowed: 1,
    },
    {
      name: "ვაშლოვანის ეროვნული პარკის პიკნიკის ზონა",
      description: "ნახევარუდაბნოს პეიზაჟი, ჩრდილიანი პიკნიკის მაგიდები, კარგია დღის შესვენებისთვის.",
      lat: 41.5211, lng: 46.6753,
      category: "picnic_area", is_free: 1, environment: "countryside", surface: "dirt",
      road_difficulty: "gravel", quietness: "quiet", shade: 1, ground_level: "flat",
    },
    {
      name: "ყაზბეგის სამების ეკლესიის ძირი",
      description: "პოპულარული ღამის გასათევი ადგილი, ხშირად სავსეა ზაფხულში, საჭიროა ადრე ჩამოსვლა.",
      lat: 42.6608, lng: 44.6183,
      category: "wild_spot", is_free: 1, environment: "mountain", surface: "gravel",
      road_difficulty: "gravel", quietness: "moderate", shade: 0, ground_level: "sloped",
    },
    {
      name: "ურეკის შავი ქვიშის სანაპირო",
      description: "სანაპირო პარკინგი ზღვასთან, ზაფხულში ფასიანი, დანარჩენ სეზონზე თავისუფალი.",
      lat: 41.9906, lng: 41.7500,
      category: "free_parking", is_free: 1, environment: "sea", surface: "sand",
      road_difficulty: "easy", quietness: "moderate", shade: 0, ground_level: "flat",
    },
  ];

  const insertPlace = db.prepare(`
    INSERT INTO places (
      id, owner_id, name, description, lat, lng, category, region, is_free, price_amount,
      service_water, service_dump, service_electricity, service_shower, service_toilet, service_wifi, service_shop,
      vehicle_type, road_difficulty, surface, environment, open_all_year, pets_allowed, quietness, shade, ground_level, status
    ) VALUES (@id, @owner_id, @name, @description, @lat, @lng, @category, @region, @is_free, @price_amount,
      @service_water, @service_dump, @service_electricity, @service_shower, @service_toilet, @service_wifi, @service_shop,
      @vehicle_type, @road_difficulty, @surface, @environment, @open_all_year, @pets_allowed, @quietness, @shade, @ground_level, 'approved')
  `);

  for (const p of places) {
    insertPlace.run({
      id: uuid(),
      owner_id: userId,
      name: p.name,
      description: p.description,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      region: inferRegion(p.lat, p.lng),
      is_free: p.is_free ?? 1,
      price_amount: (p as any).price_amount ?? null,
      service_water: (p as any).service_water ?? 0,
      service_dump: (p as any).service_dump ?? 0,
      service_electricity: (p as any).service_electricity ?? 0,
      service_shower: (p as any).service_shower ?? 0,
      service_toilet: (p as any).service_toilet ?? 0,
      service_wifi: (p as any).service_wifi ?? 0,
      service_shop: (p as any).service_shop ?? 0,
      vehicle_type: "any",
      road_difficulty: p.road_difficulty,
      surface: p.surface,
      environment: p.environment,
      open_all_year: 1,
      pets_allowed: (p as any).pets_allowed ?? 1,
      quietness: p.quietness,
      shade: p.shade,
      ground_level: p.ground_level,
    });
  }

  console.log(
    `დაემატა ${places.length} ადგილი. დემო ადმინისტრატორის ანგარიში: demo@georgiaspots.ge / password123`
  );
}

seed().then(() => process.exit(0));
