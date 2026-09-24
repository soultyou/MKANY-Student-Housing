import { getDerivedAmenityCoords, getCityDefaultCoordinates, calcHaversineDistanceMeters } from "./geo-utils";
import {
  uploadSingleImageApi,
  uploadMultipleImagesApi,
  getInspectionsApi,
  getInspectionByIdApi,
  createInspectionApi,
  updateInspectionApi,
  publishInspectionApi,
  getApartmentsApi,
} from "./api-client";

/**
 * نظام إدارة طلبات المعاينة وتوثيق العقارات (Inspection Cycle & Properties Store)
 * يدير دورة حياة العقار:
 * 1. إرسال المالك لطلب معاينة أولي مع صور العقار
 * 2. حفظ الطلب وتنسيق مراجعة الـ Admin وتحديد موعد المعاينة الميدانية
 * 3. نزول فريق المعاينة الفعلي وتوثيق العقار والتقاط صور 360°
 * 4. تفعيل العقار ونشره فوراً على المنصة للطلاب
 */

export interface PropertyInspection {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  title: string;
  address: string;
  city: string;
  university: string;
  roomType: string;
  pricePerMonth: number;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  furnishing: string;
  initialPhotos: string[];
  notes?: string;
  preferredInspectionDate?: string;
  lat?: number;
  lng?: number;
  
  // دورة الحالة:
  // pending: طلب جديد ينتظر مراجعة الإدارة وتنسيق الموعد
  // scheduled: تم تحديد موعد المعاينة الميدانية واسم المهندس المعاين
  // inspected: تمت المعاينة الميدانية وجاهز للاعتماد النهائي
  // approved: تم تفعيل العقار ورفع جولة 360° ونشره للطلاب
  // rejected: مرفوض مع توضيح السبب
  status: "pending" | "scheduled" | "inspected" | "approved" | "rejected";
  
