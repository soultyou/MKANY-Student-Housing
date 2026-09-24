import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  Loader2,
  Plus,
  Minus,
  GraduationCap,
  Building2,
  Pill,
  Bus,
  ShoppingCart,
  Coffee,
  Compass
} from "lucide-react";
import {
  getCityDefaultCoordinates,
  LatLngCoord,
  searchNearbyRealPlaces,
  NearbyPlace,
  getWalkingRouteBetween,
  RouteCalculationResult
} from "@/lib/geo-utils";

interface PropertyLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  city?: string;
  university?: string;
  onLocationChange: (coords: LatLngCoord) => void;
  className?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function PropertyLocationPicker({
  initialLat,
  initialLng,
  city = "كفر الشيخ",
  university = "جامعة كفر الشيخ",
  onLocationChange,
  className = "",
}: PropertyLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const nearbyMarkersRef = useRef<L.Marker[]>([]);
  const searchTimeoutRef = useRef<any>(null);

  const defaultCoords = getCityDefaultCoordinates(city, university);
  const [selectedCoords, setSelectedCoords] = useState<LatLngCoord>({
    lat: initialLat || defaultCoords.lat,
    lng: initialLng || defaultCoords.lng,
  });

  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<"gps" | "manual" | "search" | "default">(
    initialLat ? "manual" : "default"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Nearby services state
  const [nearbyData, setNearbyData] = useState<{
    universities: NearbyPlace[];
    hospitals: NearbyPlace[];
    pharmacies: NearbyPlace[];
    transportation: NearbyPlace[];
    supermarkets: NearbyPlace[];
    cafes: NearbyPlace[];
    all: NearbyPlace[];
  } | null>(null);
  const [isNearbyLoading, setIsNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [showNearbySection, setShowNearbySection] = useState(true);

  // Routing state for selected place
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeDestinationMarkerRef = useRef<L.Marker | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const clearRoute = useCallback(() => {
    setSelectedPlace(null);
    setRouteResult(null);
    if (routeAbortRef.current) {
      routeAbortRef.current.abort();
    }
    const map = mapInstanceRef.current;
    if (map) {
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      if (routeDestinationMarkerRef.current) {
        map.removeLayer(routeDestinationMarkerRef.current);
        routeDestinationMarkerRef.current = null;
      }
    }
  }, []);

  // تحميل الخدمات المحيطة تلقائياً عند تغير الإحداثيات
  const loadNearbyServices = useCallback(async (lat: number, lng: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsNearbyLoading(true);
    setNearbyError(null);
    setNearbyData(null);
    clearRoute();

    try {
      const data = await searchNearbyRealPlaces(lat, lng, city, controller.signal);
      if (!controller.signal.aborted) {
        setNearbyData(data);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setNearbyError("تعذر تحميل الخدمات المحيطة حالياً");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsNearbyLoading(false);
      }
    }
  }, [city, clearRoute]);

  // Trigger automatic search when coordinates change
  useEffect(() => {
    loadNearbyServices(selectedCoords.lat, selectedCoords.lng);
  }, [selectedCoords.lat, selectedCoords.lng, loadNearbyServices]);

  // تحديث الإحداثيات وإشعار المكوّن الأب مع جلب العنوان وعكسي وجلب الخدمات
  const updatePosition = useCallback(
    async (lat: number, lng: number, source: "gps" | "manual" | "search") => {
      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));
      const newCoords = { lat: roundedLat, lng: roundedLng };
      setSelectedCoords(newCoords);
      setLocationSource(source);
      onLocationChange(newCoords);

      if (markerRef.current) {
        markerRef.current.setLatLng([roundedLat, roundedLng]);
      }

      clearRoute();

      // Reverse geocoding
      setIsReverseGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&accept-language=ar`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.display_name) {
            setResolvedAddress(data.display_name);
          }
        }
      } catch (err) {
        // ignore
      } finally {
        setIsReverseGeocoding(false);
      }

      // Trigger automatic nearby services
      loadNearbyServices(roundedLat, roundedLng);
    },
    [onLocationChange, loadNearbyServices, clearRoute]
  );

  const handleSelectPlace = useCallback(
    async (place: NearbyPlace) => {
      setSelectedPlace(place);
      setIsRouteLoading(true);
      setRouteResult(null);

      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
      }
      const controller = new AbortController();
      routeAbortRef.current = controller;

      const map = mapInstanceRef.current;
      if (!map) {
        setIsRouteLoading(false);
        return;
      }

      try {
        const result = await getWalkingRouteBetween(
          { lat: selectedCoords.lat, lng: selectedCoords.lng },
          { lat: place.lat, lng: place.lng }
        );

        if (controller.signal.aborted) return;
        setRouteResult(result);

        if (routePolylineRef.current) {
          map.removeLayer(routePolylineRef.current);
          routePolylineRef.current = null;
        }
        if (routeDestinationMarkerRef.current) {
          map.removeLayer(routeDestinationMarkerRef.current);
          routeDestinationMarkerRef.current = null;
        }

        const polyline = L.polyline(result.coordinates, {
          color: "#059669",
          weight: 5,
          opacity: 0.85,
          dashArray: result.isRealStreetRoute ? undefined : "8, 8",
          lineJoin: "round",
          lineCap: "round",
        }).addTo(map);
        routePolylineRef.current = polyline;

        const destMarker = L.marker([place.lat, place.lng], {
          icon: L.divIcon({
            html: `<div class="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-white whitespace-nowrap">📍 ${place.name}</div>`,
            className: "custom-dest-pin",
            iconSize: [140, 36],
            iconAnchor: [70, 18],
          }),
        }).addTo(map);
        routeDestinationMarkerRef.current = destMarker;

        const bounds = L.latLngBounds(result.coordinates);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Route calculation error:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRouteLoading(false);
        }
      }
    },
    [selectedCoords.lat, selectedCoords.lng]
  );

  // إعداد وتجهيز خريطة Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [selectedCoords.lat, selectedCoords.lng],
      zoom: 16,
      zoomControl: false,
    });

    // إضافة طبقة OpenStreetMap المفتوحة والمجانية
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    mapInstanceRef.current = map;

    // دبوس تحديد الموقع الأساسي للعقار
    const markerHtml = `
      <div class="relative flex flex-col items-center cursor-grab active:cursor-grabbing">
        <div class="flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-1 rounded-full shadow-lg border-2 border-white font-bold text-xs whitespace-nowrap">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          <span>موقع العقار</span>
        </div>
        <div class="w-2.5 h-2.5 -mt-1 rotate-45 bg-primary border-r-2 border-b-2 border-white"></div>
        <div class="w-4 h-1.5 bg-black/30 rounded-full blur-[1px] mt-0.5"></div>
      </div>
    `;

    const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
      draggable: true,
      icon: L.divIcon({
        html: markerHtml,
        className: "custom-picker-pin",
        iconSize: [110, 48],
        iconAnchor: [55, 44],
      }),
    }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      updatePosition(pos.lat, pos.lng, "manual");
    });

    markerRef.current = marker;

    map.on("click", (e: L.LeafletMouseEvent) => {
      updatePosition(e.latlng.lat, e.latlng.lng, "manual");
      map.panTo(e.latlng, { animate: true });
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Initial load of nearby services
    loadNearbyServices(selectedCoords.lat, selectedCoords.lng);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // تحديث علامات الخدمات المحيطة على الخريطة عند توفرها
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old nearby markers
    nearbyMarkersRef.current.forEach((m) => m.remove());
    nearbyMarkersRef.current = [];

    if (!nearbyData || !nearbyData.all) return;

    // Add markers for nearby places
    nearbyData.all.forEach((place) => {
      const isUni = place.category === "university";
      const bgClass = isUni ? "bg-purple-600 text-white" : "bg-card text-foreground border border-border";
      const iconSymbol = isUni ? "🎓" : place.category === "hospital" ? "🏥" : place.category === "pharmacy" ? "💊" : place.category === "transportation" ? "🚌" : "🛒";

      const html = `
        <div class="flex items-center gap-1 px-2 py-1 rounded-full shadow-md text-[11px] font-bold ${bgClass} whitespace-nowrap">
          <span>${iconSymbol}</span>
          <span class="max-w-[90px] truncate">${place.name}</span>
          <span class="opacity-80 text-[10px]">(${place.distanceFormatted})</span>
        </div>
      `;

      const nearbyMarker = L.marker([place.lat, place.lng], {
        icon: L.divIcon({
          html,
          className: "custom-nearby-pin",
          iconSize: [120, 32],
          iconAnchor: [60, 16],
        }),
      }).addTo(map);

      nearbyMarkersRef.current.push(nearbyMarker);
    });
  }, [nearbyData]);

  // بحث OpenStreetMap Nominatim للأماكن والشوارع
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&countrycodes=eg&limit=5&accept-language=ar`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSelectSearchResult = (item: SearchResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (isNaN(lat) || isNaN(lng)) return;

    setSearchQuery("");
    setSearchResults([]);
    setResolvedAddress(item.display_name);
    updatePosition(lat, lng, "search");

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 17, {
        animate: true,
        duration: 0.8,
      });
    }
  };

  const handleShareCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("المتصفح لا يدعم تحديد الموقع الجغرافي");
      return;
    }

    setIsLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updatePosition(latitude, longitude, "gps");

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17, {
            animate: true,
            duration: 1,
          });
        }
        setIsLocatingGps(false);
      },
      (err) => {
        setIsLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("تم رفض إذن الوصول للموقع، يمكنك النقر على الخريطة لتحديده يدوياً.");
        } else {
          setGpsError("تعذر التقاط الموقع بدقة، يرجى تحديد العقار بالضغط على الخريطة.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleResetToCityDefault = () => {
    const coords = getCityDefaultCoordinates(city, university);
    updatePosition(coords.lat, coords.lng, "manual");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, {
        animate: true,
      });
    }
  };

  return (
    <div
      className={`rounded-xl border border-border bg-card overflow-hidden shadow-sm ${className}`}
      data-testid="property-location-picker"
    >
      {/* شريط الإجراءات والبحث المتقدم عن الأماكن */}
      <div className="border-b border-border/80 bg-muted/30 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <MapPin size={16} className="text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              تحديد موقع العقار وبحث الأماكن والخدمات المحيطة
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShareCurrentLocation}
              disabled={isLocatingGps}
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
              data-testid="gps-share-btn"
            >
              {isLocatingGps ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin"></span>
                  <span>جاري الالتقاط...</span>
                </>
              ) : (
                <>
                  <Navigation size={13} />
                  <span>موقعي (GPS)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetToCityDefault}
              className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="إعادة التمركز نحو مركز المدينة"
              data-testid="reset-city-center-btn"
            >
              <RotateCcw size={12} className="text-muted-foreground" />
              <span>المركز</span>
            </button>
          </div>
        </div>

        {/* خانة بحث الأماكن والشوارع الحية */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search size={15} className="absolute right-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن مدينة، جامعة، شارع، أو معلم (مثل: طنطا، جامعة كفر الشيخ، شارع البحر)..."
              className="w-full rounded-xl border border-border bg-background py-2 pr-9 pl-8 text-xs font-medium text-foreground outline-none focus:border-primary shadow-2xs"
              data-testid="map-location-search-input"
            />
            {isSearching && (
              <Loader2 size={14} className="absolute left-3 animate-spin text-primary" />
            )}
          </div>

          {/* قائمة نتائج البحث المنسدلة */}
          {searchResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 z-[500] mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl"
              dir="rtl"
            >
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-muted/80 text-foreground transition-colors flex items-start gap-2 border-b border-border/40 last:border-0"
                  data-testid="search-result-item"
                >
                  <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                  <span className="line-clamp-2 leading-relaxed">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* رسالة الخطأ إن وجدت */}
      {gpsError && (
        <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2 text-xs text-destructive border-b border-destructive/20">
          <AlertCircle size={14} className="shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* مساحة الخريطة التفاعلية مع أزرار تكبير وتصغير عائمة */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="h-[250px] sm:h-[300px] w-full bg-muted"
        />

        {/* أزرار تكبير وتصغير الخريطة عائمة */}
        <div className="absolute top-2 left-2 z-[400] flex flex-col gap-1 rounded-lg border border-border/80 bg-background/90 p-1 shadow-md backdrop-blur-xs">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted text-foreground transition-colors"
            title="تكبير"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted text-foreground transition-colors"
            title="تصغير"
          >
            <Minus size={14} />
          </button>
        </div>

        <div className="absolute bottom-2 right-2 z-[400] rounded-md bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-xs border border-border/80 pointer-events-none">
          💡 انقر في أي مكان أو اسحب الدبوس لتحديد موقع العقار والخدمات المحيطة تلقائياً
        </div>
      </div>

      {/* بطاقة العنوان المكتشف والإحداثيات */}
      <div className="bg-muted/40 p-3 text-xs border-t border-border/80 space-y-1.5">
        {resolvedAddress && (
          <div className="flex items-start gap-1.5 text-foreground">
            <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold text-[11px] text-muted-foreground ml-1">العنوان المكتشف:</span>
              <span className="text-xs font-semibold leading-relaxed">{resolvedAddress}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-muted-foreground text-[11px]">
              خط العرض: <strong className="text-foreground">{selectedCoords.lat}</strong>
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground text-[11px]">
              خط الطول: <strong className="text-foreground">{selectedCoords.lng}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {locationSource === "gps" ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 size={13} /> GPS الحقيقي
              </span>
            ) : locationSource === "search" ? (
              <span className="flex items-center gap-1 text-purple-600 font-bold">
                <CheckCircle2 size={13} /> بحث OpenStreetMap
              </span>
            ) : locationSource === "manual" ? (
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Crosshair size={13} /> تحديد يدوي / سحب
              </span>
            ) : (
              <span className="text-muted-foreground">الموقع الافتراضي</span>
            )}
          </div>
        </div>
      </div>

      {/* قسم الخدمات المحيطة وأقرب الجامعات التلقائي */}
      <div className="border-t border-border bg-card p-3.5 space-y-3" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-primary" />
            <h4 className="text-xs font-bold text-foreground">الخدمات المحيطة وأقرب الجامعات</h4>
            {isNearbyLoading && <Loader2 size={13} className="animate-spin text-primary" />}
          </div>
          <button
            type="button"
            onClick={() => setShowNearbySection(!showNearbySection)}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            {showNearbySection ? "إخفاء التفاصيل" : "عرض التفاصيل"}
          </button>
        </div>

        {showNearbySection && (
          <div className="space-y-3 pt-1">
            {isNearbyLoading && !nearbyData && (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>جاري استكشاف الجامعات والخدمات القريبة تلقائياً من خريطة OpenStreetMap...</span>
              </div>
            )}

            {nearbyError && (
              <div className="bg-destructive/10 p-2.5 rounded-lg text-xs text-destructive">
                {nearbyError}
              </div>
            )}

            {nearbyData && (
              <>
                {/* 1. أقرب الجامعات والمعاهد */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-400">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={15} />
                      <span>أقرب الجامعات والمعاهد:</span>
                    </div>
                    {selectedPlace && (
                      <button
                        type="button"
                        onClick={clearRoute}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                      >
                        إلغاء تحديد الوجهة ومسح المسار
                      </button>
                    )}
                  </div>

                  {nearbyData.universities.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {nearbyData.universities.map((uni, idx) => {
                        const isSelected = selectedPlace?.id === uni.id;
                        return (
                          <div
                            key={uni.id}
                            onClick={() => handleSelectPlace(uni)}
                            className={`flex flex-col p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20"
                                : "border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 pr-1">
                                <div className="font-bold text-foreground truncate flex items-center gap-1.5">
                                  <span>{uni.name}</span>
                                  {isSelected && (
                                    <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                      ✓ تم تحديد الوجهة
                                    </span>
                                  )}
                                  {idx === 0 && !isSelected && (
                                    <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                      أقرب جامعة/معهد للسكن 🎓
                                    </span>
                                  )}
                                </div>
                                {uni.address && (
                                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                    {uni.address}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <div className="font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded-lg">
                                  {uni.distanceFormatted}
                                </div>
                                <span className="text-[10px] text-primary font-semibold">
                                  {isSelected ? "معروض على الخريطة" : "اضغط لعرض الطريق"}
                                </span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="mt-2.5 pt-2 border-t border-emerald-200 dark:border-emerald-900/50 text-[11px] space-y-1 bg-white/90 dark:bg-background/90 p-2 rounded-lg">
                                <div className="flex justify-between items-center text-muted-foreground">
                                  <span>المسافة الجغرافية:</span>
                                  <strong className="text-foreground">{uni.distanceFormatted}</strong>
                                </div>
                                {isRouteLoading ? (
                                  <div className="flex items-center gap-1.5 text-primary py-1">
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>جاري حساب مسار المشي الفعلي...</span>
                                  </div>
                                ) : routeResult ? (
                                  <>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                      <span>مسافة الطريق:</span>
                                      <strong className="text-emerald-700 dark:text-emerald-400">{routeResult.distanceFormatted}</strong>
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-emerald-800 dark:text-emerald-300 pt-0.5">
                                      <span>🚶 مسار المشي:</span>
                                      <span>{routeResult.walkTimeFormatted}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-amber-600 text-[10px]">تعذر حساب مسار الشارع، تم عرض المسافة الجغرافية.</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg text-center">
                      لم يتم العثور على نتائج حقيقية ضمن النطاق المطلوب للجامعات والمعاهد.
                    </div>
                  )}
                </div>

                {/* 2. الخدمات المحيطة (نطاق 1 كم كحد أقصى) */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-bold text-foreground">الخدمات المحيطة (ضمن نطاق 1 كم):</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* مستشفيات */}
                    {(() => {
                      const h = nearbyData.hospitals[0];
                      const isSelected = h && selectedPlace?.id === h.id;
                      return (
                        <div
                          onClick={() => h && handleSelectPlace(h)}
                          className={`p-2.5 rounded-xl border transition-all text-xs ${
                            h ? "cursor-pointer" : "opacity-60 cursor-default"
                          } ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20"
                              : "border-border bg-muted/30 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 font-bold text-rose-600">
                              <Building2 size={13} />
                              <span>أقرب مستشفى</span>
                            </div>
                            {h && (
                              <span className="text-[10px] text-primary font-semibold">
                                {isSelected ? "محدد" : "اضغط"}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-foreground truncate">
                            {h ? h.name : "غير متوفر"}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span>{h ? h.distanceFormatted : "-"}</span>
                            {isSelected && routeResult && (
                              <span className="text-emerald-700 font-bold">🚶 {routeResult.walkTimeFormatted}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* صيدليات */}
                    {(() => {
                      const p = nearbyData.pharmacies[0];
                      const isSelected = p && selectedPlace?.id === p.id;
                      return (
                        <div
                          onClick={() => p && handleSelectPlace(p)}
                          className={`p-2.5 rounded-xl border transition-all text-xs ${
                            p ? "cursor-pointer" : "opacity-60 cursor-default"
                          } ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20"
                              : "border-border bg-muted/30 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 font-bold text-emerald-600">
                              <Pill size={13} />
                              <span>أقرب صيدلية</span>
                            </div>
                            {p && (
                              <span className="text-[10px] text-primary font-semibold">
                                {isSelected ? "محدد" : "اضغط"}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-foreground truncate">
                            {p ? p.name : "غير متوفر"}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span>{p ? p.distanceFormatted : "-"}</span>
                            {isSelected && routeResult && (
                              <span className="text-emerald-700 font-bold">🚶 {routeResult.walkTimeFormatted}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* مواصلات */}
                    {(() => {
                      const t = nearbyData.transportation[0];
                      const isSelected = t && selectedPlace?.id === t.id;
                      return (
                        <div
                          onClick={() => t && handleSelectPlace(t)}
                          className={`p-2.5 rounded-xl border transition-all text-xs ${
                            t ? "cursor-pointer" : "opacity-60 cursor-default"
                          } ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20"
                              : "border-border bg-muted/30 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 font-bold text-blue-600">
                              <Bus size={13} />
                              <span>محطة المواصلات</span>
                            </div>
                            {t && (
                              <span className="text-[10px] text-primary font-semibold">
                                {isSelected ? "محدد" : "اضغط"}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-foreground truncate">
                            {t ? t.name : "غير متوفر"}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span>{t ? t.distanceFormatted : "-"}</span>
                            {isSelected && routeResult && (
                              <span className="text-emerald-700 font-bold">🚶 {routeResult.walkTimeFormatted}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* سوبر ماركت */}
                    {(() => {
                      const s = nearbyData.supermarkets[0];
                      const isSelected = s && selectedPlace?.id === s.id;
                      return (
                        <div
                          onClick={() => s && handleSelectPlace(s)}
                          className={`p-2.5 rounded-xl border transition-all text-xs ${
                            s ? "cursor-pointer" : "opacity-60 cursor-default"
                          } ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20"
                              : "border-border bg-muted/30 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 font-bold text-amber-600">
                              <ShoppingCart size={13} />
                              <span>السوبر ماركت</span>
                            </div>
                            {s && (
                              <span className="text-[10px] text-primary font-semibold">
                                {isSelected ? "محدد" : "اضغط"}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-foreground truncate">
                            {s ? s.name : "غير متوفر"}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span>{s ? s.distanceFormatted : "-"}</span>
                            {isSelected && routeResult && (
                              <span className="text-emerald-700 font-bold">🚶 {routeResult.walkTimeFormatted}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* المقاهي والمطاعم */}
                    {(() => {
                      const c = nearbyData.cafes[0];
                      const isSelected = c && selectedPlace?.id === c.id;
                      return (
                        <div
                          onClick={() => c && handleSelectPlace(c)}
                          className={`p-2.5 rounded-xl border transition-all text-xs col-span-2 sm:col-span-1 ${
                            c ? "cursor-pointer" : "opacity-60 cursor-default"
                          } ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/80 shadow-md ring-2 ring-emerald-500/20"
                              : "border-border bg-muted/30 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1 font-bold text-purple-600">
                              <Coffee size={13} />
                              <span>المقاهي والمطاعم</span>
                            </div>
                            {c && (
                              <span className="text-[10px] text-primary font-semibold">
                                {isSelected ? "محدد" : "اضغط"}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-foreground truncate">
                            {c ? c.name : "غير متوفر"}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span>{c ? c.distanceFormatted : "-"}</span>
                            {isSelected && routeResult && (
                              <span className="text-emerald-700 font-bold">🚶 {routeResult.walkTimeFormatted}</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
