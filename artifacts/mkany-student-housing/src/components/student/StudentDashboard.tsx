import React, { useState, useEffect } from "react";
import { 
  GraduationCap, 
  CreditCard, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Home, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  MessageCircle, 
  User, 
  Building2, 
  AlertCircle, 
  Eye, 
  Sparkles, 
  ArrowLeft,
  X,
  ChevronRight,
  BookOpen,
  Image as ImageIcon,
  Heart,
  Trash2,
  HeartOff,
  Sparkle,
  LifeBuoy
} from "lucide-react";
import { useAuth, EGYPTIAN_UNIVERSITIES, SignInButton } from "@/components/auth/clerk-auth";
import { getStudentBookingsApi, StudentBooking, buildWhatsAppBookingUrl, RentPayment, getRentPaymentsApi, uploadRentReceiptApi, uploadSubscriptionReceiptApi } from "@/lib/bookings-store";
import { getStudentFavoritesApi, removeFavoriteApi, StudentFavorite } from "@/lib/favorites-store";
import { StandardModal } from "@/components/ui/StandardModal";
import { SupportCenter } from "@/components/support/SupportCenter";
import { uploadSingleImageApi, uploadPrivateReceiptApi } from "@/lib/api-client";

interface StudentDashboardProps {
  openToast: (msg: string) => void;
  onExploreProperties: () => void;
  onViewPropertyModal?: (property: any) => void;
  onGoToOwnerDashboard?: () => void;
  initialTab?: "bookings" | "favorites" | "profile" | "support";
}

