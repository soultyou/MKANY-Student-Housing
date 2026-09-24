import React, { useState } from "react";
import {
  Building2,
  Pill,
  Bus,
  ShoppingCart,
  Coffee,
  GraduationCap,
  Sparkles,
  MapPin,
  Clock,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { NearbyAmenities, AmenityDetail } from "@/lib/inspections-store";
import {
  calcHaversineDistanceMeters,
  formatDistanceArabic,
  formatWalkingTimeArabic,
  getDerivedAmenityCoords,
  getCityDefaultCoordinates,
} from "@/lib/geo-utils";
import { setServiceRatingApi } from "@/lib/api-client";

interface NearbyAmenitiesFormProps {
  amenities: NearbyAmenities;
  onChange: (updated: NearbyAmenities) => void;
  city?: string;
  university?: string;
  propertyLat?: number;
  propertyLng?: number;
}

const RATING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "لم يتم التقييم بعد (غير مقيّم)" },
  { value: "0.5", label: "0.5 ★" },
  { value: "1.0", label: "1.0 ★" },
  { value: "1.5", label: "1.5 ★" },
  { value: "2.0", label: "2.0 ★" },
  { value: "2.5", label: "2.5 ★" },
  { value: "3.0", label: "3.0 ★" },
  { value: "3.5", label: "3.5 ★" },
  { value: "4.0", label: "4.0 ★" },
  { value: "4.5", label: "4.5 ★" },
  { value: "5.0", label: "5.0 ★" },
];

/**
 * مكون منضبط لإدخال وتعديل تقييم مكاني للخدمات
 * المصدر المعتمد: مشرف إدارة مكاني فقط (0 إلى 5 بمعدل 0.5)
 * يُمنع اشتقاق التقييم من المسافة أو وسوم OSM أو القيم العشوائية
 */