  scheduledDate?: string;
  inspectorName?: string;
  inspectorReport?: string;
  livabilityScore?: number;
  video360Url?: string;
  finalImages?: string[];
  rejectionReason?: string;
  publishedPropertyId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AmenityDetail {
  distance: string; // مثال: "٥٠٠م" أو "1.2 كم"
  time: string;     // مثال: "٨ دقائق مشياً"
  name?: string;     // اسم المكان: مثال "مستشفى كفر الشيخ الجامعي"
  rating?: string;   // التقييم: مثال "4.7"
  lat?: number;      // إحداثيات خط العرض للخدمة
  lng?: number;      // إحداثيات خط الطول للخدمة
  osmType?: "node" | "way" | "relation" | string;
  osmId?: string | number;
}

export interface NearbyAmenities {
  hospital: AmenityDetail;        // أقرب مستشفى
  pharmacy: AmenityDetail;        // صيدلية
  transportation: AmenityDetail;  // محطة مواصلات
  supermarket: AmenityDetail;     // سوبرماركت
  cafeRestaurant: AmenityDetail;  // كافيه / مطعم
  universityGate: AmenityDetail;  // بوابة الجامعة
  hospitalList?: AmenityDetail[];
  pharmacyList?: AmenityDetail[];
  transportationList?: AmenityDetail[];
  supermarketList?: AmenityDetail[];
  cafeRestaurantList?: AmenityDetail[];
  universityGateList?: AmenityDetail[];
  universityList?: AmenityDetail[];
  restaurantCafeList?: AmenityDetail[];
}

export interface PlatformProperty {
  id: number;
  title: string;
  address: string;
  city: string;
  university: string;
  pricePerMonth: number;
  roomType: string;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  furnishing: string;
  availableFrom: string;
  currentRoommates: number;
  images: string[];
  video360Url: string | null;
  verified: boolean;
  premium: boolean;
  livabilityScore: number;
  status: "متاح" | "مشغول" | "قيد المراجعة" | "مرفوض";
  ownerId?: string;
  inspectionId?: string;
  lat?: number;
  lng?: number;
  nearbyAmenities?: NearbyAmenities;
  description?: string;
  availablePlaces?: number;
}

const STORAGE_INSPECTIONS_KEY = "mkany_inspections_requests_v1";
const STORAGE_PROPERTIES_KEY = "mkany_platform_properties_v1";

// عينات أولية لطلبات المعاينة لتجربة واقعية فورية
const INITIAL_INSPECTIONS: PropertyInspection[] = [
  {
    id: "insp_101",
    ownerId: "usr_owner_01",
    ownerName: "المهندس محمود عبد العزيز",
    ownerPhone: "01287654321",
    ownerEmail: "owner.mahmoud@mkany.eg",
    title: "شقة طلابية واسعة أمام بوابة الزراعة",
    address: "شارع معهد الكبد، أمام بوابة كلية الزراعة، كفر الشيخ",
    city: "كفر الشيخ",
    university: "جامعة كفر الشيخ",
    roomType: "شقة مشتركة",
    pricePerMonth: 850,
    areaSqm: 115,
    bedrooms: 3,
    bathrooms: 2,
    floor: "الدور الثاني",
    furnishing: "مفروشة بالكامل",
    initialPhotos: [
      "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ],
    notes: "شقة حديثة التشطيب، مجهزة بغسالة أتوماتيك وثلاجة وشبكة واي فاي فايبر سريعة، جاهزة للمعاينة يوم الأحد أو الإثنين.",
    preferredInspectionDate: "الأحد القادم - صباحاً",
    status: "scheduled",
    scheduledDate: "الأحد، الساعة ١١:٠٠ صباحاً",
    inspectorName: "م. طارق سالم (فريق المعاينة)",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "insp_102",
    ownerId: "usr_owner_01",
    ownerName: "المهندس محمود عبد العزيز",
    ownerPhone: "01287654321",
    ownerEmail: "owner.mahmoud@mkany.eg",
    title: "استوديو هادئ للمذاكرة شارع الجيش",
    address: "شارع الجيش، متفرع من شارع النبوي المهندس، كفر الشيخ",
    city: "كفر الشيخ",
    university: "جامعة كفر الشيخ",
    roomType: "استوديو",
    pricePerMonth: 1350,
    areaSqm: 55,
    bedrooms: 1,
    bathrooms: 1,
    floor: "الدور الثالث (يوجد أسانسير)",
    furnishing: "مفروشة بالكامل",
    initialPhotos: [
      "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ],
    notes: "مناسب لطالب دكتوراه أو ماجستير أو طب يبحث عن الهدوء التام والخصوصية.",
    preferredInspectionDate: "أي وقت في المساء",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export function getDefaultAmenities(city: string = "كفر الشيخ", university: string = "جامعة كفر الشيخ"): NearbyAmenities {
  // Return clean 'no data available' labels as fallbacks to strictly satisfy the 'no fake/invented/hardcoded GIS data' product rule.
  const emptyLabel = "لا توجد بيانات متاحة";
  const noWalkLabel = "بيانات مسار المشي غير متاحة";
  return {
    hospital: { distance: emptyLabel, time: noWalkLabel, name: emptyLabel, rating: undefined },
    pharmacy: { distance: emptyLabel, time: noWalkLabel, name: emptyLabel, rating: undefined },
    transportation: { distance: emptyLabel, time: noWalkLabel, name: emptyLabel, rating: undefined },
    supermarket: { distance: emptyLabel, time: noWalkLabel, name: emptyLabel, rating: undefined },
    cafeRestaurant: { distance: emptyLabel, time: noWalkLabel, name: emptyLabel, rating: undefined },
    universityGate: { distance: emptyLabel, time: noWalkLabel, name: "لا توجد بيانات جامعة متاحة", rating: undefined },
    hospitalList: [],
    pharmacyList: [],
    transportationList: [],
    supermarketList: [],
    cafeRestaurantList: [],
    universityGateList: [],
    universityList: [],
  };
}

export function getEffectiveAmenities(property: { city?: string; university?: string; nearbyAmenities?: NearbyAmenities } | Partial<PlatformProperty> | any): NearbyAmenities {
  const def = getDefaultAmenities(property?.city, property?.university);
  if (!property?.nearbyAmenities) return def;

  const na = property.nearbyAmenities;

  return {
    hospital: na.hospital || def.hospital,
    pharmacy: na.pharmacy || def.pharmacy,
    transportation: na.transportation || def.transportation,
    supermarket: na.supermarket || def.supermarket,
    cafeRestaurant: na.cafeRestaurant || def.cafeRestaurant,
    universityGate: na.universityGate || def.universityGate,
    hospitalList: Array.isArray(na.hospitalList) ? na.hospitalList : [],
    pharmacyList: Array.isArray(na.pharmacyList) ? na.pharmacyList : [],
    transportationList: Array.isArray(na.transportationList) ? na.transportationList : [],
    supermarketList: Array.isArray(na.supermarketList) ? na.supermarketList : [],
    cafeRestaurantList: Array.isArray(na.cafeRestaurantList) ? na.cafeRestaurantList : (Array.isArray(na.restaurantCafeList) ? na.restaurantCafeList : []),
    universityGateList: Array.isArray(na.universityGateList) ? na.universityGateList : (Array.isArray(na.universityList) ? na.universityList : []),
    universityList: Array.isArray(na.universityList) ? na.universityList : (Array.isArray(na.universityGateList) ? na.universityGateList : []),
  };
}

export interface AmenityDisplayItem {
  key: keyof NearbyAmenities;
  categoryName: string;
  distance: string;
  time: string;
  name?: string;
  rating?: string;
  lat?: number;
  lng?: number;
  iconType: "hospital" | "pharmacy" | "transportation" | "supermarket" | "cafeRestaurant" | "universityGate";
}

export function getAmenitiesDisplayList(amenities: NearbyAmenities, propertyLat?: number, propertyLng?: number): AmenityDisplayItem[] {
  const emptyLabel = "لا توجد بيانات متاحة";

  const categories: Array<{
    key: keyof NearbyAmenities;
    listKey: keyof NearbyAmenities;
    categoryName: string;
    iconType: "hospital" | "pharmacy" | "transportation" | "supermarket" | "cafeRestaurant" | "universityGate";
  }> = [
    { key: "universityGate", listKey: "universityGateList", categoryName: "الجامعة", iconType: "universityGate" },
    { key: "supermarket", listKey: "supermarketList", categoryName: "سوبرماركت", iconType: "supermarket" },
    { key: "cafeRestaurant", listKey: "cafeRestaurantList", categoryName: "مطاعم وكافيهات", iconType: "cafeRestaurant" },
    { key: "pharmacy", listKey: "pharmacyList", categoryName: "صيدلية", iconType: "pharmacy" },
    { key: "hospital", listKey: "hospitalList", categoryName: "مستشفى", iconType: "hospital" },
    { key: "transportation", listKey: "transportationList", categoryName: "مواصلات", iconType: "transportation" },
  ];

  const result: AmenityDisplayItem[] = [];

  for (const cat of categories) {
    const rawList = (amenities[cat.listKey] as any[]) || (cat.key === "universityGate" ? (amenities as any).universityList : undefined) || [];
    // Strictly filter out schools if category is university
    const list = cat.key === "universityGate"
      ? rawList.filter((item: any) => !item.name?.includes("مدرسة") && !item.name?.includes("مدرسه"))
      : rawList;

    if (list.length > 0) {
      list.forEach((item: any, index: number) => {
        // Validate coordinates returned by OSM
        if (item.lat !== undefined && item.lng !== undefined && item.lat >= -90 && item.lat <= 90 && item.lng >= -180 && item.lng <= 180) {
          let distFormatted = item.distance || emptyLabel;
          if (propertyLat !== undefined && propertyLng !== undefined && item.lat !== undefined && item.lng !== undefined) {
            const meters = calcHaversineDistanceMeters(propertyLat, propertyLng, item.lat, item.lng);
            const formatted = meters < 1000 ? `${Math.round(meters)} م` : `${(meters / 1000).toFixed(1).replace(".", "٫")} كم`;
            distFormatted = `المسافة الجغرافية: ${formatted}`;
          } else if (distFormatted && distFormatted !== emptyLabel && !distFormatted.startsWith("المسافة الجغرافية:")) {
            distFormatted = `المسافة الجغرافية: ${distFormatted}`;
          }

          result.push({
            key: `${cat.key}_${index}` as any,
            categoryName: cat.categoryName,
            distance: distFormatted,
            time: "بيانات مسار المشي غير متاحة",
            name: item.name || emptyLabel,
            rating: item.rating !== undefined && item.rating !== null && item.rating !== "" && item.rating !== "0" && item.rating !== "0.0" ? String(item.rating) : undefined,
            lat: item.lat,
            lng: item.lng,
            iconType: cat.iconType,
          });
        }
      });
    } else {
      // If no list, check if the single property is valid and has OSM coordinates (no guessing!)
      const primary = amenities[cat.key] as any;
      const isInvalidSchool = cat.key === "universityGate" && (primary?.name?.includes("مدرسة") || primary?.name?.includes("مدرسه"));
      if (primary && primary.name && primary.name !== emptyLabel && !primary.name.startsWith("لا توجد") && !isInvalidSchool && primary.lat !== undefined && primary.lng !== undefined) {
        let distFormatted = primary.distance || emptyLabel;
        if (propertyLat !== undefined && propertyLng !== undefined && primary.lat !== undefined && primary.lng !== undefined) {
          const meters = calcHaversineDistanceMeters(propertyLat, propertyLng, primary.lat, primary.lng);
          const formatted = meters < 1000 ? `${Math.round(meters)} م` : `${(meters / 1000).toFixed(1).replace(".", "٫")} كم`;
          distFormatted = `المسافة الجغرافية: ${formatted}`;
        } else if (distFormatted && distFormatted !== emptyLabel && !distFormatted.startsWith("المسافة الجغرافية:")) {
          distFormatted = `المسافة الجغرافية: ${distFormatted}`;
        }

        result.push({
          key: cat.key,
          categoryName: cat.categoryName,
          distance: distFormatted,
          time: "بيانات مسار المشي غير متاحة",
          name: primary.name || emptyLabel,
          rating: primary.rating !== undefined && primary.rating !== null && primary.rating !== "" && primary.rating !== "0" && primary.rating !== "0.0" ? String(primary.rating) : undefined,
          lat: primary.lat,
          lng: primary.lng,
          iconType: cat.iconType,
        });
      }
    }
  }

  return result;
}

// الوحدات الست الأساسية للمنصة مع الإحداثيات الجغرافية الحقيقية لكل موقع
const BASE_PROPERTIES: PlatformProperty[] = [
  { 
    id: 1, 
    title: "غرفة مضيئة قرب الجلاء", 
    address: "شارع الجلاء، كفر الشيخ", 
    city: "كفر الشيخ", 
    university: "جامعة كفر الشيخ", 
    pricePerMonth: 950, 
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
      "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4", 
    verified: true, 
    premium: true, 
    livabilityScore: 87, 
    status: "متاح",
    ownerId: "usr_owner_01",
    lat: 31.1107,
    lng: 30.9388,
  },
  { 
    id: 2, 
    title: "شقة هادئة للطالبات", 
    address: "شارع النباوي المهندس، كفر الشيخ", 
    city: "كفر الشيخ", 
    university: "جامعة كفر الشيخ", 
    pricePerMonth: 750, 
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
      "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: false, 
    livabilityScore: 92, 
    status: "متاح",
    ownerId: "usr_owner_01",
    lat: 31.1152,
    lng: 30.9422,
  },
  { 
    id: 3, 
    title: "استوديو جيهان العصري", 
    address: "شارع جيهان، المنصورة", 
    city: "المنصورة", 
    university: "جامعة المنصورة", 
    pricePerMonth: 1200, 
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
      "https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: true, 
    livabilityScore: 95, 
    status: "متاح",
    ownerId: "usr_owner_02",
    lat: 31.0425,
    lng: 31.3571,
  },
  { 
    id: 4, 
    title: "بيت الطلبة على شارع الجامعة", 
    address: "شارع الجامعة، طنطا", 
    city: "طنطا", 
    university: "جامعة طنطا", 
    pricePerMonth: 850, 
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
      "https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: false, 
    livabilityScore: 84, 
    status: "متاح",
    ownerId: "usr_owner_02",
    lat: 30.8001,
    lng: 30.9995,
  },
  { 
    id: 5, 
    title: "شقة كاملة في ميت خميس", 
    address: "ميت خميس، المنصورة", 
    city: "المنصورة", 
    university: "جامعة المنصورة", 
    pricePerMonth: 1800, 
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
      "https://images.pexels.com/photos/2062431/pexels-photo-2062431.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: true, 
    livabilityScore: 89, 
    status: "مشغول",
    ownerId: "usr_owner_02",
    lat: 31.0550,
    lng: 31.3900,
  },
  { 
    id: 6, 
    title: "سرير اقتصادي قريب من المواصلات", 
    address: "شارع بورسعيد، كفر الشيخ", 
    city: "كفر الشيخ", 
    university: "جامعة كفر الشيخ", 
    pricePerMonth: 650, 
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
      "https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: false, 
    livabilityScore: 81, 
    status: "متاح",
    ownerId: "usr_owner_01",
    lat: 31.1120,
    lng: 30.9450,
  },
];

export const INSPECTIONS_CHANGE_EVENT = "mkany_inspections_updated";
export const PROPERTIES_CHANGE_EVENT = "mkany_properties_updated";

/**
 * Upload single image file to server storage
 */
export async function uploadImageFile(file: File): Promise<string> {
  const data = await uploadSingleImageApi(file);
  return data.url;
}

/**
 * Upload multiple image files to server storage
 */
export async function uploadImageFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const data = await uploadMultipleImagesApi(files);
  return data.urls;
}

/**
 * Synchronize inspections from PostgreSQL database via API
 */
export async function syncInspectionsFromApi(): Promise<PropertyInspection[]> {
  try {
    const data = await getInspectionsApi();
    if (Array.isArray(data) && data.length > 0) {
      saveInspections(data);
      return data;
    }
  } catch (err) {
    console.warn("Could not sync inspections from API:", err);
  }
  return getAllInspections();
}

/**
 * استرجاع كافة طلبات المعاينة
 */
export function getAllInspections(): PropertyInspection[] {
  if (typeof window === "undefined") return INITIAL_INSPECTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_INSPECTIONS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_INSPECTIONS_KEY, JSON.stringify(INITIAL_INSPECTIONS));
      return INITIAL_INSPECTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_INSPECTIONS;
  } catch (e) {
    return INITIAL_INSPECTIONS;
  }
}

/**
 * حفظ طلبات المعاينة محلياً وإطلاق الحدث
 */
function saveInspections(list: PropertyInspection[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INSPECTIONS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(INSPECTIONS_CHANGE_EVENT));
  } catch (e) {
    console.error("Failed to save inspections:", e);
  }
}

/**
 * إنشاء طلب معاينة جديد من قِبل المالك وحفظه في PostgreSQL عبر الـ API
 */
export function createInspectionRequest(
  data: Omit<PropertyInspection, "id" | "status" | "createdAt" | "updatedAt">
): PropertyInspection {
  const current = getAllInspections();
  const now = new Date().toISOString();
  const id = `insp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const newInspection: PropertyInspection = {
    ...data,
    id,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newInspection, ...current];
  saveInspections(updated);

  // Send to backend PostgreSQL API with Bearer token
  createInspectionApi(data)
    .then((saved) => {
      const refreshed = [saved, ...getAllInspections().filter((x) => x.id !== id && x.id !== saved.id)];
      saveInspections(refreshed);
    })
    .catch((err) => {
      console.error("Error persisting inspection to API:", err);
    });

  return newInspection;
}

/**
 * النسخة غير المتزامنة لإنشاء طلب المعاينة
 */
export async function createInspectionRequestAsync(
  data: Omit<PropertyInspection, "id" | "status" | "createdAt" | "updatedAt">
): Promise<PropertyInspection> {
  const current = getAllInspections();

  // Call the authenticated API - throws on 401/403/500 so UI can display proper error
  const saved = await createInspectionApi(data);
  const updated = [saved, ...current.filter((x) => x.id !== saved.id)];
  saveInspections(updated);
  return saved;
}

/**
 * جدولة موعد المعاينة الميدانية بواسطة الآدمن وحفظ التعديل في PostgreSQL
 */
export function scheduleInspectionVisit(
  id: string,
  scheduledDate: string,
  inspectorName: string,
  inspectorNotes?: string
): PropertyInspection | null {
  const list = getAllInspections();
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) return null;

  const updated: PropertyInspection = {
    ...list[index],
    status: "scheduled",
    scheduledDate,
    inspectorName,
    inspectorReport: inspectorNotes || list[index].inspectorReport,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveInspections(list);

  // Sync to PostgreSQL backend via authenticated API
  updateInspectionApi(id, {
    status: "scheduled",
    scheduledDate,
    inspectorName,
    inspectorReport: inspectorNotes || list[index].inspectorReport,
  }).catch((e) => console.error("Failed to patch inspection schedule in DB:", e));

  return updated;
}

/**
 * تسجيل نزول المعاينة الفعلية بواسطة الآدمن وحفظ النتيجة في PostgreSQL
 */
export function markInspectionCompleted(
  id: string,
  inspectorReport: string,
  livabilityScore: number
): PropertyInspection | null {
  const list = getAllInspections();
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) return null;

  const updated: PropertyInspection = {
    ...list[index],
    status: "inspected",
    inspectorReport,
    livabilityScore,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveInspections(list);

  // Sync to PostgreSQL backend via authenticated API
  updateInspectionApi(id, {
    status: "inspected",
    inspectorReport,
    livabilityScore,
  }).catch((e) => console.error("Failed to patch inspection completion in DB:", e));

  return updated;
}

/**
 * رفض طلب المعاينة مع توضيح السبب وحفظ الرفض في PostgreSQL
 */
export function rejectInspectionRequest(
  id: string,
  rejectionReason: string
): PropertyInspection | null {
  const list = getAllInspections();
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) return null;

  const updated: PropertyInspection = {
    ...list[index],
    status: "rejected",
    rejectionReason,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveInspections(list);

  // Sync to PostgreSQL backend via authenticated API
  updateInspectionApi(id, {
    status: "rejected",
    rejectionReason,
  }).catch((e) => console.error("Failed to patch inspection rejection in DB:", e));

  return updated;
}

/**
 * استرجاع العقارات المنشورة ومزامنتها مع PostgreSQL
 */
export async function syncPlatformPropertiesFromApi(statusParam: string = "all"): Promise<PlatformProperty[]> {
  try {
    const dbApartments = await getApartmentsApi({ status: statusParam });
    const baseCoordMap: Record<number, { lat: number; lng: number }> = {
      1: { lat: 31.1107, lng: 30.9388 },
      2: { lat: 31.1152, lng: 30.9422 },
      3: { lat: 31.0425, lng: 31.3571 },
      4: { lat: 30.8001, lng: 30.9995 },
      5: { lat: 31.0550, lng: 31.3900 },
      6: { lat: 31.1120, lng: 30.9450 },
    };

    if (Array.isArray(dbApartments) && dbApartments.length > 0) {
      const mapped: PlatformProperty[] = dbApartments.map((a: any) => ({
        id: a.id,
        title: a.title,
        address: a.address,
        city: a.city,
        university: a.university,
        pricePerMonth: a.pricePerMonth || a.price,
        roomType: a.roomType || "شقة مشتركة",
        areaSqm: a.areaSqm,
        bedrooms: a.bedrooms,
        bathrooms: a.bathrooms,
        floor: a.floor,
        furnishing: a.furnishing,
        availableFrom: a.availableFrom || "متاح الآن فوراً",
        currentRoommates: a.currentRoommates || 0,
        images: Array.isArray(a.images) && a.images.length > 0
          ? a.images
          : (a.photos && a.photos.length > 0 ? a.photos.map((p: any) => p.url) : []),
        video360Url: a.video360Url || null,
        verified: a.verified ?? true,
        premium: a.premium ?? true,
        livabilityScore: a.livabilityScore || 90,
        status: a.status || "متاح",
        ownerId: a.ownerId,
        inspectionId: a.inspectionId,
        lat: a.lat,
        lng: a.lng,
        nearbyAmenities: a.nearbyAmenities,
      }));
      savePlatformProperties(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("Failed to sync apartments from DB API:", err);
  }
  return getAllPlatformProperties();
}

/**
 * جلب جميع العقارات المعتمدة والمنشورة على المنصة
 */
export function getAllPlatformProperties(): PlatformProperty[] {
  if (typeof window === "undefined") return BASE_PROPERTIES;
  try {
    const raw = localStorage.getItem(STORAGE_PROPERTIES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PROPERTIES_KEY, JSON.stringify(BASE_PROPERTIES));
      return BASE_PROPERTIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p: PlatformProperty) => {
        return {
          ...p,
          lat: p.lat,
          lng: p.lng,
          nearbyAmenities: p.nearbyAmenities ? getEffectiveAmenities(p) : undefined,
        };
      });
    }
    return BASE_PROPERTIES;
  } catch (e) {
    return BASE_PROPERTIES;
  }
}

/**
 * حفظ قائمة العقارات المنشورة وإخطار جميع واجهات العرض فورياً
 */
function savePlatformProperties(props: PlatformProperty[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PROPERTIES_KEY, JSON.stringify(props));
    window.dispatchEvent(new CustomEvent("mkany_properties_updated"));
  } catch (e) {
    console.error("Failed to save platform properties:", e);
  }
}

/**
 * تفعيل العقار رسمياً بعد المعاينة الميدانية ونشره للطلاب مع صور 360° وتفاصيل المنطقة المحيطة وحفظه في PostgreSQL
 */
export function activateAndPublishProperty(
  inspectionId: string,
  details: {
    video360Url?: string;
    finalImages?: string[];
    livabilityScore?: number;
    inspectorReport?: string;
    nearbyAmenities?: NearbyAmenities;
  }
): { inspection: PropertyInspection; property: PlatformProperty } | null {
  const inspections = getAllInspections();
  const index = inspections.findIndex((x) => x.id === inspectionId);
  if (index === -1) return null;

  const insp = inspections[index];
  const properties = getAllPlatformProperties();
  const newPropertyId = properties.length ? Math.max(...properties.map((p) => p.id)) + 1 : 1;

  const score = details.livabilityScore || insp.livabilityScore || 92;
  const video360 = details.video360Url || "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4";
  const images = details.finalImages && details.finalImages.length > 0 
    ? details.finalImages 
    : (insp.initialPhotos.length > 0 ? insp.initialPhotos : [
        "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200"
      ]);

  const amenities = details.nearbyAmenities || getEffectiveAmenities({ city: insp.city, university: insp.university });

  // إنشاء العقار المنشور في الكتالوج الرئيسي للطلاب
  const newProperty: PlatformProperty = {
    id: newPropertyId,
    title: insp.title,
    address: insp.address,
    city: insp.city,
    university: insp.university,
    pricePerMonth: insp.pricePerMonth,
    roomType: insp.roomType,
    areaSqm: insp.areaSqm,
    bedrooms: insp.bedrooms,
    bathrooms: insp.bathrooms,
    floor: insp.floor,
    furnishing: insp.furnishing,
    availableFrom: "متاح الآن فوراً",
    currentRoommates: 0,
    images: images,
    video360Url: video360,
    verified: true,
    premium: true,
    livabilityScore: score,
    status: "متاح",
    ownerId: insp.ownerId,
    inspectionId: insp.id,
    lat: insp.lat,
    lng: insp.lng,
    nearbyAmenities: amenities,
  };

  // إضافة العقار في الكتالوج
  savePlatformProperties([newProperty, ...properties]);

  // تحديث حالة المعاينة إلى approved
  const updatedInspection: PropertyInspection = {
    ...insp,
    status: "approved",
    video360Url: video360,
    finalImages: images,
    livabilityScore: score,
    inspectorReport: details.inspectorReport || insp.inspectorReport || "تمت المعاينة الميدانية واعتماد الوحدة بنجاح مع مطابقة المواصفات.",
    publishedPropertyId: newPropertyId,
    updatedAt: new Date().toISOString(),
  };

  inspections[index] = updatedInspection;
  saveInspections(inspections);

  // Sync publish operation to backend PostgreSQL using authenticated api-client
  publishInspectionApi(inspectionId, {
    video360Url: video360,
    finalImages: images,
    livabilityScore: score,
    inspectorReport: details.inspectorReport || insp.inspectorReport,
    nearbyAmenities: amenities,
  }).catch((err) => {
    console.error("Error publishing property to database:", err);
  });

  return { inspection: updatedInspection, property: newProperty };
}

/**
 * النسخة غير المتزامنة لنشر وتفعيل العقار بعد المعاينة
 */
export async function activateAndPublishPropertyAsync(
  inspectionId: string,
  details: {
    video360Url?: string;
    finalImages?: string[];
    livabilityScore?: number;
    inspectorReport?: string;
    nearbyAmenities?: NearbyAmenities;
  }
): Promise<{ inspection: PropertyInspection; property: PlatformProperty } | null> {
  const result = await publishInspectionApi(inspectionId, details);
  if (result) {
    await syncInspectionsFromApi();
    await syncPlatformPropertiesFromApi();
  }
  return activateAndPublishProperty(inspectionId, details);
}

// Auto-sync initial data on browser startup
if (typeof window !== "undefined") {
  setTimeout(() => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
  }, 100);
}

/**
 * تحديث بيانات عقار منشور مباشرة من قِبل الآدمن (تعديل السعر، الصور، جولة 360°، العنوان، الحالة)
 */
export function updatePlatformProperty(
  id: number,
  updatedData: Partial<PlatformProperty>
): PlatformProperty | null {
  const properties = getAllPlatformProperties();
  const index = properties.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const updated: PlatformProperty = {
    ...properties[index],
    ...updatedData,
  };

  properties[index] = updated;
  savePlatformProperties(properties);
  return updated;
}

/**
 * حذف أو إلغاء نشر عقار من الكتالوج الرئيسي للطلاب
 */
export function deletePlatformProperty(id: number): boolean {
  const properties = getAllPlatformProperties();
  const filtered = properties.filter((p) => p.id !== id);
  if (filtered.length === properties.length) return false;
  savePlatformProperties(filtered);
  return true;
}

/**
 * إضافة عقار جديد مباشرة إلى الكتالوج بواسطة الآدمن مع جولة 360°
 */
export function addNewPlatformProperty(
  data: Omit<PlatformProperty, "id">
): PlatformProperty {
  const properties = getAllPlatformProperties();
  const newId = properties.length ? Math.max(...properties.map((p) => p.id)) + 1 : 1;
  const newProperty: PlatformProperty = {
    ...data,
    id: newId,
  };

  const updated = [newProperty, ...properties];
  savePlatformProperties(updated);
  return newProperty;
}
