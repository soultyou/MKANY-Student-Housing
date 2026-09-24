import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapPin,
  GraduationCap,
  Hospital,
  Pill,
  Bus,
  ShoppingBag,
  Coffee,
  Footprints,
  Car,
  ExternalLink,
  Navigation,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  CheckCircle2
} from "lucide-react";
import {
  NearbyAmenities,
  AmenityDisplayItem,
  getAmenitiesDisplayList
} from "@/lib/inspections-store";
import {
  RouteCalculationResult,
  getWalkingRouteBetween,
  getOpenStreetMapDirectionsUrl,
  getCityDefaultCoordinates
} from "@/lib/geo-utils";

interface InteractiveLeafletMapProps {
  propertyTitle: string;
  propertyAddress: string;
  city?: string;
  university?: string;
  propertyLat?: number;
  propertyLng?: number;
  amenities: NearbyAmenities;
  selectedAmenityKey?: string | null;
  onSelectAmenity?: (item: AmenityDisplayItem) => void;
  className?: string;
}

export function InteractiveLeafletMap({
  propertyTitle,
  propertyAddress,
  city = "كفر الشيخ",
  university = "جامعة كفر الشيخ",
  propertyLat,
  propertyLng,
  amenities,
  selectedAmenityKey,
  onSelectAmenity,
  className = "",
}: InteractiveLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);
  const routeDecorationsRef = useRef<L.LayerGroup | null>(null);

  const [activeItem, setActiveItem] = useState<AmenityDisplayItem | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteCalculationResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if location is missing or invalid
  const hasValidLocation =
    propertyLat !== undefined &&
    propertyLng !== undefined &&
    propertyLat !== null &&
    propertyLng !== null &&
    !isNaN(propertyLat) &&
    !isNaN(propertyLng) &&
    propertyLat >= -90 &&
    propertyLat <= 90 &&
    propertyLng >= -180 &&
    propertyLng <= 180;

  if (!hasValidLocation) {
    return (
      <div
        className={`rounded-2xl border border-amber-300 bg-amber-50/60 p-8 text-center ${className}`}
        id="osm-interactive-map-section"
        data-testid="interactive-leaflet-map-missing"
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <MapPin size={24} />
          </div>
          <h4 className="text-base font-bold text-amber-900">يحتاج تحديد الموقع</h4>
          <p className="text-xs text-amber-800/80 max-w-sm leading-relaxed">
            عذراً، هذا العقار ليس له إحداثيات جغرافية دقيقة مسجلة بعد. يرجى تحديث موقع العقار لتفعيل الخريطة والخدمات المحيطة.
          </p>
        </div>
      </div>
    );
  }

  const effectivePropLat = propertyLat;
  const effectivePropLng = propertyLng;

  // قائمة الخدمات المحيطة مع إحداثياتها
  const amenitiesList = getAmenitiesDisplayList(amenities, effectivePropLat, effectivePropLng);

  // تحديث العنصر النشط بناءً على الـ Prop الخارجي
  useEffect(() => {
    if (selectedAmenityKey) {
      const found = amenitiesList.find((a) => a.key === selectedAmenityKey);
      if (found) {
        setActiveItem(found);
      }
    }
  }, [selectedAmenityKey]);

  // إنشاء وتجهيز خريطة Leaflet مع OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // تنظيف أي خريطة سابقة في الحاوية
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // إنشاء خريطة Leaflet
    const map = L.map(mapContainerRef.current, {
      center: [effectivePropLat, effectivePropLng],
      zoom: 16,
      zoomControl: false, // سنضيف أزرار تحكم مخصصة باللغة العربية
      attributionControl: true,
    });

    // إضافة طبقة OpenStreetMap المجانية بنسبة 100%
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    routeDecorationsRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // دبوس العقار الرئيسي بنبض راداري ولمسات مميزة
    const propertyIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping"></span>
        <span class="absolute -inset-4 rounded-full bg-emerald-500/15"></span>
        <div class="relative flex items-center gap-1.5 bg-emerald-600 text-white px-2.5 py-1 rounded-full shadow-lg border-2 border-white font-bold text-xs whitespace-nowrap">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <span>سكن مكاني</span>
        </div>
      </div>
    `;

    const propertyMarker = L.marker([effectivePropLat, effectivePropLng], {
      icon: L.divIcon({
        html: propertyIconHtml,
        className: "custom-property-pin",
        iconSize: [110, 40],
        iconAnchor: [55, 20],
      }),
      zIndexOffset: 1000,
    }).addTo(map);

    propertyMarker.bindPopup(`
      <div class="text-right p-1 text-sm font-sans" dir="rtl">
        <strong class="text-emerald-700 block font-bold mb-1">${propertyTitle}</strong>
        <p class="text-gray-600 text-xs mb-1">${propertyAddress}</p>
        <span class="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-semibold">موقع العقار المعتمد</span>
      </div>
    `);

    // تصحيح أبعاد الخريطة بعد التحميل
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [effectivePropLat, effectivePropLng, propertyTitle]);

  // دالة اختيار خدمة ورسم مسار المشي التفاعلي بالأمتار
  const handleSelectAmenity = useCallback(
    async (item: AmenityDisplayItem) => {
      setActiveItem(item);
      if (onSelectAmenity) {
        onSelectAmenity(item);
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      const aLat = item.lat ?? effectivePropLat;
      const aLng = item.lng ?? effectivePropLng;

      setIsCalculatingRoute(true);

      try {
        // حساب المسار الشارعي الفعلي عبر خوارزميات OpenStreetMap
        const result = await getWalkingRouteBetween(
          { lat: effectivePropLat, lng: effectivePropLng },
          { lat: aLat, lng: aLng }
        );

        setRouteInfo(result);

        // مسح أي مسارات سابقة
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
          polylineRef.current = null;
        }
        if (routeDecorationsRef.current) {
          routeDecorationsRef.current.clearLayers();
        }

        // رسم خط المسار التفاعلي المضيء على شوارع OpenStreetMap
        const polyline = L.polyline(result.coordinates, {
          color: "#059669", // emerald-600
          weight: 5,
          opacity: 0.85,
          dashArray: result.isRealStreetRoute ? undefined : "8, 8",
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map);

        polylineRef.current = polyline;

        // وضع دائرة مضيئة عند نقطة الوصول
        const destinationHalo = L.circleMarker([aLat, aLng], {
          radius: 8,
          color: "#059669",
          fillColor: "#34d399",
          fillOpacity: 0.9,
          weight: 2,
        });
        routeDecorationsRef.current?.addLayer(destinationHalo);

        // تحريك الخريطة لتشمل العقار والخدمة معاً بسلاسة
        const bounds = L.latLngBounds(result.coordinates);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 17,
          animate: true,
          duration: 0.8,
        });
      } catch (err) {
        console.error("Route calculation error:", err);
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    [effectivePropLat, effectivePropLng, onSelectAmenity]
  );

  // رسم وتحديث دبابيس الخدمات الحية بمجرد وصول بيانات OpenStreetMap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // مسح الدبابيس السابقة
    Object.values(markersRef.current).forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    const newMarkers: { [key: string]: L.Marker } = {};

    amenitiesList.forEach((amenity) => {
      const aLat = amenity.lat ?? effectivePropLat;
      const aLng = amenity.lng ?? effectivePropLng;

      const markerColor =
        amenity.iconType === "universityGate"
          ? "bg-purple-600 text-white"
          : amenity.iconType === "hospital"
          ? "bg-rose-600 text-white"
          : amenity.iconType === "pharmacy"
          ? "bg-emerald-600 text-white"
          : amenity.iconType === "transportation"
          ? "bg-blue-600 text-white"
          : amenity.iconType === "supermarket"
          ? "bg-amber-600 text-white"
          : "bg-orange-600 text-white";

      const pinHtml = `
        <div class="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110">
          <div class="flex items-center gap-1 ${markerColor} px-2 py-0.5 rounded-md shadow-md border border-white text-[11px] font-bold whitespace-nowrap">
            <span>${amenity.categoryName}</span>
          </div>
          <div class="w-2 h-2 -mt-1 rotate-45 ${markerColor}"></div>
        </div>
      `;

      const m = L.marker([aLat, aLng], {
        icon: L.divIcon({
          html: pinHtml,
          className: "custom-amenity-pin",
          iconSize: [80, 32],
          iconAnchor: [40, 16],
        }),
      }).addTo(map);

      m.on("click", () => {
        handleSelectAmenity(amenity);
      });

      newMarkers[amenity.key] = m;
    });

    markersRef.current = newMarkers;
  }, [amenitiesList, effectivePropLat, effectivePropLng, handleSelectAmenity]);

  // تفعيل رسم المسار عند اختيار الخدمة الافتراضية لأول مرة
  useEffect(() => {
    if (activeItem && mapInstanceRef.current && !polylineRef.current) {
      handleSelectAmenity(activeItem);
    }
  }, [activeItem, handleSelectAmenity]);

  // إعادة تركيز الخريطة على العقار
  const handleResetToProperty = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (routeDecorationsRef.current) {
      routeDecorationsRef.current.clearLayers();
    }
    setActiveItem(null);
    setRouteInfo(null);

    map.flyTo([effectivePropLat, effectivePropLng], 16, {
      animate: true,
      duration: 0.7,
    });
  };

  const osmUrl = activeItem
    ? getOpenStreetMapDirectionsUrl(
        effectivePropLat,
        effectivePropLng,
        activeItem.lat ?? effectivePropLat,
        activeItem.lng ?? effectivePropLng
      )
    : `https://www.openstreetmap.org/?mlat=${effectivePropLat}&mlon=${effectivePropLng}#map=16/${effectivePropLat}/${effectivePropLng}`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 ${
        isExpanded ? "fixed inset-4 z-50 rounded-2xl shadow-2xl" : className
      }`}
      id="osm-interactive-map-section"
      data-testid="interactive-leaflet-map"
    >
      {/* رأس الخريطة وتفاصيل الملاحة الحية */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/40 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Navigation size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-foreground">
                خريطة الشوارع والمسافات الذكية
              </h4>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                OpenStreetMap مفتوحة ومجانية
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              اضغط على أي خدمة أدناه لرسم مسار السير الفعلي وحساب المسافة والوقت
            </p>
          </div>
        </div>

        {/* أزرار التحكم بالخريطة */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleResetToProperty}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs hover:bg-muted transition-colors"
            title="التركيز على موقع العقار"
            data-testid="map-reset-focus-btn"
          >
            <RotateCcw size={13} className="text-muted-foreground" />
            <span>موقع العقار</span>
          </button>

          <a
            href={osmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-primary shadow-2xs hover:bg-primary/5 transition-colors"
            title="فتح المسار في OpenStreetMap"
            data-testid="map-open-osm-btn"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">فتح في OSM</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setIsExpanded(!isExpanded);
              setTimeout(() => {
                mapInstanceRef.current?.invalidateSize();
              }, 200);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
            title={isExpanded ? "تصغير الخريطة" : "تكبير الخريطة"}
            data-testid="map-toggle-expand-btn"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* شريط اختيار الخدمات السريع فوق الخريطة */}
      <div className="border-b border-border/60 bg-card/95 px-3 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {amenitiesList.map((item) => {
            const isSelected = activeItem?.key === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectAmenity(item)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs scale-102"
                    : "border border-border/80 bg-background text-foreground hover:border-primary/50 hover:bg-muted/50"
                }`}
                data-testid={`amenity-pill-${item.key}`}
              >
                {item.key === "universityGate" && <GraduationCap size={13} />}
                {item.key === "hospital" && <Hospital size={13} />}
                {item.key === "pharmacy" && <Pill size={13} />}
                {item.key === "transportation" && <Bus size={13} />}
                {item.key === "supermarket" && <ShoppingBag size={13} />}
                {item.key === "cafeRestaurant" && <Coffee size={13} />}
                <span>{item.categoryName}</span>
                <span
                  className={`text-[10px] font-bold ${
                    isSelected ? "text-primary-foreground/90" : "text-primary"
                  }`}
                >
                  {item.distance}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* مساحة الخريطة التفاعلية */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className={`w-full bg-muted transition-all duration-300 ${
            isExpanded ? "h-[calc(100vh-220px)]" : "h-[290px] sm:h-[340px]"
          }`}
          style={{ minHeight: "260px" }}
        />

        {/* بطاقة معلومات المسار النشط العائمة فوق الخريطة */}
        {activeItem && (
          <div
            className="absolute bottom-3 right-3 left-3 z-[400] max-w-md mx-auto rounded-xl border border-primary/30 bg-card/95 p-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2"
            dir="rtl"
            data-testid="active-route-card"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  {activeItem.key === "universityGate" && <GraduationCap size={16} />}
                  {activeItem.key === "hospital" && <Hospital size={16} />}
                  {activeItem.key === "pharmacy" && <Pill size={16} />}
                  {activeItem.key === "transportation" && <Bus size={16} />}
                  {activeItem.key === "supermarket" && <ShoppingBag size={16} />}
                  {activeItem.key === "cafeRestaurant" && <Coffee size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-foreground">
                      {activeItem.categoryName}
                    </span>
                    {activeItem.rating && activeItem.rating !== "0" && activeItem.rating !== "0.0" ? (
                      <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                        ⭐ تقييم مكاني: {activeItem.rating} / 5
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        لم يتم تقييمه بعد
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeItem.name || "خدمة معتمدة حول العقار"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetToProperty}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
                title="إغلاق المسار"
              >
                ✕
              </button>
            </div>

            {/* إحصائيات المسافة والوقت */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-2 text-xs">
              <div className="flex items-center gap-2">
                <Footprints size={15} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="block text-[10px] text-muted-foreground">مسار المشي</span>
                  <strong className="text-xs text-foreground">
                    {routeInfo && routeInfo.walkTimeFormatted && routeInfo.isRealStreetRoute
                      ? routeInfo.walkTimeFormatted
                      : "بيانات مسار المشي غير متاحة"}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-primary shrink-0" />
                <div>
                  <span className="block text-[10px] text-muted-foreground">المسافة</span>
                  <strong className="text-xs text-foreground truncate block">
                    {routeInfo && routeInfo.distanceFormatted && routeInfo.isRealStreetRoute
                      ? `مسافة الشارع: ${routeInfo.distanceFormatted}`
                      : (activeItem.distance?.startsWith("المسافة الجغرافية:")
                          ? activeItem.distance
                          : `المسافة الجغرافية: ${activeItem.distance}`)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 size={12} />
                موقع موثق من OpenStreetMap
              </span>
              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-bold flex items-center gap-0.5"
              >
                الملاحة عبر OSM ↗
              </a>
            </div>
          </div>
        )}

        {/* مؤشر جلب المسار */}
        {isCalculatingRoute && (
          <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 rounded-lg border border-primary/40 bg-card/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
            <span>جاري رسم مسار الشوارع...</span>
          </div>
        )}
      </div>

      {/* تذييل مصادر البيانات المفتوحة المجانية */}
      <div className="flex items-center justify-between border-t border-border/80 bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>© OpenStreetMap Contributors · Leaflet.js</span>
        <span>لا توجد أي رسوم أو واجهات مدفوعة</span>
      </div>
    </div>
  );
}