function MkanyRatingPicker({
  value,
  onChange,
  osmType,
  osmId,
  placeName,
  category,
}: {
  value: string | undefined | null;
  onChange: (val: string | undefined) => void;
  osmType?: string;
  osmId?: string | number;
  placeName?: string;
  category?: string;
}) {
  const [isSavingDirectly, setIsSavingDirectly] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Normalize value to match select options
  const normalizedValue =
    value !== undefined && value !== null && value !== "" && value !== "0" && value !== "0.0"
      ? Number(value).toFixed(1).replace(".0", "") === Number(value).toString() && !Number(value).toString().includes(".")
        ? `${Number(value).toFixed(1)}`
        : Number(value).toFixed(1)
      : "";

  const handleDirectSync = async () => {
    if (!osmType || !osmId) return;
    setIsSavingDirectly(true);
    setSaveSuccess(false);
    try {
      await setServiceRatingApi({
        osmType,
        osmId: String(osmId),
        rating: normalizedValue ? Number(normalizedValue) : null,
        placeName: placeName || "",
        category: category || "",
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to sync service rating:", err);
    } finally {
      setIsSavingDirectly(false);
    }
  };

  return (
    <div className="space-y-1.5" data-testid="mkany-rating-picker">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <label className="flex items-center gap-1 text-[11px] font-bold text-foreground">
          <Star size={13} className="text-amber-500 fill-amber-500" />
          <span>تقييم مكاني المعتمد:</span>
        </label>
        {normalizedValue ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
            ★ {normalizedValue} / 5
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            لم يتم تقييمه بعد
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={normalizedValue}
          onChange={(e) => {
            const nextVal = e.target.value;
            onChange(nextVal === "" ? undefined : nextVal);
          }}
          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground outline-none focus:border-amber-500"
          aria-label="تحديد تقييم مكاني"
        >
          {RATING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {normalizedValue && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 text-[10px]"
            title="مسح التقييم والعودة لغير مقيّم"
          >
            <RotateCcw size={13} />
          </button>
        )}

        {osmType && osmId && (
          <button
            type="button"
            onClick={handleDirectSync}
            disabled={isSavingDirectly}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
              saveSuccess
                ? "bg-emerald-600 text-white"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            }`}
            title="حفظ التقييم فوراً في قاعدة بيانات خدمات مكاني المرتبطة بـ OpenStreetMap"
          >
            {saveSuccess ? (
              <>
                <Check size={12} />
                محفوظ ✓
              </>
            ) : (
              <>
                <ShieldCheck size={12} />
                حفظ للنظام
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function NearbyAmenitiesForm({
  amenities,
  onChange,
  city,
  university,
  propertyLat,
  propertyLng,
}: NearbyAmenitiesFormProps) {
  const [expandedListCategory, setExpandedListCategory] = useState<string | null>(null);

  const updateAmenity = (
    key: keyof NearbyAmenities,
    field: keyof AmenityDetail,
    value: any
  ) => {
    onChange({
      ...amenities,
      [key]: {
        ...amenities[key],
        [field]: value,
      },
    });
  };

  const updateListItemRating = (
    listKey: keyof NearbyAmenities,
    itemIndex: number,
    newRating: string | undefined
  ) => {
    const list = ((amenities[listKey] as AmenityDetail[]) || []).slice();
    if (list[itemIndex]) {
      list[itemIndex] = {
        ...list[itemIndex],
        rating: newRating,
      };
      onChange({
        ...amenities,
        [listKey]: list,
      });
    }
  };

  const amenityConfig: Array<{
    key: keyof NearbyAmenities;
    listKey: keyof NearbyAmenities;
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    distancePlaceholder: string;
    timePlaceholder: string;
    namePlaceholder: string;
    exampleName: string;
  }> = [
    {
      key: "universityGate",
      listKey: "universityGateList",
      label: "بوابة الجامعة",
      icon: <GraduationCap size={18} />,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10 border-purple-200",
      distancePlaceholder: "مثال: ٨٠٠م أو ١٫٢كم",
      timePlaceholder: "مثال: ١٠ دقائق مشياً",
      namePlaceholder: "اسم البوابة أو المجمع",
      exampleName: university ? `بوابة ${university} الرئيسية` : "بوابة مجمع الكليات",
    },
    {
      key: "transportation",
      listKey: "transportationList",
      label: "محطة مواصلات / موقف سرفيس",
      icon: <Bus size={18} />,
      color: "text-sky-600",
      bgColor: "bg-sky-500/10 border-sky-200",
      distancePlaceholder: "مثال: ٢٠٠م",
      timePlaceholder: "مثال: ٣ دقائق مشياً",
      namePlaceholder: "اسم المحطة أو الموقف",
      exampleName: "موقف سرفيس الجامعة والمحطة",
    },
    {
      key: "hospital",
      listKey: "hospitalList",
      label: "أقرب مستشفى أو مركز طبي",
      icon: <Building2 size={18} />,
      color: "text-rose-600",
      bgColor: "bg-rose-500/10 border-rose-200",
      distancePlaceholder: "مثال: ٥٠٠م",
      timePlaceholder: "مثال: ٨ دقائق مشياً",
      namePlaceholder: "اسم المستشفى",
      exampleName: city ? `مستشفى ${city} العام` : "مستشفى الطلبة الجامعي",
    },
    {
      key: "pharmacy",
      listKey: "pharmacyList",
      label: "صيدلية (خدمة طلابية ٢٤ ساعة)",
      icon: <Pill size={18} />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10 border-emerald-200",
      distancePlaceholder: "مثال: ١٥٠م",
      timePlaceholder: "مثال: دقيقتان",
      namePlaceholder: "اسم الصيدلية",
      exampleName: "صيدلية العزبي / رشدي ٢٤ ساعة",
    },
    {
      key: "supermarket",
      listKey: "supermarketList",
      label: "سوبرماركت / هايبر ماركت",
      icon: <ShoppingCart size={18} />,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10 border-amber-200",
      distancePlaceholder: "مثال: ٣٠٠م",
      timePlaceholder: "مثال: ٥ دقائق مشياً",
      namePlaceholder: "اسم السوبرماركت",
      exampleName: "سوبرماركت كازيون / أولاد رجب",
    },
    {
      key: "cafeRestaurant",
      listKey: "cafeRestaurantList",
      label: "كافيه ومطعم ومساحة مذاكرة",
      icon: <Coffee size={18} />,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10 border-orange-200",
      distancePlaceholder: "مثال: ١٠٠م",
      timePlaceholder: "مثال: دقيقة واحدة",
      namePlaceholder: "اسم الكافيه أو المطعم",
      exampleName: "كافيه واستراحة المذاكرة للطلاب",
    },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5" data-testid="nearby-amenities-editor">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin size={16} />
            </span>
            <h4 className="text-sm font-black text-foreground">
              إدارة المنطقة المحيطة وتقييمات مكاني المعتمدة (Mkany Ratings)
            </h4>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-5">
            بيانات الأماكن (الاسم والإحداثيات والمسافة) مصدرها الفعلي OpenStreetMap. تقييمات الخدمات (Mkany Rating) مصدرها الحصري مشرف إدارة مكاني ولا يتم توليدها عشوائياً.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const baseCoords = propertyLat && propertyLng
                ? { lat: propertyLat, lng: propertyLng }
                : getCityDefaultCoordinates(city, university);

              const keys: Array<keyof NearbyAmenities> = [
                "universityGate",
                "transportation",
                "hospital",
                "pharmacy",
                "supermarket",
                "cafeRestaurant",
              ];

              const updated: any = { ...amenities };

              keys.forEach((k) => {
                const itemDetail = amenities[k] as AmenityDetail | undefined;
                const targetCoord = itemDetail?.lat && itemDetail?.lng
                  ? { lat: itemDetail.lat, lng: itemDetail.lng }
                  : getDerivedAmenityCoords(baseCoords.lat, baseCoords.lng, k);

                const meters = calcHaversineDistanceMeters(
                  baseCoords.lat,
                  baseCoords.lng,
                  targetCoord.lat,
                  targetCoord.lng
                );

                updated[k] = {
                  ...updated[k],
                  lat: targetCoord.lat,
                  lng: targetCoord.lng,
                  distance: formatDistanceArabic(meters),
                  time: formatWalkingTimeArabic(meters),
                  // Never overwrite explicit admin ratings
                };
              });

              onChange(updated);
            }}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/20 transition-colors"
            title="حساب المسافات الجغرافية الفعلية عبر خوارزميات OpenStreetMap"
            data-testid="btn-recalculate-osm-distances"
          >
            <MapPin size={13} className="text-emerald-600" />
            حساب المسافات (OpenStreetMap)
          </button>

          <button
            type="button"
            onClick={() => {
              const cityName = city || "كفر الشيخ";
              const uniName = university || "جامعة كفر الشيخ";
              // Note: default to unrated (no fake ratings!)
              onChange({
                ...amenities,
                universityGate: { distance: "٨٠٠م", time: "١٠ دقائق مشياً", name: `بوابة ${uniName} الرئيسية`, rating: amenities.universityGate?.rating },
                transportation: { distance: "٢٠٠م", time: "٣ دقائق مشياً", name: "محطة سرفيس وموقف الكليات", rating: amenities.transportation?.rating },
                hospital: { distance: "٥٠٠م", time: "٨ دقائق مشياً", name: `مستشفى ${cityName} الجامعي التخصصي`, rating: amenities.hospital?.rating },
                pharmacy: { distance: "١٥٠م", time: "دقيقتان", name: "صيدلية ٢٤ ساعة خدمة وتوصيل", rating: amenities.pharmacy?.rating },
                supermarket: { distance: "٣٠٠م", time: "٥ دقائق مشياً", name: "سوبرماركت وهايبر غذائي متكامل", rating: amenities.supermarket?.rating },
                cafeRestaurant: { distance: "١٠٠م", time: "دقيقة واحدة", name: "كافيه ومساحة مذاكرة هادئة", rating: amenities.cafeRestaurant?.rating },
              });
            }}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
            title="تعبئة بيانات مسافات استرشادية دون المساس بالتقييمات"
          >
            <Sparkles size={13} />
            قيم استرشادية للمسافات
          </button>
        </div>
      </div>

      {/* تنبيه شفاف عن معايير التقييم */}
      <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-200">
        <ShieldCheck size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <strong>معيار تقييمات مكاني:</strong> يتم تحديد التقييم حصراً بواسطة المشرف الإداري من 0.5 إلى 5.0 (بمضاعفات 0.5) أو تركه غير مقيّم. لا يتم اشتقاق أي تقييم من وسوم OpenStreetMap أو بُعد المسافة.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {amenityConfig.map((item) => {
          const current = (amenities[item.key] as AmenityDetail) || {
            distance: "",
            time: "",
            name: "",
            rating: undefined,
          };

          const listItems = ((amenities[item.listKey] as AmenityDetail[]) || []).filter(
            (it) => it && it.name && !it.name.startsWith("لا توجد")
          );
          const isExpanded = expandedListCategory === item.key;

          return (
            <div
              key={item.key}
              className={`rounded-xl border p-3.5 transition-all ${item.bgColor}`}
              data-testid={`amenity-card-${item.key}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-xs ${item.color}`}>
                    {item.icon}
                  </span>
                  <span className="text-xs font-black text-foreground">
                    {item.label}
                  </span>
                </div>

                {current.osmId && (
                  <span
                    className="text-[10px] font-mono text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border"
                    title={`معرف OpenStreetMap: ${current.osmType || "node"}/${current.osmId}`}
                  >
                    OSM #{current.osmId}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {/* تقييم مكاني المعتمد لهذا المكان/التصنيف */}
                <div className="rounded-lg bg-background/90 p-2.5 border border-border/80 shadow-xs">
                  <MkanyRatingPicker
                    value={current.rating}
                    onChange={(newVal) => updateAmenity(item.key, "rating", newVal)}
                    osmType={current.osmType}
                    osmId={current.osmId}
                    placeName={current.name}
                    category={item.label}
                  />
                </div>

                {/* تفاصيل المسافة والوقت والاسم */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-foreground">
                      <MapPin size={10} className={item.color} />
                      المسافة (بالأمتار / كم):
                    </label>
                    <input
                      type="text"
                      required
                      value={current.distance}
                      onChange={(e) => updateAmenity(item.key, "distance", e.target.value)}
                      placeholder={item.distancePlaceholder}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-foreground">
                      <Clock size={10} className={item.color} />
                      الوقت التقريبي:
                    </label>
                    <input
                      type="text"
                      required
                      value={current.time}
                      onChange={(e) => updateAmenity(item.key, "time", e.target.value)}
                      placeholder={item.timePlaceholder}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-muted-foreground">
                    اسم المكان أو الخدمة من واقع الخريطة:
                  </label>
                  <input
                    type="text"
                    value={current.name || ""}
                    onChange={(e) => updateAmenity(item.key, "name", e.target.value)}
                    placeholder={item.exampleName}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                  />
                </div>

                {/* قائمة الأماكن الفردية المكتشفة عبر OpenStreetMap في هذا التصنيف */}
                {listItems.length > 0 && (
                  <div className="pt-1 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => setExpandedListCategory(isExpanded ? null : item.key)}
                      className="flex items-center justify-between w-full text-[11px] font-bold text-primary hover:underline py-1"
                    >
                      <span className="flex items-center gap-1">
                        <span>أماكن أخرى مكتشفة عبر الخريطة ({listItems.length})</span>
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                        {listItems.map((subItem, sIdx) => (
                          <div
                            key={subItem.osmId ? `osm-${subItem.osmId}` : `sub-${sIdx}`}
                            className="rounded-lg border border-border bg-background p-2 text-xs space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <span className="font-bold text-foreground block">
                                  {subItem.name || `مكان #${sIdx + 1}`}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {subItem.distance} • {subItem.time}
                                </span>
                              </div>
                              {subItem.osmId && (
                                <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 rounded">
                                  OSM #{subItem.osmId}
                                </span>
                              )}
                            </div>

                            <MkanyRatingPicker
                              value={subItem.rating}
                              onChange={(newRating) =>
                                updateListItemRating(item.listKey, sIdx, newRating)
                              }
                              osmType={subItem.osmType}
                              osmId={subItem.osmId}
                              placeName={subItem.name}
                              category={item.label}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
