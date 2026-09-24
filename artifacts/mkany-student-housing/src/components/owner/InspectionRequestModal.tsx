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
  FileText
} from "lucide-react";
import { createInspectionRequest, createInspectionRequestAsync, uploadImageFiles } from "@/lib/inspections-store";
import { useAuth } from "@/components/auth/clerk-auth";
import { PropertyLocationPicker } from "@/components/map/PropertyLocationPicker";
import { LatLngCoord } from "@/lib/geo-utils";
import { StandardModal } from "@/components/ui/StandardModal";

interface InspectionRequestModalProps {
  onClose: () => void;
  onSuccess: (newId: string) => void;
  openToast: (msg: string) => void;
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

export function InspectionRequestModal({
  onClose,
  onSuccess,
  openToast,
}: InspectionRequestModalProps) {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("كفر الشيخ");
  const [university, setUniversity] = useState("جامعة كفر الشيخ");
  const [roomType, setRoomType] = useState("شقة مشتركة");
  const [pricePerMonth, setPricePerMonth] = useState<number>(900);
  const [areaSqm, setAreaSqm] = useState<number>(110);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [floor, setFloor] = useState("الثالث");
  const [furnishing, setFurnishing] = useState("مفروشة بالكامل");
  const [ownerPhone, setOwnerPhone] = useState(user?.phoneNumber || "01287654321");
  const [preferredDate, setPreferredDate] = useState("خلال هذا الأسبوع (صباحاً)");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<LatLngCoord | null>(null);
  
  // صور العقار الأولية
  const [photos, setPhotos] = useState<string[]>([
    PRESET_SAMPLE_PHOTOS[0],
    PRESET_SAMPLE_PHOTOS[1],
  ]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleUniversityChange = (selectedUni: string) => {
    setUniversity(selectedUni);
    // استنتاج المدينة المناسبة تلقائياً بناءً على الجامعة المختارة
    const inferredCity = selectedUni.replace("جامعة ", "").trim();
    if (inferredCity && inferredCity !== "أخرى") {
      setCity(inferredCity);
    }
  };

  const handleAddSamplePhotos = () => {
    setPhotos(PRESET_SAMPLE_PHOTOS);
    openToast("تم إضافة ٤ صور نموذجية للعقار بنجاح");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const fileArray = Array.from(files);
      const uploadedUrls = await uploadImageFiles(fileArray);
      if (uploadedUrls && uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls]);
        openToast(`تم رفع وتخزين ${uploadedUrls.length} صور في خادم التخزين بنجاح`);
      }
    } catch (err) {
      console.warn("Server upload failed, falling back to local data URLs:", err);
      // Fallback to data URL if network issue
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setPhotos((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
      openToast(`تم إرفاق ${files.length} صور`);
    } finally {
      setIsUploading(false);
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
      setError("يرجى إدخال عنوان العقار بالتفصيل.");
      return;
    }

    if (!ownerPhone.trim()) {
      setError("يرجى إدخال رقم هاتف التواصل مع المالك.");
      return;
    }

    if (photos.length === 0) {
      setError("يرجى رفع أو إرفاق صورة واحدة على الأقل للعقار ليتمكن فريق المعاينة من مراجعتها.");
      return;
    }

    try {
      setIsSubmitting(true);
      const newInspection = await createInspectionRequestAsync({
        ownerId: user?.id || "usr_owner_01",
        ownerName: user?.fullName || "المهندس محمود عبد العزيز",
        ownerPhone: ownerPhone.trim(),
        ownerEmail: user?.email || "owner.mahmoud@mkany.eg",
        title: title.trim(),
        address: address.trim(),
        city: city.trim() || "كفر الشيخ",
        university: university.trim() || "جامعة كفر الشيخ",
        roomType,
        pricePerMonth: Number(pricePerMonth) || 800,
        areaSqm: Number(areaSqm) || 100,
        bedrooms: Number(bedrooms) || 2,
        bathrooms: Number(bathrooms) || 1,
        floor,
        furnishing,
        initialPhotos: photos,
        notes: notes.trim(),
        preferredInspectionDate: preferredDate.trim(),
        lat: coords?.lat,
        lng: coords?.lng,
      });

      setSubmitted(true);
      openToast("تم تسجيل طلب المعاينة وحفظه في قاعدة البيانات بنجاح!");
      onSuccess(newInspection.id);
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء حفظ طلب المعاينة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen={true}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      hideHeader={true}
      testId="modal-inspection-request"
      closeButtonAriaLabel="إغلاق نافذة طلب المعاينة"
    >
      <div>
        {submitted ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 animate-bounce">
              <Check size={42} />
            </div>
            <h3 className="text-2xl font-extrabold text-foreground">تم استلام طلب المعاينة بنجاح!</h3>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground leading-7">
              تم تخزين بيانات العقار في قاعدة البيانات. سيقوم فريق مشرفي مكاني بمراجعة التفاصيل والصور والتواصل معك هاتفياً على الرقم ({ownerPhone}) لتأكيد موعد نزول المهندس وتصوير الـ 360° وتفعيل الوحدة للطلاب.
            </p>

            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-background p-4 text-xs text-muted-foreground text-right space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Clock size={16} className="text-primary" />
                <span>الخطوة القادمة: المعاينة الميدانية</span>
              </div>
              <p>سيصلك إشعار ومكالمة لتأكيد الزيارة، ويمكنك تتبع حالة طلبك في أي وقت من لوحة تحكمك.</p>
            </div>

            <button
              onClick={onClose}
              className="mt-8 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
              data-testid="button-inspection-success-close"
            >
              الانتقال لسجل المعاينات
            </button>
          </div>
        ) : (
          <div>
            {/* الترويسة */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
                <ShieldCheck size={14} />
                دورة توثيق ومعاينة السكن الطلابي
              </div>
              <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">إضافة وحدة جديدة وطلب معاينة</h2>
              <p className="mt-1 text-xs text-muted-foreground leading-6">
                أدخل البيانات الأولية للعقار وارفع صوره. سينزل مهندس مكاني للمعاينة الفعلية وتصوير 360° قبل تفعيل العقار رسمياً للطلاب.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs font-bold text-destructive">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* البيانات الأساسية */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    اسم الوحدة / العنوان المختصر *
                  </label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: شقة طلابية فاخرة أمام بوابة الزراعة"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    data-testid="input-inspection-title"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    الجامعة الأقرب *
                  </label>
                  <select
                    value={university}
                    onChange={(e) => handleUniversityChange(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    data-testid="select-inspection-university"
                  >
                    {UNIVERSITIES_LIST.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    عنوان العقار التفصيلي *
                  </label>
                  <input
                    required
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: شارع معهد الكبد، أمام كلية الزراعة، كفر الشيخ"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    data-testid="input-inspection-address"
                  />
                </div>

                <div className="sm:col-span-2">
                  <PropertyLocationPicker
                    city={city}
                    university={university}
                    initialLat={coords?.lat}
                    initialLng={coords?.lng}
                    onLocationChange={(newCoords) => setCoords(newCoords)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    نوع السكن *
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    data-testid="select-inspection-type"
                  >
                    <option value="شقة مشتركة">شقة كاملة مشتركة للطلاب</option>
                    <option value="غرفة فردية">غرفة فردية خاصة</option>
                    <option value="غرفة مزدوجة">غرفة مزدوجة (سريران)</option>
                    <option value="استوديو">استوديو مستقل</option>
                    <option value="سكن طالبات">سكن مخصص للطالبات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    القيمة الإيجارية الشهرية المتوقعة (جنيه) *
                  </label>
                  <input
                    required
                    type="number"
                    min={200}
                    step={50}
                    value={pricePerMonth}
                    onChange={(e) => setPricePerMonth(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    data-testid="input-inspection-price"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    المساحة التقريبية (م²)
                  </label>
                  <input
                    type="number"
                    value={areaSqm}
                    onChange={(e) => setAreaSqm(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    عدد الغرف والحمامات
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="غرف"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-center"
                    />
                    <input
                      type="number"
                      placeholder="حمامات"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(Number(e.target.value))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    الدور
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="مثال: الثاني (يوجد أسانسير)"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    نوع الفرش
                  </label>
                  <select
                    value={furnishing}
                    onChange={(e) => setFurnishing(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm"
                  >
                    <option value="مفروشة بالكامل">مفروشة بالكامل (أسرة، مكاتب، أجهزة)</option>
                    <option value="مفروشة جزئياً">مفروشة جزئياً</option>
                    <option value="غير مفروشة">غير مفروشة</option>
                  </select>
                </div>
              </div>

              {/* قسم رفع الصور الأولية */}
              <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Camera size={16} className="text-primary" />
                      صور العقار الأولية ({photos.length} صور مرفوعة) *
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      ارفع صور الغرف، الصالة، الحمام، والمطبخ ليطلع عليها مهندس المعاينة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSamplePhotos}
                    className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  >
                    + إرفاق صور جاهزة للتجربة
                  </button>
                </div>

                {/* معرض الصور المصغر */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                  {photos.map((url, idx) => (
                    <div key={idx} className="group relative aspect-video rounded-xl overflow-hidden border border-border bg-background">
                      <img src={url} alt={`صورة ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 left-1.5 rounded-full bg-slate-950/80 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="حذف الصورة"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {/* منطقة السحب والإفلات أو رفع صورة */}
                  <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background/50 hover:bg-background transition-colors text-center p-2">
                    <Upload size={18} className="text-muted-foreground mb-1" />
                    <span className="text-[11px] font-bold text-primary">رفع صورة</span>
                    <span className="text-[9px] text-muted-foreground">PNG, JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* إضافة صورة عبر رابط URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customPhotoUrl}
                    onChange={(e) => setCustomPhotoUrl(e.target.value)}
                    placeholder="أو ألصق رابط صورة مباشرة..."
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted"
                  >
                    إضافة الرابط
                  </button>
                </div>
              </div>

              {/* بيانات التواصل والمعاينة */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    رقم تليفون المالك للتواصل والتنسيق *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="01012345678"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm pl-10 outline-none focus:border-primary"
                      data-testid="input-inspection-phone"
                    />
                    <Phone size={16} className="absolute left-3.5 top-3 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    الموعد المفضل لنزول فريق المعاينة
                  </label>
                  <input
                    type="text"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    placeholder="مثال: الأحد القادم، بعد الظهر"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    ملاحظات إضافية لمهندس المعاينة
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: يوجد عداد كهرباء كارت، متوفر نت فايبر، المفاتيح مع حارس العقار..."
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* تنبيه نظام المعاينة */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground leading-6">
                <span className="font-bold text-foreground">🛡️ معلومة مهمة:</span> بعد إرسال الطلب، ينزل فريق مكاني لمعاينة العقار وتصوير الجولة الافتراضية 360° مجاناً. فور إتمام المعاينة، سيتم تفعيل العقار وظهوره لآلاف الطلاب بالجامعات.
              </div>

              {/* زر الإرسال */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  data-testid="button-submit-inspection"
                >
                  {isSubmitting ? (
                    <span>جاري الحفظ في قاعدة البيانات...</span>
                  ) : (
                    <>
                      <Plus size={18} />
                      إرسال طلب المعاينة الآن
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </StandardModal>
  );
}

