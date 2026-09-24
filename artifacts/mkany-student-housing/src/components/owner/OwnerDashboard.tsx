import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  ShieldCheck, 
  Eye, 
  Clock3, 
  CircleDollarSign, 
  Sparkle, 
  Wifi, 
  BarChart3, 
  MessageCircle, 
  Camera, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Clock, 
  ArrowLeft, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Lock,
  LogIn,
  UserCheck,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  RefreshCw,
  MapPin,
  Home,
  LifeBuoy
} from "lucide-react";
import { useAuth, SignInButton, SignUpButton } from "@/components/auth/clerk-auth";
import { 
  getAllInspections, 
  getAllPlatformProperties, 
  syncInspectionsFromApi,
  syncPlatformPropertiesFromApi,
  PropertyInspection, 
  PlatformProperty,
  INSPECTIONS_CHANGE_EVENT,
  PROPERTIES_CHANGE_EVENT
} from "@/lib/inspections-store";
import { 
  getMyApartmentsApi, 
  deleteApartmentApi, 
  updateApartmentApi 
} from "@/lib/api-client";
import { getOwnerBookingsApi, StudentBooking } from "@/lib/bookings-store";
import { InspectionRequestModal } from "./InspectionRequestModal";
import { OwnerApartmentModal } from "./OwnerApartmentModal";
import { SupportCenter } from "@/components/support/SupportCenter";

interface OwnerDashboardProps {
  openToast: (msg: string) => void;
  onViewPublicServices: () => void;
  onViewPropertyModal?: (p: PlatformProperty) => void;
  initialTab?: "units" | "inspections" | "bookings" | "support";
}

