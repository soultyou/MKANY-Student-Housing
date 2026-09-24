import React, { useState } from "react";
import { 
  X, 
  Plus, 
  Check, 
  Building2, 
  Camera, 
  MapPin, 
  Calendar, 
  Phone, 
  Upload, 
  Trash2, 
  Sparkles, 
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  DollarSign,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useAuth } from "@/components/auth/clerk-auth";
import { PropertyLocationPicker } from "@/components/map/PropertyLocationPicker";
import { LatLngCoord, getCityDefaultCoordinates } from "@/lib/geo-utils";
import { StandardModal } from "@/components/ui/StandardModal";
import { 
  createApartmentApi, 
  updateApartmentApi, 
  uploadMultipleImagesApi, 
  uploadSingleImageApi 
} from "@/lib/api-client";
import { PlatformProperty } from "@/lib/inspections-store";

interface OwnerApartmentModalProps {
  onClose: () => void;
  onSuccess: (apartment: any) => void;
  openToast: (msg: string) => void;
  initialData?: PlatformProperty | null;
}

const PRESET_SAMPLE_PHOTOS = [
  "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200"
];

const UNIVERSITIES_LIST = [
  "جامعة كفر الشيخ",
  "جامعة المنصورة",
  "جامعة طنطا",
  "جامعة القاهرة",
  "جامعة عين شمس",
  "جامعة حلوان",
  "جامعة الإسكندرية",
  "جامعة الزقازيق",
  "جامعة المنوفية",
  "جامعة بنها",
  "جامعة أسيوط",
  "جامعة أخرى"
];