export function StudentDashboard({ openToast, onExploreProperties, onViewPropertyModal, onGoToOwnerDashboard, initialTab = "bookings" }: StudentDashboardProps) {
  const { user, isSignedIn, openSignIn, updateUserProfile, switchRole } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"bookings" | "favorites" | "profile" | "support">(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // مفضلة الطالب من PostgreSQL
  const [favorites, setFavorites] = useState<StudentFavorite[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [removingFavId, setRemovingFavId] = useState<number | null>(null);

  // حقول الملف الشخصي القابلة للتعديل
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [nationalId, setNationalId] = useState(user?.nationalId || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [university, setUniversity] = useState(user?.university || EGYPTIAN_UNIVERSITIES[0]);
  const [faculty, setFaculty] = useState("كلية الهندسة / الحاسبات");
  const [academicYear, setAcademicYear] = useState("الفرقة الثالثة");
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (user) {
      if (user.fullName) setFullName(user.fullName);
      if (user.nationalId) setNationalId(user.nationalId);
      if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
      if (user.university) setUniversity(user.university);
    }
  }, [user]);

  // 1. حماية البوابة: إذا كان المستخدم غير مسجل دخول
  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center" data-testid="student-gate-not-signed-in">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap size={36} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            {t("dashboard.student.verified")} 🎓
          </span>

          <h2 className="text-2xl font-extrabold text-foreground">{t("nav.login")}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            {t("dashboard.student.bookings.noBookingsDesc")}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <SignInButton mode="modal">
              <button
                className="rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
              >
                {t("nav.login")} 🎓
              </button>
            </SignInButton>
            <button
              onClick={onExploreProperties}
              className="rounded-xl border border-border bg-background px-6 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("dashboard.student.bookings.browse")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. التحقق من العزل الصارم بين الأدوار: إذا كان المستخدم مسجل كمالك عقار
  if (user?.role === "owner") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center" data-testid="owner-in-student-barrier">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Building2 size={36} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground mb-3">
            حساب مالك عقار نشط 🏢
          </span>

          <h2 className="text-2xl font-extrabold text-foreground">حساب مالك عقار ({user.fullName})</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            لوحة حجوزات الطلاب مخصصة للطلاب الجامعيين. حسابك مسجل كمالك عقار في قاعدة البيانات. يمكنك الانتقال إلى لوحة تحكم المالك لإدارة الوحدات والمعاينات.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {onGoToOwnerDashboard ? (
              <button
                onClick={onGoToOwnerDashboard}
                className="rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
              >
                الذهاب إلى لوحة تحكم المالك 🏢
              </button>
            ) : (
              <button
                onClick={onExploreProperties}
                className="rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
              >
                تصفح الوحدات العامة
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. جلب حجوزات هذا الطالب حصرياً من قاعدة البيانات
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [expandedLedgerBookingId, setExpandedLedgerBookingId] = useState<string | null>(null);

  const fetchFavorites = () => {
    setIsLoadingFavorites(true);
    getStudentFavoritesApi()
      .then((res) => {
        setFavorites(res.favorites);
        setIsLoadingFavorites(false);
      })
      .catch(() => {
        setIsLoadingFavorites(false);
      });
  };

  React.useEffect(() => {
    if (isSignedIn) {
      setIsLoadingBookings(true);
      getStudentBookingsApi()
        .then((data) => {
          setBookings(data);
          setIsLoadingBookings(false);
        })
        .catch(() => {
          setIsLoadingBookings(false);
        });

      fetchFavorites();
    }
  }, [isSignedIn]);

  // استماع لأي تغيير يطرأ على المفضلة من واجهة التصفح
  React.useEffect(() => {
    const handleFavUpdated = () => {
      if (isSignedIn) {
        fetchFavorites();
      }
    };
    window.addEventListener("mkany_favorites_updated", handleFavUpdated);
    return () => window.removeEventListener("mkany_favorites_updated", handleFavUpdated);
  }, [isSignedIn]);

  const handleRemoveFavorite = async (propertyId: number) => {
    setRemovingFavId(propertyId);
    const res = await removeFavoriteApi(propertyId);
    setRemovingFavId(null);
    if (res.success) {
      setFavorites((prev) => prev.filter((f) => f.propertyId !== propertyId));
      openToast("تمت إزالة العقار من المفضلة");
      window.dispatchEvent(new CustomEvent("mkany_favorites_updated"));
    } else {
      openToast(res.message || "فشل في إزالة العقار من المفضلة");
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId && nationalId.length !== 14) {
      openToast("الرقم القومي يجب أن يتكون من 14 رقماً بالضبط");
      return;
    }
    updateUserProfile({
      fullName,
      nationalId,
      phoneNumber,
      university,
    });
    setIsSaved(true);
    openToast("تم حفظ وتحديث ملف الطالب بنجاح");
    setTimeout(() => setIsSaved(false), 2500);
  };

  const getStatusBadge = (status: StudentBooking["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} />
            تم تأكيد الحجز واعتماد الإيصال
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle size={13} />
            إيصال غير مكتمل / مرفوض
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Clock size={13} />
            قيد مراجعة الإيصال
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-right" data-testid="student-dashboard">
      {/* رأس الداشبورد والترحيب بالطالب */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary text-xl font-black">
              {user?.fullName?.split(" ")[0]?.[0] || "ط"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold sm:text-3xl text-foreground">
                  {t("dashboard.student.welcome")} {user?.fullName || "Mkany Student"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={14} />
                  {t("dashboard.student.verified")}
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GraduationCap size={15} className="text-primary" />
                  {user?.university || "University"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <CreditCard size={14} className="text-primary" />
                  {t("dashboard.student.nationalId")} {user?.nationalId || "00000000000000"}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onExploreProperties}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
            data-testid="student-btn-browse-housing"
          >
            <Home size={16} />
            {t("dashboard.student.exploreBtn")}
          </button>
        </div>

        {/* بريف مكاني التعريفي */}
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs sm:text-sm leading-6 text-foreground/90">
          <strong className="text-primary font-bold block mb-1">{t("dashboard.student.aboutMkany")}</strong>
          {t("hero.description")}
        </div>
      </div>

      {/* شريط التبويبات للداشبورد */}
      <div className="mb-6 flex border-b border-border text-sm font-bold">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 transition-colors ${
            activeTab === "bookings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-student-bookings"
        >
          <Calendar size={18} />
          {t("dashboard.student.bookingsTab")} ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 transition-colors ${
            activeTab === "favorites"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-student-favorites"
        >
          <Heart size={18} />
          {t("dashboard.student.favoritesTab")} ({favorites.length})
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 transition-colors ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-student-profile"
        >
          <User size={18} />
          {t("dashboard.student.profileTab")}
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 transition-colors ${
            activeTab === "support"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-student-support"
        >
          <LifeBuoy size={18} />
          {t("dashboard.student.supportTab")}
        </button>
      </div>

      {/* محتوى تبويب الحجوزات */}
      {activeTab === "bookings" && (
        <div className="space-y-6" data-testid="section-student-bookings">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">{t("dashboard.student.bookings.title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.student.bookings.subtitle")}
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {t("dashboard.student.bookings.whatsapp")} <span className="font-mono text-primary font-bold">01055332242</span>
            </span>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
              <Home size={38} className="mx-auto mb-3 text-muted-foreground/60" />
              <h3 className="text-lg font-bold text-foreground">{t("dashboard.student.bookings.noBookings")}</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                {t("dashboard.student.bookings.noBookingsDesc")}
              </p>
              <button
                onClick={onExploreProperties}
                className="mt-5 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow"
              >
                {t("dashboard.student.bookings.browse")}
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
                  data-testid={`booking-card-${booking.id}`}
                >
                  <div className="grid md:grid-cols-[220px_1fr] gap-6 p-6">
                    <div className="relative h-44 md:h-auto overflow-hidden rounded-2xl border border-border">
                      <img
                        src={booking.propertyImage}
                        alt={booking.propertyTitle}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 rounded-lg bg-background/90 px-2 py-1 text-[10px] font-bold text-foreground">
                        {booking.propertyUniversity}
                      </span>
                    </div>

                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                            {booking.bookingCode}
                          </span>
                          {getStatusBadge(booking.status)}
                        </div>

                        <h3 className="text-lg font-bold text-foreground">{booking.propertyTitle}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{booking.propertyAddress}</p>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">{t("dashboard.student.bookings.rent")}</span>
                            <strong className="text-foreground text-sm font-bold">
                              {booking.propertyPrice} <small className="text-[10px]">{t("property.perMonth")}</small>
                            </strong>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">{t("dashboard.student.bookings.paymentMethod")}</span>
                            <strong className="text-foreground text-xs font-semibold">
                              {booking.paymentMethod === "vodafone_cash" ? "فودافون كاش" : booking.paymentMethod === "instapay" ? "إنستاباي" : "تحويل بنكي"}
                            </strong>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">{t("dashboard.student.bookings.sender")}</span>
                            <strong className="text-foreground font-mono text-xs">
                              {booking.senderPhone || booking.studentPhone}
                            </strong>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">{t("dashboard.student.bookings.date")}</span>
                            <strong className="text-foreground text-xs">
                              {new Date(booking.createdAt).toLocaleDateString(language === 'ar' ? "ar-EG" : "en-US")}
                            </strong>
                          </div>
                        </div>

                        {booking.adminNotes && (
                          <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                            <strong>{t("dashboard.student.bookings.adminNotes")} </strong> {booking.adminNotes}
                          </div>
                        )}
                      </div>

                      {/* أزرار الإجراءات على الحجز */}
                      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                        {booking.receiptImageUrl && (
                          <button
                            onClick={() => setSelectedReceipt(booking.receiptImageUrl || null)}
                            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                            data-testid={`btn-view-receipt-${booking.id}`}
                          >
                            <ImageIcon size={14} className="text-primary" />
                            {t("dashboard.student.bookings.viewReceipt")}
                          </button>
                        )}

                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => setExpandedLedgerBookingId(expandedLedgerBookingId === booking.id ? null : booking.id)}
                            className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                            data-testid={`btn-toggle-ledger-${booking.id}`}
                          >
                            <FileText size={14} />
                            {expandedLedgerBookingId === booking.id ? t("dashboard.student.bookings.ledgerClose") : t("dashboard.student.bookings.ledgerOpen")}
                          </button>
                        )}

                        <a
                          href={buildWhatsAppBookingUrl(booking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                          data-testid={`btn-whatsapp-booking-${booking.id}`}
                        >
                          <MessageCircle size={14} />
                          {t("dashboard.student.bookings.whatsappContact")}
                        </a>
                      </div>

                      {expandedLedgerBookingId === booking.id && (
                        <BookingRentLedger booking={booking} openToast={openToast} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* محتوى تبويب المفضلة المحفوظة للطالب من PostgreSQL */}
      {activeTab === "favorites" && (
        <div className="space-y-6" data-testid="section-student-favorites">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <Heart size={22} className="text-rose-500 fill-rose-500" />
                {t("dashboard.student.favorites.title")} ({favorites.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.student.favorites.subtitle")}
              </p>
            </div>
            <button
              onClick={onExploreProperties}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              <Home size={15} />
              {t("dashboard.student.favorites.explore")}
            </button>
          </div>

          {isLoadingFavorites ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs font-bold text-muted-foreground">{t("dashboard.student.favorites.loading")}</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center" data-testid="empty-favorites-card">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <HeartOff size={34} />
              </div>
              <h3 className="text-lg font-bold text-foreground">{t("dashboard.student.favorites.empty")}</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground leading-6">
                {t("dashboard.student.favorites.emptyDesc")}
              </p>
              <button
                onClick={onExploreProperties}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
                data-testid="btn-empty-favorites-browse"
              >
                <Sparkles size={15} />
                {t("dashboard.student.bookings.browse")}
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((fav) => {
                const p = fav.property;
                const coverImage = p.photos?.[0]?.url || p.images?.[0] || "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200";
                const isRemoving = removingFavId === fav.propertyId;

                return (
                  <article
                    key={fav.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                    data-testid={`card-favorite-${fav.propertyId}`}
                  >
                    <div>
                      {/* صورة العقار والحالات */}
                      <div className="relative h-48 w-full overflow-hidden bg-muted">
                        <img
                          src={coverImage}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute(
                              "src",
                              "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200"
                            );
                          }}
                        />

                        {/* بادجات التوثيق والتميز */}
                        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {p.verified && (
                              <span className="flex items-center gap-1 rounded-full bg-background/95 px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm">
                                <ShieldCheck size={11} />
                                {t("dashboard.student.favorites.verified")}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              p.status === "متاح" 
                                ? "bg-emerald-500/90 text-white" 
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {p.status === "متاح" ? t("dashboard.student.favorites.available") : p.status}
                            </span>
                          </div>

                          {/* زر حذف من المفضلة */}
                          <button
                            onClick={() => handleRemoveFavorite(fav.propertyId)}
                            disabled={isRemoving}
                            className="rounded-full bg-background/90 p-2 text-rose-500 shadow-sm transition-colors hover:bg-rose-500 hover:text-white disabled:opacity-50"
                            title={t("dashboard.student.favorites.remove")}
                            aria-label={t("dashboard.student.favorites.remove")}
                            data-testid={`btn-remove-fav-${fav.propertyId}`}
                          >
                            {isRemoving ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* تفاصيل العقار */}
                      <div className="p-4 text-right">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-base font-extrabold text-foreground line-clamp-1">
                            {p.title}
                          </h3>
                          <div className="shrink-0 text-left">
                            <strong className="text-base font-black text-primary">
                              {p.pricePerMonth?.toLocaleString()}
                            </strong>
                            <span className="block text-[10px] text-muted-foreground">{t("dashboard.student.favorites.perMonth")}</span>
                          </div>
                        </div>

                        <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                          <Building2 size={13} className="text-primary shrink-0" />
                          {p.address} • {p.university}
                        </p>

                        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground border-y border-border/60 py-2">
                          <span>{p.roomType}</span>
                          {p.areaSqm && <span>• {p.areaSqm} م²</span>}
                          {p.bedrooms && <span>• {p.bedrooms} {t("dashboard.student.favorites.rooms")}</span>}
                          {p.livabilityScore && (
                            <span className="text-primary font-bold">
                              • {t("dashboard.student.favorites.livability")} {p.livabilityScore}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="p-4 pt-0">
                      {onViewPropertyModal && (
                        <button
                          onClick={() => onViewPropertyModal(p)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          data-testid={`btn-view-fav-details-${fav.propertyId}`}
                        >
                          <Eye size={15} />
                          {t("dashboard.student.favorites.viewDetails")}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* محتوى تبويب إدارة الملف الشخصي */}
      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]" data-testid="section-student-profile">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">{t("dashboard.student.profile.title")}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.student.profile.subtitle")}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 p-2.5 text-primary">
                <User size={20} />
              </span>
            </div>

            {isSaved && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} />
                {t("dashboard.student.profile.savedSuccess")}
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  {t("dashboard.student.profile.fullName")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                  data-testid="input-profile-name"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  {t("dashboard.student.profile.nationalId")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  required
                  pattern="^\d{14}$"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                  placeholder="30208151234567"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm tracking-wider text-foreground outline-none focus:border-primary"
                  data-testid="input-profile-national-id"
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {t("dashboard.student.profile.nationalIdNote")}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    {t("dashboard.student.profile.phone")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm text-foreground outline-none focus:border-primary"
                    data-testid="input-profile-phone"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">
                    {t("dashboard.student.profile.university")} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                    data-testid="select-profile-university"
                  >
                    {EGYPTIAN_UNIVERSITIES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-foreground mb-1">{t("dashboard.student.profile.faculty")}</label>
                  <input
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder={t("dashboard.student.profile.facultyPlaceholder")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">{t("dashboard.student.profile.academicYear")}</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option>الفرقة الأولى</option>
                    <option>الفرقة الثانية</option>
                    <option>الفرقة الثالثة</option>
                    <option>الفرقة الرابعة</option>
                    <option>الفرقة الخامسة / السادسة</option>
                    <option>سنة الامتياز</option>
                    <option>دراسات عليا / ماجستير</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">{t("dashboard.student.profile.email")}</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || "student@kfs.edu.eg"}
                  className="w-full rounded-xl border border-border bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground cursor-not-allowed"
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {t("dashboard.student.profile.emailNote")}
                </span>
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
                data-testid="btn-save-profile"
              >
                {t("dashboard.student.profile.saveBtn")}
              </button>
            </form>
          </div>

          {/* بطاقة وضع التفعيل وحالة التوثيق */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm" data-testid="student-verification-card">
              {(() => {
                const isVerified = Boolean(user?.isVerified);
                const hasNationalId = Boolean(user?.nationalId && user.nationalId.length === 14 && user.nationalId !== "00000000000000");

                let statusBadge = {
                  text: "موثق",
                  subtext: "حساب طالب موثق ومعتمد رسمياً ✓",
                  color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  iconColor: "bg-emerald-500/15 text-emerald-600",
                  icon: <ShieldCheck size={26} />,
                };

                if (!isVerified) {
                  if (hasNationalId) {
                    statusBadge = {
                      text: "قيد التحقق",
                      subtext: "بياناتك قيد التدقيق والمراجعة بواسطة إدارة مكاني",
                      color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      iconColor: "bg-amber-500/15 text-amber-600",
                      icon: <Clock size={26} />,
                    };
                  } else {
                    statusBadge = {
                      text: "يحتاج إجراء",
                      subtext: "يرجى إدخال الرقم القومي المكون من ١٤ رقماً لطلب التوثيق",
                      color: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                      iconColor: "bg-rose-500/15 text-rose-600",
                      icon: <AlertCircle size={26} />,
                    };
                  }
                }

                return (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${statusBadge.iconColor}`}>
                        {statusBadge.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-foreground">{t("dashboard.student.profile.status")}</h3>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge.color}`} data-testid="student-verification-status">
                            {statusBadge.text}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {statusBadge.subtext}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-6">
                      {t("dashboard.student.profile.about")}
                    </p>

                    <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("dashboard.student.profile.nationalIdLabel")}</span>
                        <span className={`font-bold flex items-center gap-1 ${hasNationalId ? "text-emerald-600" : "text-amber-600"}`}>
                          {hasNationalId ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                          {hasNationalId ? "مكتمل" : "مطلوب الإدخال"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">القيد بالجامعة المصرية:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          {user?.university || "جامعة كفر الشيخ"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">رقم الهاتف للتواصل:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          {user?.phoneNumber || "نشط"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">فئة العضوية بالموقع:</span>
                        <span className="font-bold">
                          {user?.subscriptionStatus === "approved" ? (
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-black tracking-wider flex items-center gap-0.5">
                              ⭐ باقة Pro نشطة
                            </span>
                          ) : (
                            <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                              عضوية عادية
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* بطاقة الدعم السريع عبر واتساب */}
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <MessageCircle size={18} />
                دعم الطلاب والإيصالات
              </div>
              <p className="text-xs text-muted-foreground leading-6">
                إذا قمت بتحويل بنكي أو إنستاباي وتريد الاستفسار عن اعتماد حجزك فوراً، يمكنك مراسلة خدمة عملاء مكاني مباشرة.
              </p>
              <a
                href="https://wa.me/201055332242"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                data-testid="student-direct-whatsapp"
              >
                تواصل مع الإدارة: 01055332242 💬
              </a>
            </div>
          </div>
        </div>
      )}

      {/* محتوى تبويب الدعم والمساعدة */}
      {activeTab === "support" && (
        <div data-testid="section-student-support">
          <SupportCenter role="student" openToast={openToast} />
        </div>
      )}

      {/* نافذة معاينة صورة الإيصال */}
      <StandardModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        maxWidthClassName="max-w-lg"
        title="صورة إيصال الدفع اليدوي المرفوع"
        testId="student-receipt-modal"
        closeButtonAriaLabel="إغلاق صورة الإيصال"
      >
        <div>
          <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border">
            {selectedReceipt && (
              <img
                src={selectedReceipt}
                alt="إيصال الدفع"
                className="w-full object-contain"
              />
            )}
          </div>
        </div>
      </StandardModal>
     </div>
   );
 }

interface BookingRentLedgerProps {
  booking: StudentBooking;
  openToast: (msg: string) => void;
}

export function BookingRentLedger({ booking, openToast }: BookingRentLedgerProps) {
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Subscription state
  const [localBooking, setLocalBooking] = useState<StudentBooking>(booking);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subFile, setSubFile] = useState<File | null>(null);
  const [isUploadingSub, setIsUploadingSub] = useState(false);

  // Year collapsible state
  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocalBooking(booking);
  }, [booking]);

  const fetchPayments = async () => {
    setLoading(true);
    const list = await getRentPaymentsApi(booking.id);
    setPayments(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [booking.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSubFile(e.target.files[0]);
    }
  };

  const handleSubUploadSubmit = async () => {
    if (!subFile) {
      openToast("يرجى اختيار صورة الإيصال أولاً");
      return;
    }
    setSubmittingSub(true);
    try {
      const uploadRes = await uploadPrivateReceiptApi(subFile);
      const receiptPath = uploadRes.path;
      if (!uploadRes || !receiptPath) {
        throw new Error("فشل رفع إيصال الاشتراك إلى التخزين الخاص المشفر");
      }
      
      const updated = await uploadSubscriptionReceiptApi(localBooking.id, receiptPath);
      if (!updated) {
        throw new Error("فشل حفظ إيصال اشتراك مكاني");
      }

      openToast("تم رفع إيصال اشتراك مكاني بأمان وهو قيد المراجعة الآن ✅");
      setSubFile(null);
      setIsUploadingSub(false);
      setLocalBooking(updated);
    } catch (err: any) {
      console.error(err);
      openToast(err.message || "حدث خطأ أثناء رفع إيصال الاشتراك");
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleUploadSubmit = async (paymentId: string) => {
    if (!file) {
      openToast("يرجى اختيار صورة الإيصال أولاً");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upload file securely to private bucket
      const uploadRes = await uploadPrivateReceiptApi(file);
      const receiptPath = uploadRes.path;
      if (!uploadRes || !receiptPath) {
        throw new Error("فشل رفع الإيصال للتخزين الخاص المشفر");
      }
      
      // 2. Save receipt record in database
      const updated = await uploadRentReceiptApi(booking.id, paymentId, receiptPath);
      if (!updated) {
        throw new Error("فشل حفظ إيصال الدفع");
      }

      openToast("تم رفع الإيصال بأمان إلى التخزين الخاص وهو قيد المراجعة الآن");
      setFile(null);
      setUploadingPaymentId(null);
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      openToast(err.message || "حدث خطأ أثناء رفع الإيصال");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleYear = (year: string) => {
    setCollapsedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const getYearFromDueDate = (dueDate: string) => {
    if (!dueDate) return "أخرى";
    const parts = dueDate.split("-");
    return parts[0] || "أخرى";
  };

  if (loading) {
    return (
      <div className="mt-4 p-6 border border-dashed border-border rounded-2xl bg-muted/20 text-center text-xs text-muted-foreground">
        جاري تحميل الدفتر المالي وعقد الإيجار...
      </div>
    );
  }

  const hasContract = Boolean(booking.contractStartDate && booking.contractEndDate);

  if (!hasContract) {
    return (
      <div className="mt-4 p-6 border border-dashed border-yellow-500/20 rounded-2xl bg-yellow-500/5 text-right space-y-4">
        {/* Highlighted primary payment amount display card at top even before contract is ready */}
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 text-center space-y-3 shadow-sm">
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">المطلوب للدفع الآن لتأكيد الحجز وتوثيق العقد</h4>
          <div className="text-3xl font-black text-amber-600 tracking-tight">
            ١,٢٠٠ جنيه فقط
          </div>
          <p className="text-xs text-muted-foreground font-bold">
            اشتراك مكاني — يُدفع مرة واحدة فقط
          </p>
          <div className="pt-2 border-t border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-2 text-right">
            <div className="p-2.5 bg-background/50 rounded-xl">
              <span className="text-[10px] text-muted-foreground block">اشتراك مكاني:</span>
              <strong className="text-amber-700 text-xs font-bold">1200 ج.م (مطلوب الآن)</strong>
            </div>
            <div className="p-2.5 bg-background/50 rounded-xl">
              <span className="text-[10px] text-muted-foreground block">الإيجار الشهري:</span>
              <strong className="text-muted-foreground text-xs font-bold font-black">غير مطلوب الآن</strong>
            </div>
            <div className="p-2.5 bg-background/50 rounded-xl">
              <span className="text-[10px] text-muted-foreground block">مبلغ التأمين (الوديعة):</span>
              <strong className="text-muted-foreground text-xs font-bold font-black">غير مطلوب الآن</strong>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-start">
          <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" size={16} />
          <div>
            <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-300 font-bold">بانتظار توثيق عقد الإيجار من الإدارة</h4>
            <p className="text-xs text-yellow-700 dark:text-yellow-400/80 mt-1 leading-relaxed">
              لم يتم تفعيل مدة العقد أو جدول دفعات الإيجار الشهري بعد. ستقوم الإدارة بتسجيل تفاصيل العقد (تاريخ البدء والانتهاء ومبلغ التأمين وتوليد جدول الدفعات) فور استلام وتوثيق عقدك ومراجعة اشتراك مكاني.
            </p>
          </div>
        </div>

        {/* Allow student to upload subscription receipt even before contract generation */}
        <div className="border border-border/60 bg-background rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-foreground">رفع إيصال سداد اشتراك مكاني (1200 ج.م)</h5>
            <p className="text-[11px] text-muted-foreground">يمكنك رفع الإيصال هنا لتبدأ الإدارة بمراجعة طلبك فوراً وتوثيق عقد الإيجار.</p>
          </div>
          <div className="shrink-0">
            {localBooking.subscriptionReceiptUrl && (
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(localBooking.subscriptionReceiptUrl || null)}
                className="text-xs text-primary hover:underline font-bold block text-left mb-2"
              >
                🔍 معاينة إيصال الاشتراك المرفوع
              </button>
            )}

            {localBooking.subscriptionStatus !== "approved" && localBooking.subscriptionStatus !== "pending_review" && (
              <div>
                {isUploadingSub ? (
                  <div className="flex flex-col gap-2 p-2.5 border border-dashed border-primary/30 rounded-xl bg-primary/5 text-right max-w-xs">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSubFileChange}
                      className="text-[10px] w-full"
                    />
                    {subFile && (
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSubFile(null);
                            setIsUploadingSub(false);
                          }}
                          className="text-[10px] bg-background hover:bg-muted text-muted-foreground border border-border px-2 py-1 rounded-lg font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={handleSubUploadSubmit}
                          disabled={submittingSub}
                          className="text-[10px] bg-primary hover:bg-primary-hover text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1"
                        >
                          {submittingSub ? "جاري..." : "تأكيد وإرسال"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadingSub(true);
                      setSubFile(null);
                    }}
                    className="text-xs bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow"
                  >
                    <CreditCard size={13} />
                    {localBooking.subscriptionStatus === "rejected" ? "إعادة رفع إيصال الاشتراك" : "رفع إيصال الاشتراك (1200 ج.م)"}
                  </button>
                )}
              </div>
            )}

            {localBooking.subscriptionStatus === "pending_review" && (
              <span className="bg-amber-500/10 text-amber-700 text-xs px-2.5 py-1.5 rounded-xl font-bold inline-block">⏳ الإيصال قيد المراجعة</span>
            )}
            {localBooking.subscriptionStatus === "approved" && (
              <span className="bg-emerald-500/10 text-emerald-700 text-xs px-2.5 py-1.5 rounded-xl font-bold inline-block">✅ مقبول ومفعّل Pro ⭐</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Get deposit status badges
  const getDepositBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">مدفوع بالكامل</span>;
      case "partial":
        return <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">مدفوع جزئيًا</span>;
      default:
        return <span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold">غير مدفوع</span>;
    }
  };

  // Status mapping for monthly payments
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-lg font-bold">مدفوع</span>;
      case "pending_review":
        return <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs px-2.5 py-1 rounded-lg font-bold">قيد المراجعة</span>;
      case "rejected":
        return <span className="bg-rose-500/15 text-rose-700 dark:text-rose-400 text-xs px-2.5 py-1 rounded-lg font-bold">مرفوض - يرجى الرفع مجدداً</span>;
      case "overdue":
        return <span className="bg-red-600/15 text-red-600 dark:text-red-400 text-xs px-2.5 py-1 rounded-lg font-bold animate-pulse">متأخر</span>;
      default:
        return <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-lg font-medium">مستحق</span>;
    }
  };

  // Group payments by year
  const paymentsByYear: Record<string, RentPayment[]> = {};
  payments.forEach(p => {
    const year = getYearFromDueDate(p.dueDate);
    if (!paymentsByYear[year]) {
      paymentsByYear[year] = [];
    }
    paymentsByYear[year].push(p);
  });

  const sortedYears = Object.keys(paymentsByYear).sort((a, b) => b.localeCompare(a));

  return (
    <div className="mt-4 p-6 border border-border rounded-2xl bg-muted/10 space-y-6 text-right">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h4 className="text-base font-bold text-foreground">الدفتر المالي وعقد الإيجار الموثق 📜</h4>
        <span className="text-xs text-muted-foreground font-mono">كود الحجز: {booking.bookingCode}</span>
      </div>

      {/* HIGHLIGHTED CARD: Required Primary Display for Payment Clarity */}
      <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-6 text-center space-y-3 shadow-sm">
        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">المطلوب للدفع الآن لتأكيد الهوية وتوثيق عقد الإيجار</h4>
        <div className="text-3xl font-black text-amber-600 tracking-tight">
          ١,٢٠٠ جنيه فقط
        </div>
        <p className="text-xs text-muted-foreground font-bold">
          اشتراك مكاني — يُدفع مرة واحدة فقط
        </p>
        <div className="pt-2 border-t border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-2 text-right">
          <div className="p-2.5 bg-background/50 rounded-xl">
            <span className="text-[10px] text-muted-foreground block">اشتراك مكاني:</span>
            <strong className="text-amber-700 text-xs font-bold">1200 ج.م (مطلوب الآن)</strong>
          </div>
          <div className="p-2.5 bg-background/50 rounded-xl">
            <span className="text-[10px] text-muted-foreground block">الإيجار الشهري المتكرر:</span>
            <strong className="text-muted-foreground text-xs font-bold">غير مطلوب في هذه الخطوة</strong>
          </div>
          <div className="p-2.5 bg-background/50 rounded-xl">
            <span className="text-[10px] text-muted-foreground block">مبلغ التأمين (الوديعة):</span>
            <strong className="text-muted-foreground text-xs font-bold">غير مطلوب في هذه الخطوة</strong>
          </div>
        </div>
      </div>

      {/* Separator / Explanation of Stages */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-xs text-primary leading-relaxed">
        <h5 className="font-bold mb-1.5 flex items-center gap-1">
          <AlertCircle size={14} />
          توضيح النظام المالي لمنصة مكاني (٣ مراحل منفصلة تماماً):
        </h5>
        <ul className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground">
          <li><strong className="text-foreground">اشتراك مكاني (1200 ج.م):</strong> رسوم توثيق العقد والخدمة وتفعيل الحساب كـ Pro (تُدفع مرة واحدة للمنصة لتفعيل العقد والاشتراك).</li>
          <li><strong className="text-foreground">مبلغ تأمين الوحدة (الوديعة):</strong> يُدفع للمالك كضمان عند استلام السكن (مسترد بالكامل عند الإخلاء).</li>
          <li><strong className="text-foreground">الإيجار الشهري المتكرر:</strong> يُدفع شهرياً للمالك مباشرة، ويتم توثيق ورفع إيصال كل شهر في جدول الدفعات أدناه.</li>
        </ul>
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stage 1: Mkany Subscription */}
        <div className="bg-background border border-border p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">المرحلة ١: اشتراك مكاني</span>
              <strong className="text-foreground text-sm font-extrabold">1200 جنيه</strong>
            </div>
            <h5 className="text-xs font-bold text-foreground">رسوم التوثيق وتفعيل حساب Pro</h5>
            <p className="text-[11px] text-muted-foreground mt-1">يُدفع للمنصة مرة واحدة لتفعيل العقد وتأكيد الهوية كطالب Pro نشط واستلام الخدمات.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-bold">حالة الاشتراك:</span>
              {localBooking.subscriptionStatus === "approved" ? (
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold font-black">مقبول ومفعّل Pro ✅</span>
              ) : localBooking.subscriptionStatus === "pending_review" ? (
                <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">قيد المراجعة</span>
              ) : localBooking.subscriptionStatus === "rejected" ? (
                <span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold">مرفوض</span>
              ) : (
                <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">غير مدفوع</span>
              )}
            </div>

            {localBooking.subscriptionReceiptUrl && (
              <button
                type="button"
                onClick={() => setViewingReceiptUrl(localBooking.subscriptionReceiptUrl || null)}
                className="text-[10px] text-primary hover:underline font-bold text-right block"
              >
                🔍 معاينة إيصال الاشتراك المرفوع
              </button>
            )}

            {localBooking.subscriptionStatus !== "approved" && localBooking.subscriptionStatus !== "pending_review" && (
              <div className="pt-2">
                {isUploadingSub ? (
                  <div className="flex flex-col gap-2 p-2 border border-dashed border-primary/30 rounded-xl bg-primary/5 text-right w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSubFileChange}
                      className="text-[10px] w-full"
                    />
                    {subFile && (
                      <div className="flex gap-2 justify-end mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSubFile(null);
                            setIsUploadingSub(false);
                          }}
                          className="text-[9px] bg-background hover:bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={handleSubUploadSubmit}
                          disabled={submittingSub}
                          className="text-[9px] bg-primary hover:bg-primary-hover text-white px-2 py-0.5 rounded font-bold"
                        >
                          {submittingSub ? "جاري..." : "تأكيد"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadingSub(true);
                      setSubFile(null);
                    }}
                    className="w-full text-center text-[10px] bg-primary hover:bg-primary-hover text-white font-bold py-1.5 px-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1"
                  >
                    <CreditCard size={12} />
                    {localBooking.subscriptionStatus === "rejected" ? "إعادة رفع إيصال الاشتراك" : "رفع إيصال الاشتراك (1200 ج.م)"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stage 2: Security Deposit */}
        <div className="bg-background border border-border p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">المرحلة ٢: مبلغ التأمين</span>
              <strong className="text-foreground text-sm font-extrabold">{booking.depositAmount || 0} جنيه</strong>
            </div>
            <h5 className="text-xs font-bold text-foreground">الوديعة المستردة عند استلام المفتاح</h5>
            <p className="text-[11px] text-muted-foreground mt-1">يُسجل ويسدد عند المعاينة النهائية للموقع وتسليم الشقة.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-bold">حالة التأمين:</span>
            {getDepositBadge(booking.depositStatus || "unpaid")}
          </div>
        </div>

        {/* Stage 3: Handover & Keys */}
        <div className="bg-background border border-border p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">حالة تسليم الشقة</span>
              <strong className="text-foreground text-xs font-bold">{booking.handoverDate || "لم يحدد بعد"}</strong>
            </div>
            <h5 className="text-xs font-bold text-foreground">تسليم الوحدة والمفاتيح</h5>
            <p className="text-[11px] text-muted-foreground mt-1">عملية المعاينة واستلام العقار وتوقيع محاضر الاستلام والعيوب.</p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-bold">حالة التسليم:</span>
            {booking.handoverStatus === "completed" ? (
              <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">تم الاستلام والمفاتيح بنجاح🔑</span>
            ) : booking.handoverStatus === "scheduled" ? (
              <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">مجدول للاستلام</span>
            ) : (
              <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">لم يبدأ بعد</span>
            )}
          </div>
        </div>
      </div>

      {/* Contract stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border p-3.5 rounded-2xl">
          <span className="text-[10px] text-muted-foreground block">تاريخ بداية العقد</span>
          <strong className="text-foreground text-xs font-bold block mt-1">{booking.contractStartDate}</strong>
        </div>
        <div className="bg-background border border-border p-3.5 rounded-2xl">
          <span className="text-[10px] text-muted-foreground block">تاريخ نهاية العقد</span>
          <strong className="text-foreground text-xs font-bold block mt-1">{booking.contractEndDate}</strong>
        </div>
        <div className="bg-background border border-border p-3.5 rounded-2xl">
          <span className="text-[10px] text-muted-foreground block">مدة السكن</span>
          <strong className="text-foreground text-xs font-bold block mt-1">{booking.contractDurationMonths} أشهر</strong>
        </div>
        <div className="bg-background border border-border p-3.5 rounded-2xl">
          <span className="text-[10px] text-muted-foreground block">قيمة الوديعة (التأمين)</span>
          <div className="flex items-center justify-between mt-1">
            <strong className="text-indigo-600 font-extrabold text-xs">{booking.depositAmount} جنيه</strong>
            {getDepositBadge(booking.depositStatus || "unpaid")}
          </div>
        </div>
      </div>

      {/* Collapsible Monthly Rent Calendar View by Year */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/40 pb-2">
          <h5 className="text-sm font-bold text-foreground">التقويم المالي لدفعات الإيجار الشهري</h5>
          <span className="text-xs text-muted-foreground">اضغط على السنة لمشاهدة وتوثيق جدول الدفعات الشهرية</span>
        </div>
        
        {payments.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد دفعات إيجار مسجلة بعد لهذا العقد.</p>
        ) : (
          <div className="space-y-3">
            {sortedYears.map((year) => {
              const yearPayments = paymentsByYear[year] || [];
              const isCollapsed = collapsedYears[year];
              const paidCount = yearPayments.filter(p => p.status === "paid").length;
              const totalCount = yearPayments.length;

              return (
                <div key={year} className="border border-border/80 rounded-2xl overflow-hidden bg-background">
                  {/* Year Header */}
                  <button
                    type="button"
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-right"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">سنة {year}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                        {paidCount} مدفوعة / {totalCount} إجمالي
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-bold">
                      {isCollapsed ? "عرض الدفعات ⬇️" : "إخفاء الدفعات ⬆️"}
                    </div>
                  </button>

                  {/* Year Content */}
                  {!isCollapsed && (
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {yearPayments.map((p) => (
                        <div key={p.id} className="border border-border/60 hover:border-primary/30 p-4 rounded-xl bg-background flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h6 className="font-bold text-xs text-foreground">{p.billingPeriod}</h6>
                              {getPaymentStatusBadge(p.status)}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1 mt-1">
                              <div className="flex justify-between">
                                <span>مبلغ الإيجار:</span>
                                <strong className="text-primary font-bold">{p.amount} ج.م</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>تاريخ الاستحقاق:</span>
                                <span className="font-mono">{p.dueDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-end gap-1.5">
                            {p.receiptImageUrl && (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptUrl(p.receiptImageUrl || null)}
                                className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1.5 rounded-lg border border-border font-bold flex items-center gap-1 shrink-0"
                              >
                                <ImageIcon size={12} />
                                عرض الإيصال
                              </button>
                            )}

                            {p.status !== "paid" && p.status !== "pending_review" && (
                              <div className="w-full">
                                {uploadingPaymentId === p.id ? (
                                  <div className="flex flex-col gap-2 p-2 border border-dashed border-primary/30 rounded-lg bg-primary/5 text-right w-full">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={handleFileChange}
                                      className="text-[10px] w-full"
                                    />
                                    {file && (
                                      <div className="flex gap-2 justify-end mt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFile(null);
                                            setUploadingPaymentId(null);
                                          }}
                                          className="text-[10px] bg-background hover:bg-muted text-muted-foreground border border-border px-2 py-1 rounded-md font-bold"
                                        >
                                          إلغاء
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUploadSubmit(p.id)}
                                          disabled={submitting}
                                          className="text-[10px] bg-primary hover:bg-primary-hover text-white px-2.5 py-1 rounded-md font-bold flex items-center gap-1"
                                        >
                                          {submitting ? "جاري..." : "إرسال"}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUploadingPaymentId(p.id);
                                      setFile(null);
                                    }}
                                    className="text-[11px] bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 w-full justify-center transition-colors"
                                  >
                                    <FileText size={11} />
                                    رفع إيصال الشهر
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View rent receipt modal */}
      <StandardModal
        isOpen={Boolean(viewingReceiptUrl)}
        onClose={() => setViewingReceiptUrl(null)}
        maxWidthClassName="max-w-lg"
        title="إيصال سداد الإيجار الشهري المرفوع"
        closeButtonAriaLabel="إغلاق معاينة الإيصال"
      >
        <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border">
          {viewingReceiptUrl && (
            <img src={viewingReceiptUrl} alt="إيصال الإيجار" className="w-full object-contain mx-auto" />
          )}
        </div>
      </StandardModal>
    </div>
  );
}
