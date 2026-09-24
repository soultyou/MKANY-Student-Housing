import { db, apartments, users } from "@workspace/db";
import { sql } from "drizzle-orm";

let isSeeded = false;

export async function ensureSeedApartments() {
  if (isSeeded) return;

  try {
    // 1. Ensure default owners exist
    await db.insert(users).values([
      {
        id: "usr_owner_01",
        fullName: "المهندس محمود عبد العزيز",
        nationalId: "29801011501234",
        phoneNumber: "01287654321",
        email: "owner.mahmoud@mkany.eg",
        university: "جامعة كفر الشيخ",
        role: "owner",
        isVerified: true,
      },
      {
        id: "usr_owner_02",
        fullName: "د. إبراهيم المتولي",
        nationalId: "29505051505678",
        phoneNumber: "01098765432",
        email: "owner.ibrahim@mkany.eg",
        university: "جامعة المنصورة",
        role: "owner",
        isVerified: true,
      },
    ]).onConflictDoNothing();

    // 2. Ensure base 6 apartments exist
    await db.insert(apartments).values([
      {
        id: 1,
        ownerId: "usr_owner_01",
        title: "غرفة مضيئة قرب الجلاء",
        description: "غرفة مضيئة قرب الجلاء، كفر الشيخ متوفرة للطلاب بالقرب من الجامعة",
        pricePerMonth: 950,
        city: "كفر الشيخ",
        address: "شارع الجلاء، كفر الشيخ",
        university: "جامعة كفر الشيخ",
        roomType: "غرفة مزدوجة",
        areaSqm: 105,
        bedrooms: 3,
        bathrooms: 2,
        floor: "الثالث",
        furnishing: "مفروشة بالكامل",
        availableFrom: "١ سبتمبر ٢٠٢٤",
        currentRoommates: 2,
        images: [
          "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ],
        video360Url: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
        verified: true,
        premium: true,
        livabilityScore: 87,
        status: "متاح",
        lat: 31.1107,
        lng: 30.9388,
      },
      {
        id: 2,
        ownerId: "usr_owner_01",
        title: "شقة هادئة للطالبات",
        description: "شقة هادئة للطالبات بشارع النباوي المهندس بكفر الشيخ",
        pricePerMonth: 750,
        city: "كفر الشيخ",
        address: "شارع النباوي المهندس، كفر الشيخ",
        university: "جامعة كفر الشيخ",
        roomType: "غرفة في شقة",
        areaSqm: 120,
        bedrooms: 4,
        bathrooms: 2,
        floor: "الرابع",
        furnishing: "مفروشة بالكامل",
        availableFrom: "١٥ أغسطس ٢٠٢٤",
        currentRoommates: 3,
        images: [
          "https://images.pexels.com/photos/157811/pexels-photo-157811.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ],
        video360Url: null,
        verified: true,
        premium: false,
        livabilityScore: 92,
        status: "متاح",
        lat: 31.1152,
        lng: 30.9422,
      },
      {
        id: 3,
        ownerId: "usr_owner_02",
        title: "استوديو جيهان العصري",
        description: "استوديو عصري ومجهز بشارع جيهان أمام جامعة المنصورة",
        pricePerMonth: 1200,
        city: "المنصورة",
        address: "شارع جيهان، المنصورة",
        university: "جامعة المنصورة",
        roomType: "استوديو",
        areaSqm: 55,
        bedrooms: 1,
        bathrooms: 1,
        floor: "الثاني",
        furnishing: "مفروشة بالكامل",
        availableFrom: "١ أكتوبر ٢٠٢٤",
        currentRoommates: 0,
        images: [
          "https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ],
        video360Url: null,
        verified: true,
        premium: true,
        livabilityScore: 95,
        status: "متاح",
        lat: 31.0425,
        lng: 31.3571,
      },
      {
        id: 4,
        ownerId: "usr_owner_02",
        title: "بيت الطلبة على شارع الجامعة",
        description: "بيت للطلبة مميز على شارع الجامعة بطنطا قبالة الكليات",
        pricePerMonth: 850,
        city: "طنطا",
        address: "شارع الجامعة، طنطا",
        university: "جامعة طنطا",
        roomType: "غرفة مزدوجة",
        areaSqm: 98,
        bedrooms: 3,
        bathrooms: 2,
        floor: "الخامس",
        furnishing: "مفروشة جزئياً",
        availableFrom: "١ سبتمبر ٢٠٢٤",
        currentRoommates: 2,
        images: [
          "https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ],
        video360Url: null,
        verified: true,
        premium: false,
        livabilityScore: 84,
        status: "متاح",
        lat: 30.8001,
        lng: 30.9995,
      },
      {
        id: 5,
        ownerId: "usr_owner_02",
        title: "شقة كاملة في ميت خميس",
        description: "شقة كاملة بميت خميس المنصورة قريبة من مجمع الكليات",
        pricePerMonth: 1800,
        city: "المنصورة",
        address: "ميت خميس، المنصورة",
        university: "جامعة المنصورة",
        roomType: "شقة كاملة",
        areaSqm: 145,
        bedrooms: 3,
        bathrooms: 2,
        floor: "الأول",
        furnishing: "مفروشة بالكامل",
        availableFrom: "١ أغسطس ٢٠٢٤",
        currentRoommates: 0,
        images: [
          "https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/2029698/pexels-photo-2029698.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/2062431/pexels-photo-2062431.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ],
        video360Url: null,
        verified: true,
        premium: true,
        livabilityScore: 89,
        status: "متاح",
        lat: 31.0550,
        lng: 31.3900,
      },
      {
        id: 6,
        ownerId: "usr_owner_01",
        title: "سرير اقتصادي قريب من المواصلات",
        description: "سرير اقتصادي بشارع بورسعيد بكفر الشيخ قريب من موقف محطة القطار وسرفيس الجامعة",
        pricePerMonth: 650,
        city: "كفر الشيخ",
        address: "شارع بورسعيد، كفر الشيخ",
        university: "جامعة كفر الشيخ",
        roomType: "سرير في غرفة مشتركة",
        areaSqm: 88,
        bedrooms: 4,
        bathrooms: 2,
        floor: "الثاني",
        furnishing: "مفروشة بالكامل",
        availableFrom: "١ أغسطس ٢٠٢٤",
        currentRoommates: 3,
        images: [
          "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=1200",
          "https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=1200",
        ],
        video360Url: null,
        verified: true,
        premium: false,
        livabilityScore: 81,
        status: "متاح",
        lat: 31.1120,
        lng: 30.9450,
      },
    ]).onConflictDoNothing();

    // 3. Advance sequence
    await db.execute(sql`SELECT setval('apartments_id_seq', (SELECT GREATEST(MAX(id), 6) FROM apartments));`);

    // 4. Ensure coordinates are set for existing base apartments
    await db.execute(sql`
      UPDATE apartments SET lat = 31.1107, lng = 30.9388 WHERE id = 1 AND (lat IS NULL OR lng IS NULL);
      UPDATE apartments SET lat = 31.1152, lng = 30.9422 WHERE id = 2 AND (lat IS NULL OR lng IS NULL);
      UPDATE apartments SET lat = 31.0425, lng = 31.3571 WHERE id = 3 AND (lat IS NULL OR lng IS NULL);
      UPDATE apartments SET lat = 30.8001, lng = 30.9995 WHERE id = 4 AND (lat IS NULL OR lng IS NULL);
      UPDATE apartments SET lat = 31.0550, lng = 31.3900 WHERE id = 5 AND (lat IS NULL OR lng IS NULL);
      UPDATE apartments SET lat = 31.1120, lng = 30.9450 WHERE id = 6 AND (lat IS NULL OR lng IS NULL);
    `);

    isSeeded = true;
  } catch (err) {
    console.error("Error in ensureSeedApartments:", err);
  }
}