export function OwnerApartmentModal({
  onClose,
  onSuccess,
  openToast,
  initialData
}: OwnerApartmentModalProps) {
  const { user } = useAuth();
  const isEditing = Boolean(initialData && initialData.id);

  const [title, setTitle] = useState(initialData?.title || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [city, setCity] = useState(initialData?.city || "كفر الشيخ");
  const [university, setUniversity] = useState(initialData?.university || "جامعة كفر الشيخ");
  const [roomType, setRoomType] = useState(initialData?.roomType || "شقة مشتركة");
  const [pricePerMonth, setPricePerMonth] = useState<number>(initialData?.pricePerMonth || 900);
  const [areaSqm, setAreaSqm] = useState<number>(initialData?.areaSqm || 110);
  const [bedrooms, setBedrooms] = useState<number>(initialData?.bedrooms || 3);
  const [bathrooms, setBathrooms] = useState<number>(initialData?.bathrooms || 2);
  const [floor, setFloor] = useState(initialData?.floor || "الدور الثالث");
  const [furnishing, setFurnishing] = useState(initialData?.furnishing || "مفروشة بالكامل");
  const [availableFrom, setAvailableFrom] = useState(initialData?.availableFrom || "متاح الآن فوراً");
  const [currentRoommates, setCurrentRoommates] = useState<number>(initialData?.currentRoommates || 0);
  const [status, setStatus] = useState<string>(initialData?.status || "قيد المراجعة");
  const [description, setDescription] = useState(
    (initialData as any)?.description || "شقة طلابية متميزة قريبة من الحرم الجامعي والمواصلات العامة ومزودة بكافة الخدمات الأساسية."
  );
  
  const [coords, setCoords] = useState<LatLngCoord | null>(
    initialData?.lat && initialData?.lng ? { lat: initialData.lat, lng: initialData.lng } : null
  );

  // الصور المرفوعة للعقار
  const [photos, setPhotos] = useState<string[]>(() => {
    if (initialData?.images && initialData.images.length > 0) {
      return initialData.images;
    }
    return [PRESET_SAMPLE_PHOTOS[0], PRESET_SAMPLE_PHOTOS[1]];
  });

  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUniversityChange = (selectedUni: string) => {
    setUniversity(selectedUni);
    const inferredCity = selectedUni.replace("جامعة ", "").trim();
    if (inferredCity && inferredCity !== "أخرى") {
      setCity(inferredCity);
    }
  };

  const handleAddSamplePhotos = () => {
    setPhotos(PRESET_SAMPLE_PHOTOS);
    openToast("تم إضافة ٤ صور نموذجية للوحدة");
  };

  const handleAddPhotoUrl = () => {
    if (!customPhotoUrl.trim()) return;
    setPhotos((prev) => [...prev, customPhotoUrl.trim()]);
    setCustomPhotoUrl("");
    openToast("تمت إضافة رابط الصورة");
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setPhotos((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
    openToast("تم تعيين الصورة كغلاف رئيسي");
  };

  // رفع الصور عبر خدمة Supabase Storage مع fallback آمن
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(`جاري رفع ${files.length} صور إلى التخزين السحابي...`);
      const fileArray = Array.from(files);

      const res = await uploadMultipleImagesApi(fileArray);
      if (res && res.urls && res.urls.length > 0) {
        setPhotos((prev) => [...prev, ...res.urls]);
        openToast(`تم رفع ${res.urls.length} صور إلى Supabase Storage بنجاح ✨`);
      } else {
        throw new Error("No URLs returned");
      }
    } catch (err: any) {
      console.warn("Supabase Storage upload warning, attempting single fallback / data preview:", err);
      // Fallback per file if multiple fails
      let successCount = 0;
      for (const file of Array.from(files)) {
        try {
          const singleRes = await uploadSingleImageApi(file);
          if (singleRes && singleRes.url) {
            setPhotos((prev) => [...prev, singleRes.url]);
            successCount++;
          }
        } catch {
          // Local fallback preview
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setPhotos((prev) => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
      if (successCount > 0) {
        openToast(`تم رفع ${successCount} صور بنجاح`);
      } else {
        openToast(`تم إرفاق ${files.length} صور بنجاح`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("يرجى إدخال اسم أو عنوان مختصر للوحدة.");
      return;
    }
    if (!address.trim()) {
      setError("يرجى إدخال العنوان الدقيق وموقع الشقة بالتفصيل.");
      return;
    }
    if (!pricePerMonth || pricePerMonth <= 0) {
      setError("يرجى تحديد قيمة إيجار شهرية صحيحة.");
      return;
    }

    try {
      setIsSubmitting(true);

      const defaultCoords = getCityDefaultCoordinates(city);
      const effectiveLat = coords?.lat || defaultCoords.lat;
      const effectiveLng = coords?.lng || defaultCoords.lng;

      const payload = {
        title: title.trim(),
        address: address.trim(),
        city,
        university,
        roomType,
        pricePerMonth: Number(pricePerMonth),
        areaSqm: Number(areaSqm),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        floor,
        furnishing,
        availableFrom,
        currentRoommates: Number(currentRoommates),
        status: !initialData
          ? "قيد المراجعة"
          : initialData.status === "قيد المراجعة"
          ? "قيد المراجعة"
          : initialData.status === "مرفوض"
          ? "مرفوض"
          : (status === "مشغول" ? "مشغول" : "متاح"),
        description: description.trim(),
        photos: photos.filter(Boolean),
        images: photos.filter(Boolean),
        lat: effectiveLat,
        lng: effectiveLng,
        livabilityScore: initialData?.livabilityScore || 91,
      };

      let result;
      if (isEditing && initialData) {
        result = await updateApartmentApi(initialData.id, payload);
        openToast(`تم تحديث بيانات الوحدة "${title}" بنجاح ✨`);
      } else {
        result = await createApartmentApi(payload);
        openToast(`تمت إضافة الوحدة وحفظها في قاعدة البيانات بنجاح 🏢`);
      }

      // إخطار باقي الواجهات لتحديث البيانات فوراً
      window.dispatchEvent(new CustomEvent("mkany_properties_updated"));
      onSuccess(result);
    } catch (err: any) {
      console.error("Error saving apartment:", err);
      setError(err?.message || err?.data?.message || "حدث خطأ أثناء حفظ بيانات الوحدة. يرجى التحقق من المدخلات والمحاولة مجدداً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? `تعديل الوحدة السكنية: ${initialData?.title}` : "إضافة وحدة سكنية جديدة للمنصة"}
      subtitle={isEditing ? "تحديث الأسعار والمواصفات والصور" : "أدخل مواصفات السكن وارفع صور الوحدة لتظهر مباشرة للطلاب"}
      maxWidthClassName="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-foreground" data-testid="owner-apartment-form">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* القسم الأول: اسم العقار والموقع */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
            <Building2 size={16} />
            البيانات الأساسية والموقع
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1.5">
                عنوان أو اسم الوحدة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: شقة طلابية راقية أمام بوابة الجامعة"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
                data-testid="input-apartment-title"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">
                الجامعة الأقرب <span className="text-rose-500">*</span>
              </label>
              <select
                value={university}
                onChange={(e) => handleUniversityChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="select-apartment-university"
              >
                {UNIVERSITIES_LIST.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">
                المدينة / المحافظة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                required
                data-testid="input-apartment-city"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1.5">
                العنوان التفصيلي واسم الشارع <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="مثال: شارع معهد الكبد، متفرع من شارع الجامعة، عمارة الأمل الدور الثالث"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                required
                data-testid="input-apartment-address"
              />
            </div>
          </div>

          {/* محدد الموقع التفاعلي */}
          <div className="pt-2">
            <PropertyLocationPicker
              city={city}
              university={university}
              initialLat={coords?.lat}
              initialLng={coords?.lng}
              onLocationChange={setCoords}
            />
          </div>
        </div>

        {/* القسم الثاني: المواصفات والإيجار */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
            <DollarSign size={16} />
            المواصفات المالية ونوع السكن
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold mb-1.5">
                قيمة الإيجار الشهري (ج.م) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={100}
                max={50000}
                value={pricePerMonth}
                onChange={(e) => setPricePerMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-primary focus:border-primary focus:outline-none"
                required
                data-testid="input-apartment-price"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">
                نوع السكن <span className="text-rose-500">*</span>
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="select-apartment-roomtype"
              >
                <option value="شقة مشتركة">شقة مشتركة (غرف متعددة)</option>
                <option value="غرفة مفردة">غرفة مفردة خاصة</option>
                <option value="غرفة مزدوجة">غرفة مزدوجة (شخصين)</option>
                <option value="استوديو">استوديو مستقل</option>
                <option value="شقة كاملة">شقة كاملة للعائلات أو المجموعات</option>
                <option value="سرير في غرفة مشتركة">سرير في غرفة مشتركة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">
                حالة الاعتماد والنشر <span className="text-rose-500">*</span>
              </label>
              {(!initialData || initialData.status === "قيد المراجعة") ? (
                <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  قيد المراجعة والاعتماد — يتم الاعتماد والنشر حصراً بواسطة الإدارة بعد المعاينة
                </div>
              ) : initialData.status === "مرفوض" ? (
                <div className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  العقار مرفوض من الإدارة — يرجى مراجعة المعايير
                </div>
              ) : (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold focus:border-primary focus:outline-none"
                  data-testid="select-apartment-status"
                >
                  <option value="متاح">متاح الآن للحجز</option>
                  <option value="مشغول">مشغول حالياً</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">المساحة (م²)</label>
              <input
                type="number"
                min={15}
                max={500}
                value={areaSqm}
                onChange={(e) => setAreaSqm(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="input-apartment-area"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">عدد الغرف</label>
              <input
                type="number"
                min={1}
                max={15}
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="input-apartment-bedrooms"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">عدد الحمامات</label>
              <input
                type="number"
                min={1}
                max={8}
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="input-apartment-bathrooms"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">الدور / الطابق</label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="مثال: الدور الثاني (يوجد أسانسير)"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="input-apartment-floor"
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">حالة الفرش</label>
              <select
                value={furnishing}
                onChange={(e) => setFurnishing(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="select-apartment-furnishing"
              >
                <option value="مفروشة بالكامل">مفروشة بالكامل (سوبر لوكس)</option>
                <option value="مفروشة جزئياً">مفروشة جزئياً</option>
                <option value="بدون فرش">بدون فرش</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">تاريخ التوفر</label>
              <input
                type="text"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                placeholder="متاح الآن فوراً"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                data-testid="input-apartment-available-from"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5">الوصف والمزايا الإضافية</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب تفاصيل عن الأجهزة المتاحة (غسالة، ثلاجة، سخان)، شبكة الإنترنت، الهدوء، شروط السكن..."
              className="w-full rounded-xl border border-border bg-background p-3.5 text-sm focus:border-primary focus:outline-none"
              data-testid="textarea-apartment-description"
            />
          </div>
        </div>

        {/* القسم الثالث: رفع وإدارة صور العقار (Supabase Storage) */}
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                <Camera size={16} />
                صور الوحدة السكنية ({photos.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                يتم رفع الصور وحفظها في التخزين السحابي الآمن (Supabase Storage).
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddSamplePhotos}
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
            >
              إضافة صور نموذجية سريعة 📸
            </button>
          </div>

          {/* منطقة رفع الصور */}
          <div className="rounded-xl border-2 border-dashed border-border bg-background/50 p-6 text-center">
            <label className="cursor-pointer block">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading}
                data-testid="input-upload-photos"
              />
              <div className="flex flex-col items-center justify-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {isUploading ? <Loader2 className="animate-spin" size={28} /> : <Upload size={28} />}
                </div>
                <strong className="text-sm font-bold text-foreground">
                  {isUploading ? uploadProgress || "جاري رفع الصور..." : "اضغط هنا لاختيار صور من جهازك أو اسحب الصور هنا"}
                </strong>
                <span className="mt-1 text-xs text-muted-foreground">
                  يدعم صور JPEG, PNG, WebP (بحد أقصى 10MB لكل صورة)
                </span>
              </div>
            </label>
          </div>

          {/* إضافة عبر رابط خارجي مباشر */}
          <div className="flex gap-2">
            <input
              type="url"
              value={customPhotoUrl}
              onChange={(e) => setCustomPhotoUrl(e.target.value)}
              placeholder="أو أضف رابط صورة مباشر (URL)..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-xs focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddPhotoUrl}
              className="rounded-xl bg-muted px-4 py-2.5 text-xs font-bold hover:bg-muted/80 text-foreground"
            >
              إضافة الرابط
            </button>
          </div>

          {/* معرض الصور المرفوعة */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
              {photos.map((url, idx) => (
                <div
                  key={idx}
                  className={`group relative overflow-hidden rounded-xl border bg-card transition-all ${
                    idx === 0 ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                  data-testid={`photo-item-${idx}`}
                >
                  <img
                    src={url}
                    alt={`صورة عقار ${idx + 1}`}
                    className="h-28 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_SAMPLE_PHOTOS[0];
                    }}
                  />
                  
                  {idx === 0 && (
                    <span className="absolute top-2 right-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow">
                      الغلاف الرئيسي
                    </span>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetCoverPhoto(idx)}
                        title="تعيين كصورة غلاف"
                        className="rounded-lg bg-primary/90 p-1.5 text-primary-foreground hover:bg-primary"
                      >
                        <Sparkles size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      title="حذف الصورة"
                      className="rounded-lg bg-rose-600/90 p-1.5 text-white hover:bg-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* أزرار الحفظ والإلغاء */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-border bg-background px-6 py-3 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-xs font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            data-testid="button-submit-apartment"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>جاري الحفظ في قاعدة البيانات...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>{isEditing ? "حفظ التعديلات" : "إدراج الوحدة وحفظها"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </StandardModal>
  );
}
