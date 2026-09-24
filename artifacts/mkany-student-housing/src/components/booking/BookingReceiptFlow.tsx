import React, { useState } from "react";
import { 
  Building2, 
  Check, 
  Upload, 
  Phone, 
  MessageCircle, 
  CreditCard, 
  Copy, 
  ShieldCheck, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  FileText,
  User,
  ExternalLink,
  ChevronRight,
  Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/components/auth/clerk-auth";
import { createBookingApi, buildWhatsAppBookingUrl } from "@/lib/bookings-store";
import { StandardModal } from "@/components/ui/StandardModal";
import { uploadPrivateReceiptApi } from "@/lib/api-client";

interface BookingReceiptFlowProps {
  property: {
    id: number;
    title: string;
    address: string;
    pricePerMonth: number;
    university: string;
    images: string[];
    availableFrom: string;
  };
  initialAppointmentDate?: string;
  onClose: () => void;
  openToast: (msg: string) => void;
  onGoToStudentDashboard: () => void;
  onSuccess?: () => void;
}

const SAMPLE_RECEIPT_PRESETS = [
  {
    name: "إيصال فودافون كاش معتمد",
    url: "https://images.pexels.com/photos/4386370/pexels-photo-4386370.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  {
    name: "إيصال إنستاباي InstaPay",
    url: "https://images.pexels.com/photos/6694543/pexels-photo-6694543.jpeg?auto=compress&cs=tinysrgb&w=800",
  }
];

export function BookingReceiptFlow({
  property,
  initialAppointmentDate,
  onClose,
  openToast,
  onGoToStudentDashboard,
  onSuccess,
}: BookingReceiptFlowProps) {
  const { user, openSignIn } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<"vodafone_cash" | "instapay" | "bank_transfer">("vodafone_cash");
  
  // بيانات الطالب المؤكدة
  const [studentName, setStudentName] = useState(user?.fullName || "طالب مكاني");
  const [studentPhone, setStudentPhone] = useState(user?.phoneNumber || "01098765432");
  const [studentNationalId, setStudentNationalId] = useState(user?.nationalId || "30208151234567");
  const [studentUniversity, setStudentUniversity] = useState(user?.university || property.university || "جامعة كفر الشيخ");

  // بيانات إيصال التحويل
  const [senderPhone, setSenderPhone] = useState(user?.phoneNumber || "01098765432");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(
    initialAppointmentDate || property.availableFrom || "الإثنين، ١٥ سبتمبر ٢٠٢٤"
  );
  const [appointmentTime, setAppointmentTime] = useState("الساعة ٢:٠٠ ظهراً");
  const [receiptPath, setReceiptPath] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // نتيجة الحجز بعد الرفع
  const [completedBooking, setCompletedBooking] = useState<any>(null);

  const adminWhatsAppNumber = "01055332242";

  const handleCopyNumber = (num: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
      openToast(`تم نسخ رقم الإدارة (${num})`);
    }
  };

  // رفع ملف سكرين شات من الجهاز
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadPrivateReceiptApi(file);
      if (res && res.path) {
        setReceiptPath(res.path);
        setPreviewUrl(res.url || `/api/upload/private/view?path=${encodeURIComponent(res.path)}`);
        openToast("تم رفع سكرين شات الإيصال بأمان إلى التخزين الخاص!");
      } else {
        throw new Error("لم يتم إرجاع مسار الملف من خادم التخزين المشفر");
      }
    } catch (err: any) {
      console.error("Upload receipt failed:", err);
      openToast(err?.message || "فشل رفع سكرين شات الإيصال، يرجى المحاولة ثانية");
    } finally {
      setIsUploading(false);
    }
  };

  // معالجة اختيار عينة تجريبية ونقلها للتخزين الخاص المشفر
  const handleSelectPreset = async (preset: { name: string; url: string }) => {
    setIsUploading(true);
    try {
      const fetchRes = await fetch(preset.url);
      const blob = await fetchRes.blob();
      const sampleFile = new File([blob], `sample_${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      const res = await uploadPrivateReceiptApi(sampleFile);
      if (res && res.path) {
        setReceiptPath(res.path);
        setPreviewUrl(res.url || `/api/upload/private/view?path=${encodeURIComponent(res.path)}`);
        openToast(`تم اختيار ونقل: ${preset.name} للتخزين الخاص المشفر!`);
      } else {
        throw new Error("فشل تحويل العينة للتخزين الخاص");
      }
    } catch (err: any) {
      console.error("Failed to select preset:", err);
      openToast("تعذر تحميل نموذج الإيصال، يرجى اختيار ملف من جهازك");
    } finally {
      setIsUploading(false);
    }
  };

  // تأكيد رفع الإيصال والتوجيه التلقائي إلى واتساب
  const handleSubmitBookingAndReceipt = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiptPath) {
      openToast("يرجى إرفاق أو رفع سكرين شات إيصال الدفع أولاً");
      return;
    }

    setIsSubmitting(true);

    try {
      const savedBooking = await createBookingApi({
        propertyId: property.id,
        paymentMethod,
        paymentAmount: 1200,
        receiptImageUrl: receiptPath,
        senderPhone,
        referenceNumber: referenceNumber || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        appointmentDate,
        appointmentTime,
      });

      const fullBooking = {
        ...savedBooking,
        propertyTitle: property.title,
        propertyAddress: property.address,
        propertyImage: property.images[0] || "",
        propertyPrice: property.pricePerMonth,
        propertyUniversity: property.university,
        studentName,
        studentPhone,
        studentNationalId,
        studentUniversity,
        studentEmail: user?.email || "student@mkany.eg",
      };

      setCompletedBooking(fullBooking);
      setStep(3);
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess();
      }

      // تجهيز رابط الواتساب والتوجيه التلقائي الفوري
      const waUrl = buildWhatsAppBookingUrl(fullBooking);
      
      // فتح الواتساب تلقائياً في نافذة جديدة
      setTimeout(() => {
        try {
          window.open(waUrl, "_blank");
          openToast("جاري توجيهك إلى واتساب الإدارة (01055332242) لإرسال الإيصال...");
        } catch (err) {
          console.log("Auto-open blocked, user can click button", err);
        }
      }, 700);

    } catch (err: any) {
      console.error(err);
      setIsSubmitting(false);
      openToast(err?.message || "حدث خطأ أثناء حفظ الحجز، يرجى المحاولة ثانية");
    }
  };

  return (
    <StandardModal
      isOpen={true}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      hideHeader={true}
      testId="modal-booking-receipt-flow"
      closeButtonAriaLabel="إغلاق نافذة إتمام الحجز"
    >
      <div>
        
        {/* شريط الخطوات */}
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4 text-xs font-bold text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              ١
            </span>
            <span className={step >= 1 ? "text-primary font-extrabold" : ""}>بيانات الطالب والوحدة</span>
          </div>

          <div className="h-px w-8 bg-border hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              ٢
            </span>
            <span className={step >= 2 ? "text-primary font-extrabold" : ""}>رفع الإيصال والدفع اليدوي</span>
          </div>

          <div className="h-px w-8 bg-border hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${step === 3 ? "bg-emerald-600 text-white" : "bg-muted"}`}>
              ٣
            </span>
            <span className={step === 3 ? "text-emerald-600 font-extrabold" : ""}>الربط بواتساب الإدارة</span>
          </div>
        </div>

        {/* الخطوة 1: مراجعة تفاصيل الحجز وهوية الطالب */}
        {step === 1 && (
          <div>
            {/* REQUIRED PRIMARY DISPLAY */}
            <div className="mb-6 rounded-2xl border-2 border-primary bg-primary/5 p-5 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-primary via-primary-hover to-primary" />
              <span className="text-[10px] bg-primary text-primary-foreground font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                المطلوب للدفع الآن
              </span>
              <div className="text-3xl font-black text-foreground tracking-tight mb-1">
                1,200 جنيه فقط
              </div>
              <p className="text-xs font-bold text-primary">
                اشتراك مكاني — يُدفع مرة واحدة
              </p>
            </div>

            {/* IMPORTANT EXPLANATION */}
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl text-xs space-y-1.5 text-right font-medium leading-relaxed">
              <p className="font-bold text-foreground">⚠️ توضيح هام ومؤكد:</p>
              <p>"1200 جنيه هي رسوم اشتراك مكاني فقط، وليست إيجارًا شهريًا أو تأمينًا."</p>
              <p>"لن تدفع الإيجار أو التأمين الآن. يتم تحديد واستحقاق هذه المبالغ بعد اعتماد السكن واستلام الوحدة وفقًا للعقد."</p>
            </div>

            {/* SEPARATE DETAILS */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-right">
                <span className="text-[10px] text-muted-foreground block font-bold">الإيجار الشهري للوحدة (للمالك):</span>
                <strong className="text-sm font-extrabold text-foreground">{property.pricePerMonth} جنيه / شهر</strong>
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold block w-fit mt-1">
                  يُدفع لاحقًا بعد استلام الوحدة
                </span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-right">
                <span className="text-[10px] text-muted-foreground block font-bold">التأمين (الوديعة):</span>
                <strong className="text-xs font-bold text-foreground">مسترد بالكامل عند الإخلاء</strong>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                  يتم تحديد قيمة التأمين وتسجيلها من الإدارة بعد المعاينة واعتماد السكن، وتصبح مستحقة وفق مرحلة الاستلام.
                </p>
              </div>
            </div>

            {/* FINANCIAL SUMMARY TABLE */}
            <div className="mb-6 rounded-2xl border border-border bg-muted/20 p-4 space-y-2 text-xs text-right">
              <h4 className="font-black text-foreground border-b border-border pb-1.5 mb-2">📊 الملخص المالي والالتزامات:</h4>
              <div className="flex items-center justify-between font-bold text-primary">
                <span>المطلوب الآن:</span>
                <span>1,200 جنيه (اشتراك مكاني فقط)</span>
              </div>
              <div className="h-px bg-border/60 my-1" />
              <div className="flex items-center justify-between text-muted-foreground">
                <span>لاحقًا بعد استلام الوحدة:</span>
                <div className="space-y-0.5 text-left">
                  <div className="font-bold text-foreground">الإيجار الشهري: {property.pricePerMonth} جنيه / شهر</div>
                  <div>التأمين: يحدده فريق مكاني بعد المعاينة</div>
                </div>
              </div>
            </div>

            <h4 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-1.5">
              <User size={16} className="text-primary" />
              تأكيد بيانات الطالب للتوثيق والعقد
            </h4>

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block font-bold text-foreground mb-1">اسم الطالب الرباعي:</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">الرقم القومي (14 رقم):</label>
                  <input
                    type="text"
                    maxLength={14}
                    required
                    value={studentNationalId}
                    onChange={(e) => setStudentNationalId(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">رقم هاتف الطالب / واتساب:</label>
                  <input
                    type="tel"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-xs text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">الجامعة المقيد بها:</label>
                <input
                  type="text"
                  required
                  value={studentUniversity}
                  onChange={(e) => setStudentUniversity(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* ماذا يشمل اشتراك مكاني؟ */}
            <div className="mb-6 rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="text-sm font-extrabold text-foreground">
                  ⭐ ماذا يشمل اشتراك مكاني؟
                </h4>
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-black">
                  مزايا المشتركين
                </span>
              </div>

              <p className="text-xs text-foreground font-medium leading-relaxed">
                "اشتراكك في مكاني مش مجرد حجز سكن، لكنه بوابتك لخدمات ومزايا مكاني."
              </p>

              {/* المزايا المشمولة */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>معاينة واختيار السكن عبر مكاني</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>مراجعة واعتماد بيانات السكن</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>متابعة إجراءات الحجز</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>تنظيم ومتابعة مواعيد المعاينة والاستلام</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>دعم ومتابعة من مكاني</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>عضوية Pro بعد اعتماد الاشتراك</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>خصومات وعروض خاصة للمشتركين</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>الوصول إلى مساحات العمل (Workspace/Coworking) والمزايا المتاحة للمشتركين</span>
                  </div>
                </div>

                <div className="mt-3 bg-muted/40 p-2.5 rounded-xl text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground block mb-0.5">من مزايا الاشتراك والخدمات المتاحة عبر مكاني:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>طلب خدمات النظافة المتاحة</li>
                    <li>طلب خدمات الصيانة المتاحة</li>
                    <li>طلب خدمات الطعام المتاحة</li>
                  </ul>
                </div>
              </div>

              {/* ما لا يشمله الاشتراك */}
              <div className="pt-3 border-t border-border/60">
                <span className="text-[10px] font-bold text-rose-600 block mb-1.5">الاشتراك لا يشمل:</span>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="bg-muted/30 p-2 rounded-lg text-center font-bold">الإيجار الشهري</div>
                  <div className="bg-muted/30 p-2 rounded-lg text-center font-bold">التأمين</div>
                  <div className="bg-muted/30 p-2 rounded-lg text-center font-bold">أي رسوم أو خدمات إضافية غير مشمولة</div>
                </div>
                <p className="mt-2 text-[10px] text-rose-600 leading-relaxed font-bold">
                  ⚠️ 1200 جنيه هي رسوم اشتراك مكاني فقط، وليست إيجارًا شهريًا أو تأمينًا.
                </p>
              </div>

              {/* سياسة الاسترداد */}
              <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground block mb-0.5">🔄 سياسة الاسترداد:</span>
                "في حال عدم مناسبة الوحدة بعد المعاينة، يتم التعامل مع طلب الاسترداد وفق سياسة الاسترداد المعتمدة من مكاني."
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-[11px] leading-5 text-muted-foreground mb-6">
              <strong className="text-primary font-bold block mb-0.5">ضمان مكاني لحماية السكن:</strong>
              يتم سداد اشتراك مكاني للخدمات وتوثيق العقد عبر التحويل اليدوي ورفع الإيصال، ويتم تفعيل حسابك Pro فور اعتماد التحويل من الإدارة.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-5 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
                data-testid="btn-proceed-to-receipt"
              >
                دفع اشتراك مكاني — 1,200 جنيه
                <ArrowLeft size={15} />
              </button>
            </div>
          </div>
        )}

        {/* الخطوة 2: تعليمات التحويل ورفع سكرين شات الإيصال */}
        {step === 2 && (
          <form onSubmit={handleSubmitBookingAndReceipt}>
            {/* صندوق معلومات التحويل المالي */}
            <div className="mb-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck size={16} />
                  رقم الحساب والتحويل الرسمي لإدارة مكاني:
                </span>
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  معتمد 100%
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-background/90 p-3 border border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground block">
                    فودافون كاش / محافظ إلكترونية / إنستاباي
                  </span>
                  <strong className="font-mono text-lg font-black text-foreground tracking-wider">
                    {adminWhatsAppNumber}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyNumber(adminWhatsAppNumber)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700"
                  data-testid="btn-copy-admin-phone"
                >
                  <Copy size={13} />
                  نسخ الرقم
                </button>
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground leading-5">
                قم بالتحويل بقيمة اشتراك مكاني للتفعيل والتوثيق (<strong className="text-foreground">1200 ج.م</strong>) إلى الرقم أعلاه، ثم التقط سكرين شات لإيصال التحويل وارفعه في الأسفل.
              </p>
            </div>

            {/* طريقة التحويل */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-foreground mb-1.5">طريقة التحويل التي استخدمتها:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "vodafone_cash", label: "فودافون كاش" },
                  { id: "instapay", label: "إنستاباي InstaPay" },
                  { id: "bank_transfer", label: "محفظة ذكية / بنك" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
                      paymentMethod === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">رقم الهاتف المُحول منه:</label>
                <input
                  type="tel"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-primary text-right"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">الرقم المرجعي / كود التحويل (اختياري):</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="مثال: VF-98234"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-primary text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">تاريخ المعاينة المطلوب:</label>
                <input
                  type="text"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  placeholder="مثال: الإثنين، ١٥ سبتمبر ٢٠٢٤"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary text-right"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">وقت المعاينة المطلوب:</label>
                <input
                  type="text"
                  required
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  placeholder="مثال: الساعة ٢:٠٠ ظهراً"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary text-right"
                />
              </div>
            </div>

            {/* منطقة رفع الإيصال */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-foreground mb-1.5">
                رفع سكرين شات / صورة إيصال الدفع <span className="text-rose-500">*</span>
              </label>

              <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-4 text-center">
                {previewUrl ? (
                  <div className="relative mx-auto max-w-xs">
                    <img
                      src={previewUrl}
                      alt="إيصال الدفع"
                      className="max-h-48 w-full rounded-xl object-contain border border-border bg-background"
                    />
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <label className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow">
                        تغيير الصورة
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    <Upload size={32} className="mx-auto mb-2 text-muted-foreground/60" />
                    <p className="text-xs font-bold text-foreground">اضغط لاختيار صورة الإيصال من جهازك</p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, JPEG أو سكرين شات المحفظة</p>
                    <label className="mt-3 inline-block cursor-pointer rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow">
                      تحديد الملف
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* عينات سريعة للتجربة الفورية */}
              <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>أو اختر نموذج إيصال جاهز للتجربة:</span>
                {SAMPLE_RECEIPT_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    disabled={isUploading}
                    onClick={() => handleSelectPreset(preset)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-primary hover:border-primary disabled:opacity-50"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
              >
                رجوع
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-60 transition-all"
                data-testid="btn-submit-receipt-and-wa"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    جاري رفع الإيصال والربط بواتساب...
                  </>
                ) : (
                  <>
                    <MessageCircle size={16} />
                    رفع الإيصال والتوجيه للواتساب فوراً 📲
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* الخطوة 3: شاشة النجاح والربط بالواتساب المخصص (01055332242) */}
        {step === 3 && completedBooking && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-600 animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              تم تسجيل الحجز ورفع الإيصال بنجاح
            </span>

            <h3 className="text-2xl font-extrabold text-foreground">
              كود الحجز: <span className="font-mono text-primary">{completedBooking.bookingCode}</span>
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
              تم حفظ حجزك في المنصة. تم توجيهك الآن لإرسال تفاصيل الإيصال على رقم واتساب الإدارة المخصص:{" "}
              <strong className="text-foreground font-mono font-bold">01055332242</strong> لمراجعته وتأكيده من قبل إدارة منصة مكاني فوراً.
            </p>

            {/* بطاقة ملخص الحجز */}
            <div className="mx-auto mt-5 max-w-md rounded-2xl border border-border bg-card p-4 text-right text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                <span className="text-muted-foreground">الوحدة المحجوزة:</span>
                <strong className="text-foreground">{completedBooking.propertyTitle}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                <span className="text-muted-foreground">اسم الطالب:</span>
                <strong className="text-foreground">{completedBooking.studentName}</strong>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                <span className="text-muted-foreground">الرقم القومي:</span>
                <strong className="font-mono text-foreground">{completedBooking.studentNationalId}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">المبلغ المحول:</span>
                <strong className="text-primary font-bold">{completedBooking.paymentAmount} جنيه</strong>
              </div>
            </div>

            {/* أزرار الإجراءات الفورية */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row justify-center">
              <a
                href={buildWhatsAppBookingUrl(completedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition-transform hover:-translate-y-0.5"
                data-testid="btn-open-whatsapp-now"
              >
                <MessageCircle size={16} />
                فتح محادثة واتساب الإدارة الآن (01055332242)
              </a>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToStudentDashboard();
                }}
                className="flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary/10 px-5 py-3.5 text-xs font-bold text-primary hover:bg-primary/20"
                data-testid="btn-go-to-student-dashboard"
              >
                الانتقال لداشبورد حجوزاتي
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </StandardModal>
  );
}