export function OwnerDashboard({
  openToast,
  onViewPublicServices,
  onViewPropertyModal,
  initialTab = "units",
}: OwnerDashboardProps) {
  const { isSignedIn, user, openSignIn } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"units" | "inspections" | "bookings" | "support">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [isAddApartmentModalOpen, setIsAddApartmentModalOpen] = useState(false);
  const [isAddInspectionModalOpen, setIsAddInspectionModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<PlatformProperty | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // جلب طلبات المعاينة والعقارات المنشورة والحجوزات
  const [allInspections, setAllInspections] = useState<PropertyInspection[]>(() => getAllInspections());
  const [allProperties, setAllProperties] = useState<PlatformProperty[]>(() => getAllPlatformProperties());
  const [dbOwnerApartments, setDbOwnerApartments] = useState<PlatformProperty[]>([]);
  const [ownerBookings, setOwnerBookings] = useState<StudentBooking[]>([]);

  const fetchOwnerBookings = async () => {
    if (!isSignedIn) return;
    try {
      const bookings = await getOwnerBookingsApi();
      setOwnerBookings(bookings);
    } catch (e) {
      console.error("Failed to fetch owner bookings:", e);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchOwnerBookings();
    }
  }, [isSignedIn]);

  // تحميل الوحدات المسجلة لهذا المالك من قاعدة البيانات
  const fetchOwnerApartments = async () => {
    if (!isSignedIn) return;
    try {
      setIsLoading(true);
      const res = await getMyApartmentsApi();
      if (Array.isArray(res)) {
        const mapped: PlatformProperty[] = res.map((a: any) => ({
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
        setDbOwnerApartments(mapped);
      }
    } catch (err) {
      console.warn("Could not fetch my apartments from DB:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // الاستماع الفوري لأحداث التحديث في المخزن
  useEffect(() => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
    fetchOwnerApartments();

    const handleSync = () => {
      setAllInspections(getAllInspections());
      setAllProperties(getAllPlatformProperties());
      fetchOwnerApartments();
    };

    window.addEventListener(INSPECTIONS_CHANGE_EVENT, handleSync);
    window.addEventListener(PROPERTIES_CHANGE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("mkany_properties_updated", handleSync);

    return () => {
      window.removeEventListener(INSPECTIONS_CHANGE_EVENT, handleSync);
      window.removeEventListener(PROPERTIES_CHANGE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("mkany_properties_updated", handleSync);
    };
  }, [isSignedIn, user?.id]);

  // فلترة الوحدات الخاصة بهذا المالك حصرياً (Strict Owner Isolation)
  const currentOwnerId = user?.id;
  const currentOwnerEmail = user?.email?.toLowerCase();

  // الدمج الذكي بين وحدات قاعدة البيانات ووحدات الذاكرة
  const combinedOwnerUnits = React.useMemo(() => {
    const list = [...dbOwnerApartments];
    allProperties.forEach((p) => {
      if (currentOwnerId && p.ownerId === currentOwnerId) {
        if (!list.some((item) => item.id === p.id)) {
          list.push(p);
        }
      }
    });
    return list;
  }, [dbOwnerApartments, allProperties, currentOwnerId]);

  const ownerInspections = allInspections.filter((i) => {
    if (!currentOwnerId) return false;
    if (i.ownerId && i.ownerId === currentOwnerId) return true;
    if (i.ownerEmail && currentOwnerEmail && i.ownerEmail.toLowerCase() === currentOwnerEmail) return true;
    return false;
  });

  // حذف وحدة سكنية
  const handleDeleteUnit = async (id: number, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الوحدة "${title}" نهائياً من قاعدة البيانات؟`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteApartmentApi(id);
      openToast(`تم حذف الوحدة "${title}" بنجاح 🗑️`);
      window.dispatchEvent(new CustomEvent("mkany_properties_updated"));
      fetchOwnerApartments();
    } catch (err: any) {
      console.error("Error deleting apartment:", err);
      openToast(err?.message || "تعذر حذف الوحدة");
    } finally {
      setDeletingId(null);
    }
  };

  // تبديل حالة التوفر (متاح / مشغول)
  const handleToggleStatus = async (unit: PlatformProperty) => {
    // Strict separation: Owner cannot self-approve a pending or rejected unit
    if (unit.status === "قيد المراجعة" || unit.status === "مرفوض") {
      openToast("الوحدة قيد مراجعة ومعاينة الإدارة - اعتماد ونشر العقار يتم حصراً بواسطة الإدارة");
      return;
    }

    const newStatus = unit.status === "متاح" ? "مشغول" : "متاح";
    try {
      setTogglingId(unit.id);
      await updateApartmentApi(unit.id, { status: newStatus });
      openToast(`تم تغيير حالة الوحدة إلى "${newStatus}" بنجاح ✨`);
      window.dispatchEvent(new CustomEvent("mkany_properties_updated"));
      fetchOwnerApartments();
    } catch (err: any) {
      console.error("Error updating status:", err);
      openToast(err?.message || "تعذر تحديث حالة الوحدة");
    } finally {
      setTogglingId(null);
    }
  };

  // 1. حماية لوحة التحكم: التحقق من تسجيل الدخول
  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center" data-testid="owner-protected-gate">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-14 shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500">
            <Lock size={40} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            منطقة محمية ومخصصة لأصحاب العقارات
          </span>

          <h1 className="text-3xl font-extrabold sm:text-4xl">لوحة تحكم المالك</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            تتطلب لوحة التحكم الخاصة بإدارة الوحدات، وإرسال طلبات المعاينة، ومتابعة إيرادات السكن الطلابي تسجيل الدخول بحساب مالك عقار معتمد.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <SignInButton mode="modal">
              <button 
                className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
                data-testid="button-gate-signin"
              >
                <LogIn size={18} />
                تسجيل الدخول كمالك
              </button>
            </SignInButton>

            <button 
              onClick={onViewPublicServices}
              className="rounded-xl border border-border bg-background px-5 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              عرض صفحة خدمات الملاك للزوار
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. التحقق من تصنيف الحساب كـ "مالك" (Owner Role Protection & Isolation)
  const isOwner = user?.role === "owner" || user?.role === "admin";
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center" data-testid="student-role-barrier">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <UserCheck size={32} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground mb-3">
            حساب طالب جامعي نشط 🎓
          </span>

          <h2 className="text-2xl font-extrabold">أنت مسجل حالياً بحساب "طالب" ({user?.fullName})</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            لوحة تحكم الملاك مخصصة لأصحاب السكن والوحدات العقارية المسجلين كـ "مالك" في قاعدة البيانات.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={onViewPublicServices}
              className="rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
            >
              الرجوع لصفحة تفاصيل خدمات الملاك
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. عرض لوحة تحكم المالك الكاملة بعد المصادقة والتأكد من دور المالك
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" data-testid="owner-dashboard-active">
      {/* الترويسة الرئيسية */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              لوحة إدارة وتأجير العقارات
            </span>
            <button 
              onClick={onViewPublicServices}
              className="text-xs font-semibold text-muted-foreground hover:text-primary hover:underline"
            >
              ← عرض صفحة الملاك العامة للزوار
            </button>
          </div>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-foreground">
            مرحباً، {user?.fullName || "مالك العقار"}
          </h1>
          {(() => {
            const isVerified = Boolean(user?.isVerified);
            const hasNationalId = Boolean(user?.nationalId && user.nationalId.length === 14 && user.nationalId !== "00000000000000");
            const verificationLabel = isVerified ? "حساب موثق ✓" : hasNationalId ? "حساب قيد التحقق" : "حساب غير موثق";
            const verificationBadgeClass = isVerified
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : hasNationalId
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : "bg-muted text-muted-foreground border-border";
            return (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${verificationBadgeClass}`} data-testid="owner-account-verification-status">
                  <ShieldCheck size={13} />
                  {verificationLabel}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{user?.university || "عقارات كفر الشيخ والمنصورة وطنطا"}</span>
              </div>
            );
          })()}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditingApartment(null);
              setIsAddApartmentModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
            data-testid="button-add-apartment"
          >
            <Plus size={18} />
            إضافة وحدة سكنية جديدة (CRUD)
          </button>

          <button
            onClick={() => setIsAddInspectionModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3.5 font-bold text-primary hover:bg-primary/20 transition-colors"
            data-testid="button-add-inspection"
          >
            <Camera size={18} />
            طلب معاينة 360°
          </button>
        </div>
      </div>

      {/* شريط الإحصائيات الرئيسي */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-primary/10 p-3 text-primary">
            <Building2 size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">{combinedOwnerUnits.length}</strong>
            <span className="text-xs font-semibold text-muted-foreground">إجمالي العقارات</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
            <Clock3 size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">
              {combinedOwnerUnits.filter((u) => u.status === "قيد المراجعة").length + ownerInspections.filter((i) => i.status === "pending").length}
            </strong>
            <span className="text-xs font-semibold text-muted-foreground">عقارات قيد مراجعة الإدارة</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-emerald-500/10 p-3 text-emerald-500">
            <CheckCircle2 size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">
              {combinedOwnerUnits.filter((u) => u.status === "متاح").length}
            </strong>
            <span className="text-xs font-semibold text-muted-foreground">عقارات معتمدة ومتاحة</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-sky-500/10 p-3 text-sky-500">
            <Home size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">
              {combinedOwnerUnits.filter((u) => u.status === "مشغول").length}
            </strong>
            <span className="text-xs font-semibold text-muted-foreground">عقارات مؤجرة (مشغولة)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-indigo-500/10 p-3 text-indigo-500">
            <FileText size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">{ownerBookings.length}</strong>
            <span className="text-xs font-semibold text-muted-foreground">طلبات حجز الوحدات</span>
          </div>
        </div>
      </div>

      {/* التبويبات الرئيسية: إدارة الوحدات السكنية / دورة وتتبع طلبات المعاينة */}
      <div className="mt-8 flex rounded-2xl border border-border bg-card p-1.5 text-sm font-bold">
        <button
          onClick={() => setActiveTab("units")}
          className={`flex-1 rounded-xl py-3 transition-all flex items-center justify-center gap-2 ${
            activeTab === "units"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-owner-units"
        >
          <Building2 size={18} />
          إدارة الوحدات السكنية ({combinedOwnerUnits.length})
        </button>

        <button
          onClick={() => setActiveTab("inspections")}
          className={`flex-1 rounded-xl py-3 transition-all flex items-center justify-center gap-2 ${
            activeTab === "inspections"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-owner-inspections"
        >
          <Camera size={18} />
          سجل ومتابعة المعاينات 360° ({ownerInspections.length})
        </button>

        <button
          onClick={() => setActiveTab("bookings")}
          className={`flex-1 rounded-xl py-3 transition-all flex items-center justify-center gap-2 ${
            activeTab === "bookings"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-owner-bookings"
        >
          <FileText size={18} />
          حجوزات وحداتك ({ownerBookings.length})
        </button>

        <button
          onClick={() => setActiveTab("support")}
          className={`flex-1 rounded-xl py-3 transition-all flex items-center justify-center gap-2 ${
            activeTab === "support"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-owner-support"
        >
          <LifeBuoy size={18} />
          الدعم والمساعدة
        </button>
      </div>

      {/* محتوى التبويب الأول: الوحدات المعتمدة والمنشورة */}
      {activeTab === "units" && (
        <div className="mt-6 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">قائمة الوحدات السكنية (PostgreSQL)</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تظهر هذه الوحدات مباشرة للطلاب ويمكنك تعديل الأسعار والمواصفات وحالة التوفر فورياً.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchOwnerApartments}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                  title="تحديث البيانات"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  تحديث
                </button>

                <button
                  onClick={() => {
                    setEditingApartment(null);
                    setIsAddApartmentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
                  data-testid="button-owner-create-unit"
                >
                  <Plus size={15} />
                  إضافة وحدة جديدة
                </button>
              </div>
            </div>

            {combinedOwnerUnits.length === 0 ? (
              <div className="py-16 text-center">
                <Home size={40} className="mx-auto text-muted-foreground mb-3" />
                <h3 className="font-bold text-foreground">لم تقم بإضافة وحدات سكنية بعد</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  ابدأ بإضافة أول شقة أو غرفة سكنية للطلاب مع رفع الصور وتحديد الموقع الدقيق.
                </p>
                <button
                  onClick={() => {
                    setEditingApartment(null);
                    setIsAddApartmentModalOpen(true);
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow"
                >
                  <Plus size={16} />
                  إضافة أول وحدة الآن
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground font-bold">
                    <tr>
                      <th className="px-5 py-3.5">الوحدة والصور</th>
                      <th className="px-5 py-3.5">نوع السكن</th>
                      <th className="px-5 py-3.5">الإيجار الشهري</th>
                      <th className="px-5 py-3.5">المساحة والغرف</th>
                      <th className="px-5 py-3.5">حالة التوفر</th>
                      <th className="px-5 py-3.5">الإجراءات والتحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {combinedOwnerUnits.map((u) => (
                      <tr className="hover:bg-muted/30 transition-colors" key={u.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                              {u.images && u.images.length > 0 ? (
                                <img
                                  src={u.images[0]}
                                  alt={u.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                  <Building2 size={20} />
                                </div>
                              )}
                              {u.images && u.images.length > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                                  +{u.images.length}
                                </span>
                              )}
                            </div>
                            <div>
                              <strong className="block font-bold text-foreground text-sm leading-tight">{u.title}</strong>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin size={12} />
                                {u.address} · {u.city}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">
                          {u.roomType}
                        </td>
                        <td className="px-5 py-4 font-bold text-primary">
                          {u.pricePerMonth} ج.م / شهر
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">
                          {u.areaSqm} م² · {u.bedrooms} غرف · {u.bathrooms} حمام
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={togglingId === u.id || u.status === "قيد المراجعة" || u.status === "مرفوض"}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                              u.status === "متاح"
                                ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                                : u.status === "مشغول"
                                ? "bg-amber-500/15 text-amber-600 hover:bg-amber-500/25"
                                : u.status === "قيد المراجعة"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 cursor-not-allowed"
                                : "bg-rose-500/10 text-rose-600 border border-rose-500/30 cursor-not-allowed"
                            }`}
                            title={
                              u.status === "قيد المراجعة"
                                ? "العقار قيد مراجعة الإدارة ولا يمكن نشره كـ متاح إلا بعد اعتماد المشرفين"
                                : u.status === "مرفوض"
                                ? "تم رفض العقار من الإدارة"
                                : "اضغط لتغيير حالة التوفر (متاح / مشغول)"
                            }
                          >
                            {togglingId === u.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : u.status === "متاح" ? (
                              <CheckCircle2 size={12} />
                            ) : u.status === "قيد المراجعة" ? (
                              <Clock size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            {u.status}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingApartment(u);
                                setIsAddApartmentModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                              data-testid={`button-edit-apartment-${u.id}`}
                              title="تعديل المواصفات والأسعار والصور"
                            >
                              <Edit size={13} className="text-primary" />
                              تعديل
                            </button>

                            <button
                              onClick={() => {
                                onViewPropertyModal?.(u);
                                openToast(`تم فتح تفاصيل ${u.title}`);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                              data-testid={`button-owner-view-${u.id}`}
                              title="معاينة كطالب"
                            >
                              <Eye size={13} />
                              معاينة
                            </button>

                            <button
                              onClick={() => handleDeleteUnit(u.id, u.title)}
                              disabled={deletingId === u.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                              data-testid={`button-delete-apartment-${u.id}`}
                              title="حذف نهائي"
                            >
                              {deletingId === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* الرسوم البيانية والأرباح */}
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-foreground">مخطط إيرادات السكن هذا العام</h2>
                  <strong className="mt-1 block text-3xl font-black text-primary">
                    {combinedOwnerUnits.reduce((acc, curr) => acc + (curr.pricePerMonth || 0), 0).toLocaleString()} <small className="text-sm font-semibold">جنيه / متوقع شهرياً</small>
                  </strong>
                </div>
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <CircleDollarSign size={24} />
                </div>
              </div>

              <div className="flex h-32 items-end gap-2 border-b border-border pb-1">
                {[35, 48, 42, 63, 55, 76, 68, 88, 73, 95, 81, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary/75 hover:bg-primary transition-colors cursor-pointer" style={{ height: `${h}%` }} title={`شهر ${i + 1}`} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-semibold">
                <span>يناير</span>
                <span>يونيو</span>
                <span>ديسمبر</span>
              </div>
            </div>

            <div className="rounded-2xl bg-primary p-6 text-primary-foreground flex flex-col justify-between">
              <div>
                <Sparkle size={24} />
                <h2 className="mt-4 text-xl font-black">ضاعف ظهور وحداتك للطلاب</h2>
                <p className="mt-2 text-xs leading-6 text-primary-foreground/80">
                  ارفع عقارك في صدارة نتائج البحث حول كليات الطب والهندسة واحصل على +300% طلبات حجز فورية.
                </p>
              </div>

              <button
                onClick={() => openToast("سيتم التواصل معك لترقية وحدتك لقائمة التمييز")}
                className="mt-6 rounded-xl bg-primary-foreground px-5 py-3 text-xs font-bold text-primary shadow transition-transform hover:-translate-y-0.5"
                data-testid="button-upgrade-listing"
              >
                ترقية الوحدات للأعلى ظهوراً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* محتوى التبويب الثاني: دورة طلبات المعاينة وتتبع الحالة */}
      {activeTab === "inspections" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-border pb-5 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">دورة طلبات المعاينة والتوثيق 360°</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تابع حالة كل عقار أرسلته من لحظة استلام الطلب وحتى نزول المعاينة الفعلية وتصوير الـ 360° ونشره للطلاب.
                </p>
              </div>

              <button
                onClick={() => setIsAddInspectionModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow"
              >
                <Plus size={16} />
                إرسال طلب معاينة جديد
              </button>
            </div>

            {ownerInspections.length === 0 ? (
              <div className="py-12 text-center">
                <Camera size={38} className="mx-auto text-muted-foreground mb-3" />
                <h3 className="font-bold text-foreground">لا توجد طلبات معاينة مسجلة حالياً</h3>
                <p className="text-xs text-muted-foreground mt-1">ابدأ بإرسال طلب معاينة لعقارك لنزول فريق مكاني وتصوير 360°.</p>
                <button
                  onClick={() => setIsAddInspectionModalOpen(true)}
                  className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  إرسال أول طلب معاينة
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {ownerInspections.map((insp) => (
                  <div 
                    key={insp.id}
                    className="rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-sm transition-all hover:border-primary/40"
                    data-testid={`inspection-card-${insp.id}`}
                  >
                    {/* رأس بطاقة المعاينة */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="text-lg font-bold text-foreground">{insp.title}</strong>
                          <span className="text-xs text-muted-foreground">({insp.roomType})</span>
                        </div>
                        <span className="text-xs text-muted-foreground block">{insp.address}</span>
                      </div>

                      {/* شارة الحالة */}
                      <div>
                        {insp.status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600">
                            <Clock size={14} />
                            طلب جديد (بانتظار مراجعة الإدارة)
                          </span>
                        )}
                        {insp.status === "scheduled" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-600">
                            <Calendar size={14} />
                            مجدول للمعاينة الميدانية
                          </span>
                        )}
                        {insp.status === "inspected" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-600">
                            <Camera size={14} />
                            تمت المعاينة الميدانية (جاري الرفع)
                          </span>
                        )}
                        {insp.status === "approved" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={14} />
                            تم الاعتماد والنشر للطلاب ✨
                          </span>
                        )}
                        {insp.status === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600">
                            <AlertCircle size={14} />
                            مرفوض
                          </span>
                        )}
                      </div>
                    </div>

                    {/* مسار الخطوات المرئي للمعاينات (Inspection Progress Steps) */}
                    <div className="my-5 rounded-xl border border-border bg-card/60 p-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                        <div className="flex items-center gap-2 font-bold text-emerald-600">
                          <CheckCircle2 size={16} />
                          <span>١. استلام الطلب</span>
                        </div>

                        <div className={`flex items-center gap-2 font-bold ${
                          insp.status !== "pending" ? "text-emerald-600" : "text-muted-foreground"
                        }`}>
                          {insp.status !== "pending" ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                          <span>٢. تحديد موعد الزيارة</span>
                        </div>

                        <div className={`flex items-center gap-2 font-bold ${
                          insp.status === "inspected" || insp.status === "approved" ? "text-emerald-600" : "text-muted-foreground"
                        }`}>
                          {insp.status === "inspected" || insp.status === "approved" ? <CheckCircle2 size={16} /> : <Camera size={16} />}
                          <span>٣. نزول المعاينة وتصوير 360°</span>
                        </div>

                        <div className={`flex items-center gap-2 font-bold ${
                          insp.status === "approved" ? "text-emerald-600" : "text-muted-foreground"
                        }`}>
                          {insp.status === "approved" ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                          <span>٤. التفعيل والنشر للطلاب</span>
                        </div>
                      </div>
                    </div>

                    {/* تفاصيل المعاينة والمشرف والصور */}
                    <div className="grid gap-4 sm:grid-cols-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-1">بيانات العقار:</span>
                        <p className="font-semibold text-foreground">
                          {insp.areaSqm} م² · {insp.bedrooms} غرف · الدور {insp.floor} · {insp.furnishing}
                        </p>
                        <p className="text-primary font-bold mt-1">الإيجار المقترح: {insp.pricePerMonth} جنيه / شهر</p>
                      </div>

                      <div>
                        <span className="text-muted-foreground block mb-1">تفاصيل الزيارة الميدانية:</span>
                        {insp.scheduledDate ? (
                          <div className="space-y-0.5">
                            <strong className="text-foreground block">{insp.scheduledDate}</strong>
                            <span className="text-muted-foreground block">المشرف: {insp.inspectorName || "مهندس المعاينة"}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">جاري التنسيق لتحديد موعد الزيارة هاتفياً ({insp.preferredInspectionDate})</span>
                        )}
                      </div>

                      <div>
                        <span className="text-muted-foreground block mb-1">الصور المرفوعة:</span>
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          {insp.initialPhotos.slice(0, 3).map((img, i) => (
                            <img key={i} src={img} alt="صورة عقار" className="h-10 w-14 rounded-lg object-cover border border-border" />
                          ))}
                          {insp.initialPhotos.length > 3 && (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-[10px] font-bold">
                              +{insp.initialPhotos.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ملاحظات المشرف إن وجدت */}
                    {insp.inspectorReport && (
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                        <strong className="text-primary block mb-0.5">تقرير مهندس المعاينة:</strong>
                        <p>{insp.inspectorReport}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* محتوى التبويب الثالث: حجوزات وحدات المالك */}
      {activeTab === "bookings" && (
        <div className="mt-6 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">حجوزات الوحدات السكنية المملوكة لك</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  جميع الحجوزات المقدمة على عقاراتك المعتمدة معالجة عبر إدارة مكاني الرسمية.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {ownerBookings.length} حجز
              </span>
            </div>

            {ownerBookings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <FileText size={24} />
                </div>
                <h3 className="text-base font-bold text-foreground">لا توجد حجوزات حالية</h3>
                <p className="mt-1 text-xs text-muted-foreground">عندما يقوم الطلاب بطلب حجز وحداتك السكنية ورفع الإيصالات، ستظهر طلباتهم هنا.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ownerBookings.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border bg-background p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-extrabold text-primary">{b.bookingCode}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          b.status === "confirmed" ? "bg-emerald-500/15 text-emerald-600" :
                          b.status === "rejected" ? "bg-rose-500/15 text-rose-600" : "bg-amber-500/15 text-amber-600"
                        }`}>
                          {b.status === "confirmed" ? "مؤكد ومعتمد" : b.status === "rejected" ? "مرفوض" : "قيد المراجعة الإدارية"}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground">{b.propertyTitle || b.property?.title || "وحدة سكنية"}</h4>
                      <p className="text-xs text-muted-foreground mt-1">الإيجار المالي: {b.paymentAmount} ج.م/شهر</p>
                      <p className="text-xs text-muted-foreground">طريقة الدفع: {b.paymentMethod === "vodafone_cash" ? "فودافون كاش" : b.paymentMethod === "instapay" ? "إنستاباي" : "تحويل بنكي"}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                      <span>تاريخ الحجز: {new Date(b.createdAt).toLocaleDateString("ar-EG")}</span>
                      <span className="font-semibold text-primary">إدارة مكاني</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* محتوى تبويب الدعم والمساعدة للمالك */}
      {activeTab === "support" && (
        <div className="mt-6" data-testid="section-owner-support">
          <SupportCenter role="owner" openToast={openToast} />
        </div>
      )}

      {/* نافذة إنشاء / تعديل الوحدة السكنية (CRUD مع Supabase Storage) */}
      {isAddApartmentModalOpen && (
        <OwnerApartmentModal
          onClose={() => {
            setIsAddApartmentModalOpen(false);
            setEditingApartment(null);
          }}
          initialData={editingApartment}
          onSuccess={() => {
            setIsAddApartmentModalOpen(false);
            setEditingApartment(null);
            fetchOwnerApartments();
            setActiveTab("units");
          }}
          openToast={openToast}
        />
      )}

      {/* نافذة إرسال طلب معاينة وتوثيق 360° */}
      {isAddInspectionModalOpen && (
        <InspectionRequestModal
          onClose={() => setIsAddInspectionModalOpen(false)}
          onSuccess={() => {
            setIsAddInspectionModalOpen(false);
            setActiveTab("inspections");
          }}
          openToast={openToast}
        />
      )}
    </section>
  );
}
