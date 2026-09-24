import React, { useState, useEffect } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Camera, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  Sparkles, 
  Eye, 
  Trash2, 
  X, 
  Check, 
  Filter, 
  Search, 
  Send,
  Video,
  Layers,
  ArrowRight,
  ExternalLink,
  Edit3,
  Plus,
  Home,
  MessageCircle,
  FileCheck,
  User,
  CreditCard,
  MapPin,
  Users,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  BarChart3,
  Activity,
  CheckSquare,
  FileText,
  Headphones,
  Star
} from "lucide-react";
import { 
  getAdminSupportConversationsApi, 
  getSupportConversationDetailsApi, 
  sendSupportMessageApi, 
  updateSupportStatusApi, 
  SupportConversationItem, 
  SUPPORT_CATEGORY_LABELS, 
  SUPPORT_STATUS_LABELS 
} from "@/lib/support-store";
import { 
  getAllRegisteredUsers, 
  toggleUserVerification, 
  toggleUserVerificationAsync,
  deleteUserFromDb, 
  deleteUserFromDbAsync,
  fetchUsersFromApi,
  updateUserRoleAsync,
  RegisteredUser, 
  USERS_CHANGE_EVENT 
} from "@/lib/user-db-sync";
import { 
  getAllInspections, 
  scheduleInspectionVisit, 
  markInspectionCompleted, 
  activateAndPublishProperty, 
  rejectInspectionRequest, 
  PropertyInspection,
  PlatformProperty,
  getAllPlatformProperties,
  updatePlatformProperty,
  deletePlatformProperty,
  addNewPlatformProperty,
  getDefaultAmenities,
  getEffectiveAmenities,
  syncInspectionsFromApi,
  syncPlatformPropertiesFromApi,
  NearbyAmenities
} from "@/lib/inspections-store";
import { 
  createApartmentApi, 
  updateApartmentApi, 
  deleteApartmentApi,
  approveApartmentApi,
  rejectApartmentApi,
  updateInspectionApi,
  publishInspectionApi,
  getAdminAdminsApi,
  createAdminAdminApi,
  updateAdminAdminApi,
  deleteAdminAdminApi
} from "@/lib/api-client";
import { ServiceRatingsManagement } from "./ServiceRatingsManagement";
import { NearbyAmenitiesForm } from "./NearbyAmenitiesForm";
import { 
  getAdminBookingsApi, 
  updateBookingStatusApi, 
  StudentBooking 
} from "@/lib/bookings-store";
import { useAuth } from "@/components/auth/clerk-auth";
import { StandardModal } from "@/components/ui/StandardModal";
import { NotificationBell } from "@/components/ui/NotificationBell";

function isPermanentSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "soultyou@outlook.sa" || normalized === "soultyou@outlook.com";
}

interface AdminInspectionPortalProps {
  onClose: () => void;
  openToast: (msg: string) => void;
  onViewStudentListings: () => void;
}

export function AdminInspectionPortal({
  onClose,
  openToast,
  onViewStudentListings,
}: AdminInspectionPortalProps) {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<
    "overview" | "approvals" | "properties" | "verification" | "users" | "bookings" | "inspections" | "support" | "admin_management" | "service_ratings"
  >("overview");

  // Admin Management specific states
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    fullName: "",
    email: "",
    role: "admin" as "admin" | "super_admin",
    phoneNumber: "",
    nationalId: "",
    university: "",
  });

  const loadAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      const list = await getAdminAdminsApi();
      setAdminsList(list);
    } catch (err: any) {
      openToast(err?.message || "فشل في تحميل قائمة المشرفين");
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (mainTab === "admin_management" && user?.role === "super_admin") {
      loadAdmins();
    }
  }, [mainTab, user?.role]);

  // بيانات ودعم منصة مكاني (Admin Support Management)
  const [supportConversations, setSupportConversations] = useState<SupportConversationItem[]>([]);
  const [supportCounts, setSupportCounts] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  });
  const [supportStatusFilter, setSupportStatusFilter] = useState<string>("all");
  const [supportCategoryFilter, setSupportCategoryFilter] = useState<string>("all");
  const [supportRoleFilter, setSupportRoleFilter] = useState<string>("all");
  const [supportSearchQuery, setSupportSearchQuery] = useState<string>("");
  const [selectedSupportConversation, setSelectedSupportConversation] = useState<SupportConversationItem | null>(null);
  const [replyMessageText, setReplyMessageText] = useState<string>("");
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // تصفية حالات الاعتماد والتوثيق
  const [approvalFilter, setApprovalFilter] = useState<string>("قيد المراجعة");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");

  // بيانات المستخدمين وقاعدة البيانات (طلاب وملاك ومشرفين)
  const [usersList, setUsersList] = useState<RegisteredUser[]>(() => getAllRegisteredUsers());
  const [userFilter, setUserFilter] = useState<"all" | "student" | "owner" | "admin" | "super_admin">("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // مؤشرات المنصة المستخرجة حصرياً من بيانات PostgreSQL الحقيقية
  const totalUsers = usersList.length;
  const studentUsers = usersList.filter((u) => u.role === "student").length;
  const ownerUsers = usersList.filter((u) => u.role === "owner").length;
  const adminUsers = usersList.filter((u) => u.role === "admin" || u.role === "super_admin").length;
  const verifiedUsers = usersList.filter((u) => Boolean(u.isVerified)).length;
  const pendingVerificationUsers = usersList.filter(
    (u) => !u.isVerified && Boolean(u.nationalId && u.nationalId.length === 14)
  ).length;

  // بيانات المعاينات
  const [inspections, setInspections] = useState<PropertyInspection[]>(getAllInspections());
  const [filter, setFilter] = useState<string>("all");
  const [selectedInspection, setSelectedInspection] = useState<PropertyInspection | null>(null);

  // بيانات العقارات المنشورة
  const [properties, setProperties] = useState<PlatformProperty[]>(getAllPlatformProperties());
  const [editingProperty, setEditingProperty] = useState<PlatformProperty | null>(null);
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);

  // مؤشرات العقارات
  const totalProperties = properties.length;
  const pendingProperties = properties.filter((p) => p.status === "قيد المراجعة").length;
  const approvedProperties = properties.filter((p) => p.status === "متاح").length;
  const rejectedProperties = properties.filter((p) => p.status === "مرفوض").length;
  const occupiedProperties = properties.filter((p) => p.status === "مشغول").length;

  // بيانات الحجوزات وإيصالات الدفع
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // مؤشرات الحجوزات
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === "pending_review").length;
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;
  const rejectedBookings = bookings.filter((b) => b.status === "rejected").length;

  // مؤشرات المعاينات
  const totalInspections = inspections.length;
  const pendingInspections = inspections.filter((i) => i.status === "pending" || i.status === "scheduled").length;

  // الاشتراك في أحداث تحديث قاعدة بيانات المستخدمين وجلب القائمة من السيرفر
  React.useEffect(() => {
    fetchUsersFromApi().then((users) => {
      if (Array.isArray(users) && users.length > 0) {
        setUsersList(users);
      }
    });

    const handleUsersUpdate = () => {
      setUsersList(getAllRegisteredUsers());
    };
    window.addEventListener(USERS_CHANGE_EVENT, handleUsersUpdate);
    return () => window.removeEventListener(USERS_CHANGE_EVENT, handleUsersUpdate);
  }, []);

  const refreshAdminBookings = async () => {
    try {
      const data = await getAdminBookingsApi();
      setBookings(data);
    } catch (e) {
      console.error("Failed to fetch admin bookings:", e);
    }
  };

  const refreshAdminSupport = async () => {
    try {
      const data = await getAdminSupportConversationsApi({
        status: supportStatusFilter,
        category: supportCategoryFilter,
        role: supportRoleFilter,
        search: supportSearchQuery,
      });
      setSupportConversations(data.conversations || []);
      if (data.counts) {
        setSupportCounts(data.counts);
      }
    } catch (e) {
      console.error("Failed to fetch admin support conversations:", e);
    }
  };

  useEffect(() => {
    refreshAdminBookings();
  }, []);

  useEffect(() => {
    refreshAdminSupport();
  }, [supportStatusFilter, supportCategoryFilter, supportRoleFilter, supportSearchQuery, mainTab]);

  // حقول جدولة المعاينة
  const [scheduleDate, setScheduleDate] = useState("غداً، الساعة ١٢:٠٠ ظهراً");
  const [inspectorName, setInspectorName] = useState("م. طارق سالم (فريق المعاينة)");

  // حقول تفعيل العقار بعد المعاينة الفعلية
  const [livabilityScore, setLivabilityScore] = useState<number>(93);
  const [video360Url, setVideo360Url] = useState<string>("https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4");
  const [model3dUrl, setModel3dUrl] = useState<string>("");
  const [inspectorReport, setInspectorReport] = useState<string>(
    "تمت المعاينة الميدانية الفعلية على الطبيعة. العقار نظيف، الإضاءة والتهوية ممتازة، الكهرباء والماء مستقران، وننصح باعتماده كسكن طلابي موثق."
  );

  // سبب الرفض والـ WhatsApp modal
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionModal, setActionModal] = useState<"schedule" | "activate" | "reject" | null>(null);
  const [whatsappInfoModal, setWhatsappInfoModal] = useState<{ url: string; msg: string; ownerPhone: string } | null>(null);

  const isSuperAdmin = user?.role === "super_admin";

  // إدارة تفاصيل المنطقة المحيطة للعقار الجديد
  const [newAmenities, setNewAmenities] = useState<NearbyAmenities>(() =>
    getDefaultAmenities("كفر الشيخ", "جامعة كفر الشيخ")
  );

  // إدارة وتعيين تقييمات مكاني للمنطقة المحيطة أثناء تفعيل العقار ونشره
  const [activationAmenities, setActivationAmenities] = useState<NearbyAmenities | null>(null);

  // تحديث القوائم
  const refreshAll = () => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
    fetchUsersFromApi().then((users) => setUsersList(users));
    setInspections(getAllInspections());
    setProperties(getAllPlatformProperties());
    refreshAdminBookings();
    refreshAdminSupport();
  };

  React.useEffect(() => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
  }, []);

  const filteredInspections = inspections.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  // تنفيذ جدولة المعاينة
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;

    try {
      const res = await updateInspectionApi(selectedInspection.id, {
        status: "scheduled",
        scheduledDate: scheduleDate,
        inspectorName,
      });

      scheduleInspectionVisit(selectedInspection.id, scheduleDate, inspectorName);
      openToast(`تم تحديد موعد المعاينة الميدانية: ${scheduleDate}`);

      if (res?.whatsappUrl && res?.whatsappMessage) {
        setWhatsappInfoModal({
          url: res.whatsappUrl,
          msg: res.whatsappMessage,
          ownerPhone: selectedInspection.ownerPhone || "01000000000",
        });
      }

      refreshAll();
      setActionModal(null);
    } catch (err: any) {
      console.error("Failed to schedule inspection:", err);
      // Fallback local update
      scheduleInspectionVisit(selectedInspection.id, scheduleDate, inspectorName);
      openToast(`تم تحديد موعد المعاينة الميدانية: ${scheduleDate}`);
      refreshAll();
      setActionModal(null);
    }
  };

  // تنفيذ تفعيل العقار ونشره بعد نزول المعاينة الفعلية وتصوير 360°
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;

    try {
      const amenitiesToPass = activationAmenities || getEffectiveAmenities(selectedInspection);

      const res = await publishInspectionApi(selectedInspection.id, {
        title: selectedInspection.title,
        pricePerMonth: selectedInspection.pricePerMonth,
        city: selectedInspection.city,
        address: selectedInspection.address,
        university: selectedInspection.university,
        roomType: selectedInspection.roomType,
        areaSqm: selectedInspection.areaSqm,
        bedrooms: selectedInspection.bedrooms,
        bathrooms: selectedInspection.bathrooms,
        floor: selectedInspection.floor,
        furnishing: selectedInspection.furnishing,
        video360Url: video360Url || selectedInspection.video360Url,
        model3dUrl: model3dUrl || (selectedInspection as any).model3dUrl,
        livabilityScore,
        inspectorReport,
        finalImages: selectedInspection.finalImages?.length ? selectedInspection.finalImages : selectedInspection.initialPhotos,
        nearbyAmenities: amenitiesToPass,
      });

      activateAndPublishProperty(selectedInspection.id, {
        livabilityScore,
        video360Url: video360Url || selectedInspection.video360Url,
        inspectorReport,
        nearbyAmenities: amenitiesToPass,
      });

      openToast(`🎉 تم تفعيل ونشر "${selectedInspection.title}" رسمياً للطلاب مع صور وجولة 360°!`);

      if (res?.whatsappUrl && res?.whatsappMessage) {
        setWhatsappInfoModal({
          url: res.whatsappUrl,
          msg: res.whatsappMessage,
          ownerPhone: selectedInspection.ownerPhone || "01000000000",
        });
      }

      refreshAll();
      setActionModal(null);
    } catch (err: any) {
      console.error("Failed to publish inspection:", err);
      // Fallback local activation
      activateAndPublishProperty(selectedInspection.id, {
        livabilityScore,
        video360Url,
        inspectorReport,
      });
      openToast(`🎉 تم تفعيل ونشر "${selectedInspection.title}" رسمياً للطلاب مع صور وجولة 360°!`);
      refreshAll();
      setActionModal(null);
    }
  };

  // تنفيذ الرفض
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;

    try {
      await updateInspectionApi(selectedInspection.id, {
        status: "rejected",
        rejectionReason: rejectionReason || "لم يستوفِ معايير السكن الطلابي المعتمد",
      });
    } catch (err) {
      console.warn("Reject via API failed, updating local state", err);
    }

    const res = rejectInspectionRequest(selectedInspection.id, rejectionReason || "لم يستوفِ معايير السكن الطلابي المعتمد");
    if (res) {
      openToast("تم تسجيل رفض الطلب وإبلاغ المالك بالسبب");
      refreshAll();
      setActionModal(null);
    }
  };

  // تعديل بيانات عقار منشور
  const handleSavePropertyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    updatePlatformProperty(editingProperty.id, editingProperty);
    try {
      await updateApartmentApi(editingProperty.id, {
        title: editingProperty.title,
        pricePerMonth: editingProperty.pricePerMonth,
        university: editingProperty.university,
        city: editingProperty.city,
        address: editingProperty.address,
        areaSqm: editingProperty.areaSqm,
        bedrooms: editingProperty.bedrooms,
        status: editingProperty.status,
        livabilityScore: editingProperty.livabilityScore,
        video360Url: editingProperty.video360Url,
        model3dUrl: editingProperty.model3dUrl,
        lat: editingProperty.lat,
        lng: editingProperty.lng,
        photos: editingProperty.images,
        nearbyAmenities: editingProperty.nearbyAmenities,
      });
    } catch (err) {
      console.warn("API update apartment error:", err);
    }
    openToast(`تم تحديث بيانات العقار (#${editingProperty.id}) وحفظها في قاعدة البيانات!`);
    refreshAll();
    setEditingProperty(null);
  };

  // حذف عقار من الكتالوج
  const handleDeleteProperty = async (id: number, title: string) => {
    if (confirm(`هل أنت متأكد من حذف عقار "${title}" من الكتالوج المتاح للطلاب؟`)) {
      deletePlatformProperty(id);
      try {
        await deleteApartmentApi(id);
      } catch (err) {
        console.warn("API delete apartment error:", err);
      }
      openToast(`تم حذف العقار من الكتالوج العام`);
      refreshAll();
    }
  };

  // اعتماد عقار رسمي ونشره للطلاب
  const handleApproveProperty = async (id: number, title: string) => {
    try {
      await approveApartmentApi(id);
      openToast(`تم اعتماد ونشر عقار "${title}" بنجاح للطلاب ✓`);
      refreshAll();
    } catch (err: any) {
      console.error("Failed to approve property:", err);
      openToast(err?.message || "تعذر اعتماد العقار");
    }
  };

  // رفض عقار
  const handleRejectProperty = async (id: number, title: string) => {
    try {
      await rejectApartmentApi(id);
      openToast(`تم رفض عقار "${title}"`);
      refreshAll();
    } catch (err: any) {
      console.error("Failed to reject property:", err);
      openToast(err?.message || "تعذر رفض العقار");
    }
  };

  // تغيير حالة حجز الطالب
  const handleChangeBookingStatus = async (
    bookingId: string, 
    newStatus: "confirmed" | "rejected" | "pending_review",
    notes?: string
  ) => {
    await updateBookingStatusApi(bookingId, newStatus, notes);
    openToast(newStatus === "confirmed" ? "تم تأكيد الحجز واعتماد الإيصال بنجاح ✓" : "تم تحديث حالة الحجز");
    refreshAdminBookings();
    refreshAll();
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="stealth-admin-portal">
      {/* شريط الإدارة العلوي السري */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/15 text-purple-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-foreground">
                  غرفة التحكم المركزية الشبح (Stealth Admin)
                </span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                  لوحة إدارة مخفية بالكامل
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                المعاينة الميدانية وتصوير 360° • تحديث ونشر العقارات للطلاب • مراجعة إيصالات الدفع اليدوي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => {
                onClose();
                onViewStudentListings();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              data-testid="admin-btn-preview-catalog"
            >
              <ExternalLink size={14} />
              معاينة واجهة الطلاب
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
              data-testid="admin-btn-exit"
            >
              <X size={15} />
              خروج من اللوحة
            </button>
          </div>
        </div>
      </header>

      {/* شريط التبويبات الشامل للإدارة المركزية */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl px-4 text-xs font-bold sm:px-6 lg:px-8 overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setMainTab("overview")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-overview"
          >
            <BarChart3 size={16} />
            نظرة عامة ومؤشرات المنصة
          </button>

          <button
            onClick={() => setMainTab("approvals")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "approvals"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-approvals"
          >
            <CheckCircle2 size={16} />
            مراجعة واعتماد العقارات
            {pendingProperties > 0 && (
              <span className="rounded-full bg-amber-500/20 text-amber-600 px-1.5 py-0.2 text-[10px]" data-testid="badge-pending-properties">
                {pendingProperties}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab("properties")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "properties"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-properties"
          >
            <Home size={16} />
            كتالوج العقارات ({properties.length})
          </button>

          <button
            onClick={() => setMainTab("verification")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "verification"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-verification"
          >
            <ShieldCheck size={16} />
            توثيق الحسابات
            {pendingVerificationUsers > 0 && (
              <span className="rounded-full bg-emerald-500/20 text-emerald-600 px-1.5 py-0.2 text-[10px]" data-testid="badge-pending-verifications">
                {pendingVerificationUsers}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab("users")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-users"
          >
            <Users size={16} />
            قاعدة المستخدمين ({usersList.length})
          </button>

          <button
            onClick={() => setMainTab("bookings")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "bookings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-bookings"
          >
            <CreditCard size={16} />
            الحجوزات والإيصالات ({bookings.length})
            {pendingBookings > 0 && (
              <span className="rounded-full bg-blue-500/20 text-blue-600 px-1.5 py-0.2 text-[10px]" data-testid="badge-pending-bookings">
                {pendingBookings}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab("inspections")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "inspections"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-inspections"
          >
            <Camera size={16} />
            المعاينات وتصوير 360° ({inspections.length})
            {pendingInspections > 0 && (
              <span className="rounded-full bg-purple-500/20 text-purple-600 px-1.5 py-0.2 text-[10px]">
                {pendingInspections}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab("support")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "support"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-support"
          >
            <Headphones size={16} />
            الدعم الفني والرسائل ({supportCounts.total})
            {(supportCounts.open > 0 || supportCounts.in_progress > 0) && (
              <span className="rounded-full bg-rose-500/20 text-rose-600 px-1.5 py-0.2 text-[10px]" data-testid="badge-pending-support">
                {supportCounts.open + supportCounts.in_progress}
              </span>
            )}
          </button>

           {user?.role === "super_admin" && (
            <button
              onClick={() => setMainTab("service_ratings")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
                mainTab === "service_ratings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-admin-service-ratings"
            >
              <Star size={16} />
              إدارة تقييمات الخدمات
            </button>
          )}

          {user?.role === "super_admin" && (
            <button
              onClick={() => setMainTab("admin_management")}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
                mainTab === "admin_management"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tab-admin-management"
            >
              <ShieldAlert size={16} />
              إدارة المشرفين
            </button>
          )}
        </div>
      </div>

      {/* مساحة العمل */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-right">

        {mainTab === "service_ratings" && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <ServiceRatingsManagement openToast={openToast} />
          </div>
        )}
        
        {/* التبويب 0: نظرة عامة ومؤشرات المنصة */}
        {mainTab === "overview" && (
          <div className="space-y-6" data-testid="section-admin-overview">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  لوحة المؤشرات والرقابة المركزية (Admin Overview)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  بيانات المنصة اللحظية مستخرجة مباشرة ومطابقة بنسبة ١٠٠٪ مع قاعدة بيانات PostgreSQL
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  النظام متصل وقيد التشغيل
                </span>
              </div>
            </div>

            {/* تنبيهات الإجراءات العاجلة */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pendingProperties > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs mb-1">
                    <AlertCircle size={15} />
                    <span>عقارات بانتظار الاعتماد</span>
                  </div>
                  <div className="text-xl font-black text-amber-600">{pendingProperties} عقار</div>
                  <button
                    onClick={() => setMainTab("approvals")}
                    className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
                    data-testid="admin-overview-btn-approvals"
                  >
                    مراجعة واعتماد الآن ←
                  </button>
                </div>
              )}

              {pendingBookings > 0 && (
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs mb-1">
                    <CreditCard size={15} />
                    <span>إيصالات دفع بانتظار المراجعة</span>
                  </div>
                  <div className="text-xl font-black text-blue-600">{pendingBookings} حجز</div>
                  <button
                    onClick={() => setMainTab("bookings")}
                    className="mt-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline"
                    data-testid="admin-overview-btn-bookings"
                  >
                    تدقيق الإيصالات ←
                  </button>
                </div>
              )}

              {pendingVerificationUsers > 0 && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs mb-1">
                    <ShieldCheck size={15} />
                    <span>أرقام قومية بانتظار التوثيق</span>
                  </div>
                  <div className="text-xl font-black text-emerald-600">{pendingVerificationUsers} مستخدم</div>
                  <button
                    onClick={() => setMainTab("verification")}
                    className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                    data-testid="admin-overview-btn-verifications"
                  >
                    توثيق الهويات ←
                  </button>
                </div>
              )}

              {pendingInspections > 0 && (
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-xs mb-1">
                    <Camera size={15} />
                    <span>معاينات ميدانية معلقة</span>
                  </div>
                  <div className="text-xl font-black text-purple-600">{pendingInspections} طلب</div>
                  <button
                    onClick={() => setMainTab("inspections")}
                    className="mt-2 text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline"
                    data-testid="admin-overview-btn-inspections"
                  >
                    جدولة الزيارات ←
                  </button>
                </div>
              )}

              {(supportCounts.open > 0 || supportCounts.in_progress > 0) && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs mb-1">
                    <Headphones size={15} />
                    <span>تذاكر دعم بانتظار الرد</span>
                  </div>
                  <div className="text-xl font-black text-rose-600">{supportCounts.open + supportCounts.in_progress} تذكرة</div>
                  <button
                    onClick={() => setMainTab("support")}
                    className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline"
                    data-testid="admin-overview-btn-support"
                  >
                    متابعة وتذاكر الدعم ←
                  </button>
                </div>
              )}
            </div>

            {/* الأقسام التحليلية الأربعة */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* قسم المستخدمين والتوثيق */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Users size={18} className="text-primary" />
                    <span>إحصائيات المستخدمين والتحقق من الهوية</span>
                  </div>
                  <button
                    onClick={() => setMainTab("users")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    إدارة المستخدمين
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">إجمالي المستخدمين</span>
                    <strong className="text-xl font-black text-foreground">{totalUsers}</strong>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">الطلاب</span>
                    <strong className="text-xl font-black text-primary">{studentUsers}</strong>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">ملاك العقارات</span>
                    <strong className="text-xl font-black text-emerald-600 dark:text-emerald-400">{ownerUsers}</strong>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">موثقون رسمياً</span>
                    <strong className="text-xl font-black text-emerald-600">{verifiedUsers}</strong>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">بانتظار التوثيق</span>
                    <strong className="text-xl font-black text-amber-600">{pendingVerificationUsers}</strong>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">فريق الإدارة</span>
                    <strong className="text-xl font-black text-purple-600">{adminUsers}</strong>
                  </div>
                </div>
              </div>

              {/* قسم العقارات والاعتماد */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Home size={18} className="text-primary" />
                    <span>إحصائيات العقارات وحالات الاعتماد</span>
                  </div>
                  <button
                    onClick={() => setMainTab("approvals")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    مراجعة العقارات
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">إجمالي العقارات</span>
                    <strong className="text-xl font-black text-foreground">{totalProperties}</strong>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">قيد المراجعة</span>
                    <strong className="text-xl font-black text-amber-600">{pendingProperties}</strong>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">متاح للطلاب</span>
                    <strong className="text-xl font-black text-emerald-600">{approvedProperties}</strong>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">عقارات مرفوضة</span>
                    <strong className="text-xl font-black text-rose-600">{rejectedProperties}</strong>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">مشغولة بالكامل</span>
                    <strong className="text-xl font-black text-slate-500">{occupiedProperties}</strong>
                  </div>
                </div>
              </div>

              {/* قسم الحجوزات وإيصالات الدفع */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <CreditCard size={18} className="text-primary" />
                    <span>إحصائيات الحجوزات وإيصالات التحويل</span>
                  </div>
                  <button
                    onClick={() => setMainTab("bookings")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    فحص الحجوزات
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">إجمالي الحجوزات</span>
                    <strong className="text-xl font-black text-foreground">{totalBookings}</strong>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
                    <span className="text-[11px] text-blue-700 dark:text-blue-400 block font-medium">بانتظار المراجعة</span>
                    <strong className="text-xl font-black text-blue-600">{pendingBookings}</strong>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">مؤكدة ومعتمدة</span>
                    <strong className="text-xl font-black text-emerald-600">{confirmedBookings}</strong>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">حجوزات مرفوضة</span>
                    <strong className="text-xl font-black text-rose-600">{rejectedBookings}</strong>
                  </div>
                </div>
              </div>

              {/* قسم المعاينات والجولات الافتراضية */}
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Camera size={18} className="text-primary" />
                    <span>المعاينات الميدانية وفحص 360°</span>
                  </div>
                  <button
                    onClick={() => setMainTab("inspections")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    جدول المعاينات
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <span className="text-[11px] text-muted-foreground block font-medium">إجمالي الطلبات</span>
                    <strong className="text-xl font-black text-foreground">{totalInspections}</strong>
                  </div>
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
                    <span className="text-[11px] text-purple-700 dark:text-purple-400 block font-medium">بانتظار الفحص</span>
                    <strong className="text-xl font-black text-purple-600">{pendingInspections}</strong>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">تم فحصها وتصويرها</span>
                    <strong className="text-xl font-black text-emerald-600">
                      {inspections.filter((i) => i.status === "inspected" || i.status === "approved").length}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* التبويب 1: مراجعة واعتماد العقارات */}
        {mainTab === "approvals" && (
          <div className="space-y-6" data-testid="section-admin-approvals">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-primary" />
                  مراجعة واعتماد عقارات الملاك (Property Approvals)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  التدقيق الأمني والميداني في طلبات الوحدات السكنية. لا تظهر أي وحدة للطلاب إلا بعد قرار الاعتماد الصريح من المشرف.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { id: "قيد المراجعة", label: `قيد المراجعة (${pendingProperties})` },
                  { id: "متاح", label: `معتمدة (${approvedProperties})` },
                  { id: "مرفوض", label: `مرفوضة (${rejectedProperties})` },
                  { id: "all", label: `الكل (${totalProperties})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setApprovalFilter(f.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                      approvalFilter === f.id
                        ? "bg-primary text-primary-foreground font-bold"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* شبكة العقارات المفلترة */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties
                .filter((p) => (approvalFilter === "all" ? true : p.status === approvalFilter))
                .map((prop) => (
                  <div
                    key={prop.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between"
                    data-testid={`admin-approval-card-${prop.id}`}
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden rounded-xl border border-border mb-3">
                        <img
                          src={prop.images?.[0] || "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"}
                          alt={prop.title}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                          <span className="rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-bold text-primary">
                            ID: {prop.id}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              prop.status === "متاح"
                                ? "bg-emerald-600 text-white"
                                : prop.status === "قيد المراجعة"
                                ? "bg-amber-600 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {prop.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-foreground text-sm line-clamp-1">{prop.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{prop.address} • {prop.city}</p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span>الجامعة: <strong className="text-foreground">{prop.university}</strong></span>
                        <span>الإيجار: <strong className="text-primary font-bold">{prop.pricePerMonth} ج/شهر</strong></span>
                        <span>الغرف: <strong className="text-foreground">{prop.bedrooms} غرف</strong></span>
                        <span>الحمامات: <strong className="text-foreground">{prop.bathrooms} حمام</strong></span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                      {prop.status === "قيد المراجعة" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveProperty(prop.id, prop.title)}
                            className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                            data-testid={`admin-btn-approve-${prop.id}`}
                          >
                            اعتماد ونشر للطلاب ✓
                          </button>
                          <button
                            onClick={() => handleRejectProperty(prop.id, prop.title)}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20"
                            data-testid={`admin-btn-reject-${prop.id}`}
                          >
                            رفض
                          </button>
                        </div>
                      )}

                      {prop.status === "مرفوض" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveProperty(prop.id, prop.title)}
                            className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            إعادة الاعتماد والنشر ✓
                          </button>
                        </div>
                      )}

                      {prop.status === "متاح" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectProperty(prop.id, prop.title)}
                            className="flex-1 rounded-xl border border-border py-1.5 text-xs font-semibold text-muted-foreground hover:text-rose-600"
                          >
                            سحب الاعتماد وتغيير الحالة لمرفوض
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          onClick={() => setEditingProperty(prop)}
                          className="flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <Edit3 size={13} />
                          تعديل البيانات
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(prop.id, prop.title)}
                          className="flex items-center gap-1 text-muted-foreground hover:text-destructive text-xs"
                        >
                          <Trash2 size={13} />
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {properties.filter((p) => (approvalFilter === "all" ? true : p.status === approvalFilter)).length === 0 && (
              <div className="p-8 text-center border border-dashed border-border rounded-2xl">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-foreground">لا توجد عقارات في هذا التصنيف حالياً</p>
                <p className="text-xs text-muted-foreground mt-1">جميع طلبات الملاك تمت معالجتها بدقة.</p>
              </div>
            )}
          </div>
        )}

        {/* التبويب 2: توثيق الحسابات */}
        {mainTab === "verification" && (
          <div className="space-y-6" data-testid="section-admin-verification">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  توثيق واعتماد الهوية الوطنية (Account Verification)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مطابقة بيانات الرقم القومي للمستخدمين (طلاب وملاك). التوثيق يمنح شارة الموثوقية الخضراء في المنصة.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { id: "pending", label: `بانتظار التوثيق (${pendingVerificationUsers})` },
                  { id: "verified", label: `موثق رسمي (${verifiedUsers})` },
                  { id: "unverified", label: `غير موثق (${usersList.filter((u) => !u.isVerified).length})` },
                  { id: "all", label: `الكل (${totalUsers})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setVerificationFilter(f.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                      verificationFilter === f.id
                        ? "bg-primary text-primary-foreground font-bold"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* قائمة المستخدمين الخاصة بالتوثيق */}
            <div className="grid gap-3.5">
              {usersList
                .filter((u) => {
                  if (verificationFilter === "pending") {
                    return !u.isVerified && Boolean(u.nationalId && u.nationalId.length === 14);
                  }
                  if (verificationFilter === "verified") {
                    return Boolean(u.isVerified);
                  }
                  if (verificationFilter === "unverified") {
                    return !u.isVerified;
                  }
                  return true;
                })
                .map((userItem) => (
                  <div
                    key={userItem.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-primary/40 lg:flex-row lg:items-center lg:justify-between"
                    data-testid={`verification-user-row-${userItem.id}`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black ${
                          userItem.role === "owner"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : userItem.role === "admin"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {userItem.role === "owner" ? (
                          <Building2 size={24} />
                        ) : userItem.role === "admin" ? (
                          <ShieldCheck size={24} />
                        ) : (
                          <GraduationCap size={24} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-foreground">{userItem.fullName}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              userItem.role === "super_admin"
                                ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                : userItem.role === "owner"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : userItem.role === "admin"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {userItem.role === "super_admin" ? "👑 مدير عام (Super Admin)" : userItem.role === "owner" ? "مالك عقار" : userItem.role === "admin" ? "مشرف نظام" : "طالب جامعي"}
                          </span>

                          {userItem.isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              <CheckCircle2 size={11} /> موثق رسمياً
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                              <AlertCircle size={11} /> غير موثق
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <CreditCard size={13} className="text-primary" />
                            الرقم القومي: <strong className="text-foreground tracking-wider">{userItem.nationalId || "غير مسجل"}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={13} className="text-muted-foreground" />
                            {userItem.email}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={13} className="text-muted-foreground" />
                            {userItem.phoneNumber}
                          </span>
                          {userItem.university && (
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <GraduationCap size={13} />
                              {userItem.university}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                      <a
                        href={`https://wa.me/20${userItem.phoneNumber.replace(/^0/, "")}?text=${encodeURIComponent(
                          `مرحباً ${userItem.fullName}، معك إدارة منصة مكاني للسكن الطلابي بخصوص توثيق الهوية...`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <MessageCircle size={14} />
                        <span>واتساب</span>
                      </a>

                      <button
                        onClick={async () => {
                          const updated = await toggleUserVerificationAsync(userItem.id);
                          if (updated) {
                            openToast(
                              updated.isVerified
                                ? `تم توثيق واعتماد حساب "${userItem.fullName}" بنجاح!`
                                : `تم إلغاء توثيق حساب "${userItem.fullName}".`
                            );
                            fetchUsersFromApi().then((u) => setUsersList(u));
                          } else {
                            openToast("تعذر تحديث حالة التوثيق");
                          }
                        }}
                        className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                          userItem.isVerified
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        }`}
                        data-testid={`admin-verification-toggle-${userItem.id}`}
                      >
                        <ShieldCheck size={14} />
                        <span>{userItem.isVerified ? "إلغاء التوثيق" : "توثيق واعتماد الهوية"}</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* التبويب: طلبات المعاينة وتصوير 360° */}
        {mainTab === "inspections" && (
          <div className="space-y-6" data-testid="section-admin-inspections">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">طلبات المعاينة الميدانية من الملاك</h2>
                <p className="text-xs text-muted-foreground">
                  جدولة زيارات مهندسي الفحص، تصوير الجولات الافتراضية 360°، واعتماد نشر العقار للطلاب
                </p>
              </div>

              <div className="flex items-center gap-2">
                {["all", "pending", "scheduled", "inspected", "approved", "rejected"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" && "الكل"}
                    {f === "pending" && "جديدة"}
                    {f === "scheduled" && "مجدولة"}
                    {f === "inspected" && "تم الفحص"}
                    {f === "approved" && "معتمدة ونُشرت"}
                    {f === "rejected" && "مرفوضة"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filteredInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-24 overflow-hidden rounded-xl border border-border">
                        <img
                          src={insp.initialPhotos?.[0] || insp.finalImages?.[0] || "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"}
                          alt={insp.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-primary">#{insp.id}</span>
                          <h3 className="font-bold text-foreground text-base">{insp.title}</h3>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {insp.status === "pending" ? "بانتظار الجدولة" : insp.status === "scheduled" ? "تمت الجدولة" : insp.status === "approved" ? "منشور للطلاب" : "مرفوض"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{insp.address} • المالك: {insp.ownerName} ({insp.ownerPhone})</p>
                        <p className="text-xs text-primary font-bold mt-1">المطلوب: {insp.pricePerMonth} جنيه/شهر • {insp.bedrooms} غرف</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {insp.status === "pending" && (
                        <button
                          onClick={() => {
                            setSelectedInspection(insp);
                            setActionModal("schedule");
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
                        >
                          <Calendar size={14} />
                          جدولة زيارة المعاينة
                        </button>
                      )}

                      {(insp.status === "scheduled" || insp.status === "inspected") && (
                        <button
                          onClick={() => {
                            setSelectedInspection(insp);
                            setActivationAmenities(getEffectiveAmenities(insp));
                            setActionModal("activate");
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                        >
                          <Video size={14} />
                          رفع 360° وتفعيل النشر للطلاب
                        </button>
                      )}

                      {insp.status === "approved" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 size={15} />
                          العقار منشور ويظهر للطلاب الآن
                        </span>
                      )}

                      {insp.status !== "rejected" && insp.status !== "approved" && (
                        <button
                          onClick={() => {
                            setSelectedInspection(insp);
                            setActionModal("reject");
                          }}
                          className="rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        >
                          رفض
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* التبويب 2: إدارة وتحديث العقارات المنشورة للطلاب */}
        {mainTab === "properties" && (
          <div className="space-y-6" data-testid="section-admin-properties">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">الكتالوج الفعلي المنشور للطلاب</h2>
                <p className="text-xs text-muted-foreground">
                  تعديل الأسعار، العنوان، إضافة روابط الجولة 360°، أو إضافة وحذف أي وحدة لتسمع فوراً في واجهة الطلاب
                </p>
              </div>

              <button
                onClick={() => setIsNewPropertyModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:-translate-y-0.5"
                data-testid="btn-admin-add-property"
              >
                <Plus size={16} />
                إضافة وحدة جديدة مباشرة للكتالوج
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((prop) => (
                <div
                  key={prop.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
                  data-testid={`admin-property-card-${prop.id}`}
                >
                  <div className="relative h-40 overflow-hidden rounded-xl border border-border mb-3">
                    <img
                      src={prop.images[0]}
                      alt={prop.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-wrap gap-1">
                      <span className="rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-bold text-primary">
                        ID: {prop.id}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        prop.status === "متاح"
                          ? "bg-emerald-600 text-white"
                          : prop.status === "قيد المراجعة"
                          ? "bg-amber-600 text-white"
                          : "bg-rose-600 text-white"
                      }`} data-testid={`admin-prop-status-${prop.id}`}>
                        {prop.status || "متاح"}
                      </span>
                      {prop.video360Url && (
                        <span className="rounded-md bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          360° نشط
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-foreground text-sm line-clamp-1">{prop.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{prop.address}</p>

                  {/* ملخص تفاصيل المنطقة المحيطة الحية */}
                  <div className="mt-2.5 rounded-xl border border-border/80 bg-muted/50 p-2.5 text-[11px]">
                    <div className="flex items-center justify-between font-bold text-foreground mb-1">
                      <span className="flex items-center gap-1 text-primary">
                        <MapPin size={12} />
                        كل ما تحتاجه حولك:
                      </span>
                      <span className="text-[10px] text-purple-600 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded">
                        بوابة الجامعة: {prop.nearbyAmenities?.universityGate?.distance || "٨٠٠م"} ({prop.nearbyAmenities?.universityGate?.time || "١٠ د"})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                      <span>مواصلات: <strong className="text-foreground">{prop.nearbyAmenities?.transportation?.distance || "٢٠٠م"}</strong></span>
                      <span>•</span>
                      <span>مستشفى: <strong className="text-foreground">{prop.nearbyAmenities?.hospital?.distance || "٥٠٠م"}</strong></span>
                      <span>•</span>
                      <span>صيدلية: <strong className="text-foreground">{prop.nearbyAmenities?.pharmacy?.distance || "١٥٠م"}</strong></span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                    <span className="font-bold text-primary">{prop.pricePerMonth} جنيه/شهر</span>
                    <span className="text-muted-foreground">{prop.university}</span>
                  </div>

                  {prop.status === "قيد المراجعة" && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 p-2.5 text-xs">
                      <Clock size={14} className="text-amber-600 shrink-0" />
                      <span className="text-amber-700 dark:text-amber-300 font-semibold text-[11px] flex-1">
                        عقار بانتظار قرار المراجعة والاعتماد
                      </span>
                      <button
                        onClick={() => handleApproveProperty(prop.id, prop.title)}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        data-testid={`btn-approve-prop-${prop.id}`}
                      >
                        اعتماد ونشر
                      </button>
                      <button
                        onClick={() => handleRejectProperty(prop.id, prop.title)}
                        className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors shadow-sm"
                        data-testid={`btn-reject-prop-${prop.id}`}
                      >
                        رفض
                      </button>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <button
                      onClick={() => setEditingProperty(prop)}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                      data-testid={`btn-edit-prop-${prop.id}`}
                    >
                      <Edit3 size={13} className="text-primary" />
                      تعديل وتحديث
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(prop.id, prop.title)}
                      className="flex items-center gap-1 rounded-lg border border-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      data-testid={`btn-delete-prop-${prop.id}`}
                    >
                      <Trash2 size={13} />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* التبويب 3: حجوزات الطلاب ومراجعة الإيصالات */}
        {mainTab === "bookings" && (
          <div className="space-y-6" data-testid="section-admin-bookings">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">حجوزات الطلاب وسكرين شات إيصالات الدفع</h2>
                <p className="text-xs text-muted-foreground">
                  مراجعة سكرين شات التحويل اليدوي (فودافون كاش / إنستاباي)، تأكيد الحجز للطالب، أو التواصل عبر واتساب الإدارة (01055332242)
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  data-testid={`admin-booking-row-${b.id}`}
                >
                  <div className="grid lg:grid-cols-[1.2fr_1fr_auto] gap-4 items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {b.bookingCode}
                        </span>
                        <h3 className="font-bold text-foreground text-sm">{b.studentName}</h3>
                        <span className="text-xs text-muted-foreground">({b.studentUniversity})</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        الوحدة المحجوزة: <strong className="text-foreground">{b.propertyTitle}</strong> ({b.propertyAddress})
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>الرقم القومي: <strong className="font-mono text-foreground">{b.studentNationalId}</strong></span>
                        <span>•</span>
                        <span>هاتف الطالب: <strong className="font-mono text-foreground">{b.studentPhone}</strong></span>
                        <span>•</span>
                        <span>المبلغ: <strong className="text-primary font-bold">{b.paymentAmount} جنيه</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {b.receiptImageUrl && (
                        <div
                          onClick={() => setSelectedReceiptUrl(b.receiptImageUrl || null)}
                          className="cursor-pointer group relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-border"
                        >
                          <img
                            src={b.receiptImageUrl}
                            alt="إيصال"
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={16} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-semibold block">
                          طريقة الدفع: {b.paymentMethod === "vodafone_cash" ? "فودافون كاش" : "إنستاباي"}
                        </span>
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          مرجع: {b.referenceNumber || b.senderPhone}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          تاريخ: {new Date(b.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleChangeBookingStatus(b.id, "confirmed", "تمت مراجعة الإيصال وتأكيده مع الإدارة.")}
                        className={`rounded-xl px-3 py-2 text-xs font-bold ${
                          b.status === "confirmed"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                        }`}
                      >
                        {b.status === "confirmed" ? "✓ تم التأكيد" : "تأكيد الحجز"}
                      </button>

                      {b.status !== "rejected" && (
                        <button
                          onClick={() => handleChangeBookingStatus(b.id, "rejected", "الإيصال غير واضح أو المبلغ غير مطابق")}
                          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive"
                        >
                          رفض
                        </button>
                      )}

                      <a
                        href={`https://wa.me/20${((b.studentPhone || b.student?.phoneNumber || "").replace(/^0/, ""))}?text=${encodeURIComponent(`مرحباً ${b.studentName || b.student?.fullName || "طالب"}، بخصوص حجزك (${b.bookingCode}) عبر منصة مكاني للسكن الطلابي...`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        title="مراسلة الطالب على واتساب"
                      >
                        <MessageCircle size={14} />
                        واتساب
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* التبويب 4: قاعدة بيانات المستخدمين والتوثيق (طلاب وملاك) */}
        {mainTab === "users" && (
          <div className="space-y-6" data-testid="section-admin-users">
            {/* الترويسة والتحكم */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-foreground">
                    إدارة حسابات المنصة وقاعدة البيانات
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    جدول users • تزامن حي
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  مراجعة حسابات الطلاب الجامعيين وملاك العقارات المسجلين، التحقق من الرقم القومي (14 رقماً)، وإدارة الاعتماد
                </p>
              </div>

              {/* البحث والفلاتر */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="بحث بالاسم، الرقم القومي، الهاتف، أو المدينة..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-64 rounded-xl border border-border bg-card py-2 pl-3 pr-8 text-xs outline-none focus:border-primary"
                    data-testid="input-search-users"
                  />
                  <Search size={14} className="absolute right-2.5 top-2.5 text-muted-foreground" />
                </div>

                <div className="flex items-center rounded-xl border border-border bg-card p-1 text-xs font-semibold">
                  <button
                    onClick={() => setUserFilter("all")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    الكل ({usersList.length})
                  </button>
                  <button
                    onClick={() => setUserFilter("student")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "student" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🎓 الطلاب ({usersList.filter((u) => u.role === "student").length})
                  </button>
                  <button
                    onClick={() => setUserFilter("owner")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "owner" ? "bg-emerald-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🏢 الملاك ({usersList.filter((u) => u.role === "owner").length})
                  </button>
                  <button
                    onClick={() => setUserFilter("admin")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "admin" ? "bg-amber-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🛡️ المشرفين ({usersList.filter((u) => u.role === "admin").length})
                  </button>
                </div>
              </div>
            </div>

            {/* بطاقات الإحصائيات السريعة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>إجمالي الحسابات المسجلة</span>
                  <Users size={16} className="text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground">{usersList.length}</div>
                <div className="text-[11px] text-emerald-500 font-medium mt-0.5">
                  جميع الحسابات محفوظة في قاعدة البيانات
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>الطلاب الجامعيين</span>
                  <GraduationCap size={16} className="text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {usersList.filter((u) => u.role === "student").length}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  يبحثون عن سكن موثق بجوار الجامعات
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>ملاك العقارات والوحدات</span>
                  <Building2 size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {usersList.filter((u) => u.role === "owner").length}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  عقارات بانتظار الفحص والتصوير 360°
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>حالة التوثيق القومي</span>
                  <ShieldCheck size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {usersList.filter((u) => u.isVerified).length} / {usersList.length}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  تم التحقق من بطاقة الرقم القومي المصرية
                </div>
              </div>
            </div>

            {/* قائمة المستخدمين التفصيلية */}
            <div className="grid gap-3.5">
              {usersList
                .filter((u) => {
                  if (userFilter !== "all" && u.role !== userFilter) return false;
                  if (!userSearchQuery.trim()) return true;
                  const q = userSearchQuery.toLowerCase();
                  return (
                    u.fullName.toLowerCase().includes(q) ||
                    u.nationalId.includes(q) ||
                    u.phoneNumber.includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    (u.university && u.university.toLowerCase().includes(q)) ||
                    (u.city && u.city.toLowerCase().includes(q))
                  );
                })
                .map((userItem) => (
                  <div
                    key={userItem.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-primary/40 lg:flex-row lg:items-center lg:justify-between"
                    data-testid={`user-row-${userItem.id}`}
                  >
                    {/* معلومات المستخدم الأساسية */}
                    <div className="flex items-start gap-3.5">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black ${
                        userItem.role === "owner"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : userItem.role === "admin"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-primary/15 text-primary"
                      }`}>
                        {userItem.role === "owner" ? (
                          <Building2 size={24} />
                        ) : userItem.role === "admin" ? (
                          <ShieldCheck size={24} />
                        ) : (
                          <GraduationCap size={24} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-foreground">
                            {userItem.fullName}
                          </h3>
                          
                          {/* شارة الدور */}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            userItem.role === "super_admin"
                              ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                              : userItem.role === "owner"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : userItem.role === "admin"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-primary/15 text-primary border border-primary/20"
                          }`}>
                            {userItem.role === "super_admin" && "👑 مدير عام (Super Admin)"}
                            {userItem.role === "owner" && "🏢 مالك عقار"}
                            {userItem.role === "student" && "🎓 طالب جامعي"}
                            {userItem.role === "admin" && "🛡️ مشرف النظام"}
                          </span>

                          {/* حالة التوثيق */}
                          {userItem.isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={11} /> موثق بالرقم القومي
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                              <AlertCircle size={11} /> قيد المراجعة
                            </span>
                          )}
                        </div>

                        {/* التفاصيل الإضافية */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <CreditCard size={13} className="text-primary" />
                            الرقم القومي: <strong className="text-foreground tracking-wider">{userItem.nationalId}</strong>
                          </span>

                          <span className="flex items-center gap-1">
                            <Mail size={13} className="text-muted-foreground" />
                            {userItem.email}
                          </span>

                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={13} className="text-muted-foreground" />
                            {userItem.phoneNumber}
                          </span>

                          {userItem.role === "student" && userItem.university && (
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <GraduationCap size={13} />
                              {userItem.university}
                            </span>
                          )}

                          {userItem.role === "owner" && (
                            <>
                              {userItem.city && (
                                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                  <MapPin size={13} />
                                  عقارات {userItem.city}
                                </span>
                              )}
                              {userItem.unitsCount && (
                                <span className="flex items-center gap-1 text-muted-foreground font-medium">
                                  <Building2 size={13} />
                                  {userItem.unitsCount}
                                </span>
                              )}
                              {userItem.propertyTypes && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {userItem.propertyTypes}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                      <a
                        href={`https://wa.me/20${userItem.phoneNumber.replace(/^0/, "")}?text=${encodeURIComponent(
                          `مرحباً ${userItem.fullName}، معك إدارة منصة مكاني للسكن الطلابي (MKANY)...`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        title="مراسلة واتساب"
                      >
                        <MessageCircle size={14} />
                        <span>واتساب</span>
                      </a>

                      <button
                        onClick={async () => {
                          const updated = await toggleUserVerificationAsync(userItem.id);
                          if (updated) {
                            openToast(
                              updated.isVerified
                                ? `تم توثيق واعتماد حساب "${userItem.fullName}" بنجاح!`
                                : `تم إلغاء توثيق حساب "${userItem.fullName}".`
                            );
                            setUsersList(getAllRegisteredUsers());
                          } else {
                            openToast("تعذر تحديث حالة التوثيق");
                          }
                        }}
                        className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                          userItem.isVerified
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        }`}
                        data-testid={`admin-btn-verify-user-${userItem.id}`}
                      >
                        <ShieldCheck size={14} />
                        <span>{userItem.isVerified ? "إلغاء التوثيق" : "توثيق الحساب"}</span>
                      </button>

                      {/* أزرار ترقية وسحب صلاحية المشرف للـ Super Admin */}
                      {isSuperAdmin && userItem.role !== "super_admin" && (
                        userItem.role === "admin" ? (
                          <button
                            onClick={async () => {
                              if (confirm(`هل أنت متأكد من سحب صلاحية المشرف من "${userItem.fullName}"؟`)) {
                                try {
                                  await updateUserRoleAsync(userItem.id, "student");
                                  openToast(`تم سحب صلاحية المشرف من "${userItem.fullName}" وتحويل الحساب لطالب.`);
                                  const refreshed = await fetchUsersFromApi();
                                  setUsersList(refreshed);
                                } catch (err: any) {
                                  openToast(err?.message || "فشل في سحب صلاحية المشرف");
                                }
                              }
                            }}
                            className="flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/20 transition-colors"
                            data-testid={`superadmin-btn-revoke-${userItem.id}`}
                          >
                            <ShieldAlert size={14} />
                            <span>سحب صلاحية مشرف</span>
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (confirm(`هل أنت متأكد من ترقية "${userItem.fullName}" إلى مشرف نظام (Admin)؟`)) {
                                try {
                                  await updateUserRoleAsync(userItem.id, "admin");
                                  openToast(`تمت ترقية "${userItem.fullName}" إلى مشرف نظام بنجاح!`);
                                  const refreshed = await fetchUsersFromApi();
                                  setUsersList(refreshed);
                                } catch (err: any) {
                                  openToast(err?.message || "فشل في منح صلاحية المشرف");
                                }
                              }
                            }}
                            className="flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors shadow-sm"
                            data-testid={`superadmin-btn-grant-${userItem.id}`}
                          >
                            <ShieldCheck size={14} />
                            <span>منح صلاحية مشرف</span>
                          </button>
                        )
                      )}

                      {(userItem.role !== "admin" || isSuperAdmin) && userItem.role !== "super_admin" && (
                        <button
                          onClick={async () => {
                            if (confirm(`هل أنت متأكد من رغبتك في حذف حساب "${userItem.fullName}" نهائياً من قاعدة البيانات؟`)) {
                              const ok = await deleteUserFromDbAsync(userItem.id);
                              if (ok) {
                                openToast(`تم حذف الحساب نهائياً من قاعدة البيانات`);
                                setUsersList(getAllRegisteredUsers());
                              } else {
                                openToast("تعذر حذف المستخدم");
                              }
                            }
                          }}
                          className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-colors"
                          title="حذف المستخدم نهائياً"
                          data-testid={`admin-btn-delete-user-${userItem.id}`}
                        >
                          <Trash2 size={14} />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {usersList.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  لا توجد حسابات مسجلة حالياً في قاعدة البيانات.
                </div>
              )}
            </div>
          </div>
        )}

        {/* التبويب 7: إدارة الدعم الفني وتذاكر التواصل */}
        {mainTab === "support" && (
          <div className="space-y-6" data-testid="section-admin-support">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Headphones size={20} className="text-primary" />
                  إدارة الدعم الفني وتذاكر التواصل (Admin Support Management)
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  متابعة محادثات وتذاكر الدعم بين الطلاب والملاك مع فريق إدارة مكاني الفني.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshAdminSupport()}
                  className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  تحديث البيانات ↺
                </button>
              </div>
            </div>

            {/* Counts Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-2xl border border-border bg-card p-3.5 text-right">
                <span className="text-[11px] text-muted-foreground font-semibold">إجمالي التذاكر</span>
                <strong className="block text-xl font-black text-foreground mt-0.5">{supportCounts.total}</strong>
              </div>
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-right">
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">مفتوحة (جديدة)</span>
                <strong className="block text-xl font-black text-blue-600 mt-0.5">{supportCounts.open}</strong>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-right">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">قيد المعالجة</span>
                <strong className="block text-xl font-black text-amber-600 mt-0.5">{supportCounts.in_progress}</strong>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-right">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">تم الحل</span>
                <strong className="block text-xl font-black text-emerald-600 mt-0.5">{supportCounts.resolved}</strong>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3.5 text-right">
                <span className="text-[11px] text-muted-foreground font-semibold">مغلقة</span>
                <strong className="block text-xl font-black text-slate-500 mt-0.5">{supportCounts.closed}</strong>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Status Filter */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground ml-1">الحالة:</span>
                  {[
                    { id: "all", label: "الكل" },
                    { id: "open", label: "مفتوحة" },
                    { id: "in_progress", label: "قيد المعالجة" },
                    { id: "resolved", label: "تم الحل" },
                    { id: "closed", label: "مغلقة" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setSupportStatusFilter(st.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                        supportStatusFilter === st.id
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "border border-border text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`admin-support-filter-status-${st.id}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground ml-1">المستخدم:</span>
                  <select
                    value={supportRoleFilter}
                    onChange={(e) => setSupportRoleFilter(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary"
                    data-testid="admin-support-filter-role"
                  >
                    <option value="all">الكل (طلاب وملاك)</option>
                    <option value="student">🎓 الطلاب فقط</option>
                    <option value="owner">🏢 الملاك فقط</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
                {/* Category Filter */}
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">التصنيف:</span>
                  <select
                    value={supportCategoryFilter}
                    onChange={(e) => setSupportCategoryFilter(e.target.value)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold outline-none focus:border-primary max-w-xs"
                    data-testid="admin-support-filter-category"
                  >
                    <option value="all">جميع التصنيفات</option>
                    <option value="booking">حجز السكن</option>
                    <option value="payment">الدفع والتحويلات</option>
                    <option value="property">العقارات والوحدات</option>
                    <option value="inspection">معاينة 360° وتصوير</option>
                    <option value="verification">توثيق الحساب والهوية</option>
                    <option value="account">بيانات الحساب الشخصي</option>
                    <option value="technical">مشكلة تقنية</option>
                    <option value="other">استفسارات أخرى</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute right-3 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="البحث برقم المحادثة أو الموضوع..."
                    value={supportSearchQuery}
                    onChange={(e) => setSupportSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background py-1.5 pr-8 pl-3 text-xs outline-none focus:border-primary"
                    data-testid="admin-support-search"
                  />
                </div>
              </div>
            </div>

            {/* Conversations List */}
            <div className="space-y-3">
              {supportConversations.map((conv) => {
                const statusInfo = SUPPORT_STATUS_LABELS[conv.status] || { label: conv.status, color: "bg-muted" };
                const categoryLabel = SUPPORT_CATEGORY_LABELS[conv.category] || conv.category;

                return (
                  <div
                    key={conv.id}
                    className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition-colors shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    data-testid={`admin-support-item-${conv.id}`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-purple-600 dark:text-purple-400">
                          {conv.conversationCode}
                        </span>

                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>

                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {categoryLabel}
                        </span>

                        {conv.userRole === "student" ? (
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                            🎓 طالب
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-bold">
                            🏢 مالك
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-foreground text-sm">{conv.subject}</h3>

                      {conv.user && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{conv.user.fullName}</span>
                          {conv.user.phoneNumber && (
                            <span className="font-mono">{conv.user.phoneNumber}</span>
                          )}
                          {conv.user.email && (
                            <span>{conv.user.email}</span>
                          )}
                        </div>
                      )}

                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground line-clamp-1 bg-muted/40 p-2 rounded-xl">
                          <strong className="text-foreground">{conv.lastMessage.senderName}: </strong>
                          {conv.lastMessage.body}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(conv.updatedAt).toLocaleDateString("ar-EG")}
                      </span>

                      <button
                        onClick={async () => {
                          try {
                            const fullConv = await getSupportConversationDetailsApi(conv.id);
                            setSelectedSupportConversation(fullConv);
                          } catch (e: any) {
                            openToast(e?.message || "تعذر فتح تفاصيل المحادثة");
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                        data-testid={`admin-btn-open-support-${conv.id}`}
                      >
                        <MessageCircle size={14} />
                        فتح المحادثة والرد
                      </button>
                    </div>
                  </div>
                );
              })}

              {supportConversations.length === 0 && (
                <div className="p-12 text-center border border-dashed border-border rounded-2xl space-y-2">
                  <Headphones size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="font-bold text-foreground">لا توجد محادثات دعم مطابقة للفلاتر حالياً</p>
                  <p className="text-xs text-muted-foreground">تظهر جميع التذاكر المرسلة من الطلاب والملاك فور إرسالها.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {mainTab === "admin_management" && user?.role === "super_admin" && (
          <div className="space-y-6" data-testid="section-admin-management">
            {/* Header section with add button */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
              <div>
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <ShieldAlert size={22} className="text-amber-500" />
                  إدارة طاقم المشرفين (Admin Management)
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  صلاحيات الإشراف العام لحساب **{user?.fullName}**: إضافة مشرفين جدد، تعديل الصلاحيات، وحذف الحسابات.
                </p>
              </div>

              <button
                onClick={() => {
                  setNewAdminForm({
                    fullName: "",
                    email: "",
                    role: "admin",
                    phoneNumber: "",
                    nationalId: "",
                    university: "",
                  });
                  setShowAddAdminModal(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-colors"
                data-testid="admin-management-btn-add"
              >
                <Plus size={16} />
                إضافة مشرف جديد
              </button>
            </div>

            {/* List of admins */}
            {isLoadingAdmins ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mb-3" />
                <p className="text-xs text-muted-foreground font-semibold">جاري تحميل قائمة المشرفين...</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="px-6 py-4">الاسم والبريد الإلكتروني</th>
                        <th className="px-6 py-4">رتبة الصلاحية</th>
                        <th className="px-6 py-4">رقم الهاتف</th>
                        <th className="px-6 py-4">حالة التفعيل</th>
                        <th className="px-6 py-4 text-left">التحكم والعمليات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {adminsList.map((adm) => {
                        const isPermanent = isPermanentSuperAdmin(adm.email);
                        return (
                          <tr key={adm.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                                  {adm.fullName?.charAt(0) || "M"}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                                    {adm.fullName}
                                    {isPermanent && (
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 text-amber-600 px-1.5 py-0.5 text-[9px] font-bold">
                                        ⭐ مشرف عام دائم
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground font-medium text-xs mt-0.5">{adm.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {adm.role === "super_admin" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 px-2.5 py-1 text-[10px] font-bold">
                                  مشرف عام Super Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 px-2.5 py-1 text-[10px] font-bold">
                                  مشرف Admin
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono text-muted-foreground text-xs">
                              {adm.phoneNumber || "—"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-2.5 w-2.5 rounded-full ${adm.clerkUserId ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                <span className="font-semibold text-xs">
                                  {adm.clerkUserId ? "نشط (مسجل بـ Clerk)" : "بانتظار التسجيل الأول"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-left">
                              <div className="flex items-center justify-end gap-2">
                                {/* Toggle Role option */}
                                {!isPermanent && (
                                  <button
                                    onClick={async () => {
                                      const targetRole = adm.role === "super_admin" ? "admin" : "super_admin";
                                      if (confirm(`هل أنت متأكد من تغيير رتبة "${adm.fullName}" إلى ${targetRole === "super_admin" ? "مشرف عام" : "مشرف عادي"}؟`)) {
                                        try {
                                          await updateAdminAdminApi(adm.id, { role: targetRole });
                                          openToast(`تم تغيير صلاحية "${adm.fullName}" بنجاح!`);
                                          loadAdmins();
                                        } catch (e: any) {
                                          openToast(e?.message || "فشل في تحديث الصلاحية");
                                        }
                                      }
                                    }}
                                    className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                    data-testid={`admin-btn-toggle-role-${adm.id}`}
                                  >
                                    تغيير الرتبة
                                  </button>
                                )}

                                {/* Delete option */}
                                {!isPermanent ? (
                                  <button
                                    onClick={async () => {
                                      if (confirm(`هل أنت متأكد من حذف حساب المشرف "${adm.fullName}"؟ لن يتمكن من تسجيل الدخول للوحة الإدارية.`)) {
                                        try {
                                          await deleteAdminAdminApi(adm.id);
                                          openToast("تم حذف حساب المشرف بنجاح ✓");
                                          loadAdmins();
                                        } catch (e: any) {
                                          openToast(e?.message || "فشل في حذف المشرف");
                                        }
                                      }
                                    }}
                                    className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-colors"
                                    data-testid={`admin-btn-delete-${adm.id}`}
                                  >
                                    <Trash2 size={13} />
                                    حذف
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/60 italic px-3 py-1.5">مستثنى من الحذف والترقية</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {adminsList.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground font-semibold">
                    لا توجد حسابات مشرفين مسجلة في قاعدة البيانات حالياً.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: تعديل بيانات عقار منشور */}
      <StandardModal
        isOpen={Boolean(editingProperty)}
        onClose={() => setEditingProperty(null)}
        maxWidthClassName="max-w-xl"
        title={`تعديل بيانات العقار (${editingProperty ? `#${editingProperty.id}` : ""})`}
        subtitle="التعديلات تظهر فوراً للطلاب في الواجهة الرئيسية للمنصة"
        testId="admin-modal-edit-property"
        closeButtonAriaLabel="إغلاق نافذة تعديل العقار"
      >
        {editingProperty ? (
          <div>
            <form onSubmit={handleSavePropertyEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">عنوان الوحدة (Title):</label>
                <input
                  type="text"
                  required
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">الإيجار الشهري (جنيه):</label>
                  <input
                    type="number"
                    required
                    value={editingProperty.pricePerMonth}
                    onChange={(e) => setEditingProperty({ ...editingProperty, pricePerMonth: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">الجامعة القريبة:</label>
                  <input
                    type="text"
                    required
                    value={editingProperty.university}
                    onChange={(e) => setEditingProperty({ ...editingProperty, university: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">العنوان التفصيلي:</label>
                <input
                  type="text"
                  required
                  value={editingProperty.address}
                  onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">رابط جولة الـ 360° الافتراضية:</label>
                <input
                  type="url"
                  value={editingProperty.video360Url || ""}
                  onChange={(e) => setEditingProperty({ ...editingProperty, video360Url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">رابط العرض ثلاثي الأبعاد (3D Model Presentation):</label>
                <input
                  type="url"
                  value={editingProperty.model3dUrl || ""}
                  onChange={(e) => setEditingProperty({ ...editingProperty, model3dUrl: e.target.value })}
                  placeholder="https://my.matterport.com/show/..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">خط العرض الجغرافي (Latitude):</label>
                  <input
                    type="number"
                    step="any"
                    value={editingProperty.lat || ""}
                    onChange={(e) => setEditingProperty({ ...editingProperty, lat: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="31.1128"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">خط الطول الجغرافي (Longitude):</label>
                  <input
                    type="number"
                    step="any"
                    value={editingProperty.lng || ""}
                    onChange={(e) => setEditingProperty({ ...editingProperty, lng: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="30.9392"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">المساحة (م²):</label>
                  <input
                    type="number"
                    value={editingProperty.areaSqm}
                    onChange={(e) => setEditingProperty({ ...editingProperty, areaSqm: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">مؤشر الجودة (%):</label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={editingProperty.livabilityScore}
                    onChange={(e) => setEditingProperty({ ...editingProperty, livabilityScore: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">حالة الوحدة:</label>
                  <select
                    value={editingProperty.status || "متاح"}
                    onChange={(e) => setEditingProperty({ ...editingProperty, status: e.target.value as any })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="متاح">متاح للحجز</option>
                    <option value="مشغول">مشغول / محجوز</option>
                  </select>
                </div>
              </div>

              <div className="border border-border rounded-2xl p-3.5 space-y-3 bg-muted/20">
                <label className="block font-bold text-foreground">إدارة صور وميديا العقار:</label>
                <div className="grid grid-cols-3 gap-2">
                  {editingProperty.images && editingProperty.images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-xl border border-border bg-card overflow-hidden h-20">
                      <img src={img} alt={`ميديا ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedImages = editingProperty.images.filter((_, i) => i !== idx);
                          setEditingProperty({ ...editingProperty, images: updatedImages });
                        }}
                        className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white opacity-90 hover:opacity-100 transition-opacity"
                        title="حذف الصورة"
                      >
                        <X size={10} />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white rounded px-1 text-[8px] font-mono">
                        {idx === 0 ? "الرئيسية" : `${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    id="edit-property-new-image-url"
                    placeholder="ضع رابط صورة جديد هنا واضغط إضافة"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[11px] outline-none focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && val.startsWith("http")) {
                          const current = editingProperty.images || [];
                          setEditingProperty({ ...editingProperty, images: [...current, val] });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("edit-property-new-image-url") as HTMLInputElement;
                      const val = input?.value.trim();
                      if (val && val.startsWith("http")) {
                        const current = editingProperty.images || [];
                        setEditingProperty({ ...editingProperty, images: [...current, val] });
                        input.value = "";
                      }
                    }}
                    className="rounded-xl bg-purple-600/10 hover:bg-purple-600/20 px-3.5 text-purple-700 dark:text-purple-300 font-bold text-xs"
                  >
                    إضافة
                  </button>
                </div>
              </div>

              {/* إدارة وتفاصيل المنطقة المحيطة (Nearby Amenities Control) */}
              <NearbyAmenitiesForm
                amenities={getEffectiveAmenities(editingProperty)}
                onChange={(updated) =>
                  setEditingProperty({
                    ...editingProperty,
                    nearbyAmenities: updated,
                  })
                }
                city={editingProperty.city}
                university={editingProperty.university}
              />

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow"
                >
                  حفظ وتحديث العقار الآن
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </StandardModal>

      {/* Modal: إضافة عقار جديد للكتالوج مباشرة */}
      <StandardModal
        isOpen={isNewPropertyModalOpen}
        onClose={() => setIsNewPropertyModalOpen(false)}
        maxWidthClassName="max-w-xl"
        title="إضافة سكن طلابي جديد للكتالوج"
        subtitle="سيتم نشر الوحدة وتوثيقها فوراً لتظهر أمام الطلاب"
        testId="admin-modal-new-property"
        closeButtonAriaLabel="إغلاق نافذة إضافة عقار"
      >
        <div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                const newPayload = {
                  title: form.title.value,
                  pricePerMonth: Number(form.price.value),
                  university: form.university.value,
                  city: form.university.value.replace("جامعة ", "").trim() || "القاهرة",
                  address: form.address.value,
                  areaSqm: Number(form.area.value) || 90,
                  bedrooms: Number(form.bedrooms.value) || 2,
                  bathrooms: 1,
                  floor: "الدور الثالث",
                  furnishing: "مفروش سوبر لوكس",
                  availableFrom: "فوري",
                  roomType: "شقة مشتركة للطلاب",
                  currentRoommates: 0,
                  images: [
                    form.image.value || "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  ],
                  photos: [
                    form.image.value || "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  ],
                  video360Url: form.video360.value || "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
                  verified: true,
                  premium: true,
                  livabilityScore: 94,
                  status: "متاح" as const,
                  nearbyAmenities: newAmenities,
                };

                addNewPlatformProperty(newPayload);
                try {
                  await createApartmentApi(newPayload);
                } catch (err) {
                  console.warn("API create apartment error:", err);
                }
                openToast("تمت إضافة ونشر العقار الجديد مع تفاصيل المنطقة المحيطة بنجاح!");
                refreshAll();
                setIsNewPropertyModalOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-foreground mb-1">عنوان الوحدة:</label>
                <input
                  name="title"
                  required
                  placeholder="مثال: شقة طلابية فاخرة أمام مجمع الكليات"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">الإيجار الشهري (جنيه):</label>
                  <input
                    name="price"
                    type="number"
                    required
                    placeholder="1200"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">الجامعة القريبة:</label>
                  <input
                    name="university"
                    required
                    defaultValue="جامعة كفر الشيخ"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">العنوان التفصيلي:</label>
                <input
                  name="address"
                  required
                  placeholder="شارع الاستاد، بجوار البوابة الرئيسية"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">رابط الصورة الرئيسية:</label>
                <input
                  name="image"
                  defaultValue="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">رابط جولة 360° الافتراضية:</label>
                <input
                  name="video360"
                  defaultValue="https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">المساحة (م²):</label>
                  <input
                    name="area"
                    type="number"
                    defaultValue={95}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">عدد الغرف:</label>
                  <input
                    name="bedrooms"
                    type="number"
                    defaultValue={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* إدارة وتفاصيل المنطقة المحيطة (Nearby Amenities Control) */}
              <NearbyAmenitiesForm
                amenities={newAmenities}
                onChange={setNewAmenities}
              />

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewPropertyModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow"
                >
                  نشر الوحدة للطلاب فوراً
                </button>
              </div>
            </form>
          </div>
      </StandardModal>

      {/* Modal: تكبير إيصال الدفع اليدوي */}
      <StandardModal
        isOpen={Boolean(selectedReceiptUrl)}
        onClose={() => setSelectedReceiptUrl(null)}
        maxWidthClassName="max-w-lg"
        title="صورة إيصال التحويل اليدوي"
        testId="admin-modal-receipt-preview"
        closeButtonAriaLabel="إغلاق صورة الإيصال"
      >
        <div>
          <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border">
            {selectedReceiptUrl && (
              <img src={selectedReceiptUrl} alt="إيصال" className="w-full object-contain" />
            )}
          </div>
        </div>
      </StandardModal>

      {/* Modal: جدولة المعاينة الميدانية */}
      <StandardModal
        isOpen={actionModal === "schedule" && Boolean(selectedInspection)}
        onClose={() => setActionModal(null)}
        maxWidthClassName="max-w-md"
        title="جدولة زيارة المعاينة الميدانية"
        subtitle={selectedInspection ? `تحديد موعد نزول مهندس مكاني لفحص عقار (${selectedInspection.title})` : ""}
        testId="admin-modal-schedule-inspection"
        closeButtonAriaLabel="إغلاق نافذة الجدولة"
      >
        <div>
          <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">تاريخ وموعد الزيارة:</label>
              <input
                required
                type="text"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                placeholder="مثال: غداً، الساعة ١٢:٠٠ ظهراً"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">اسم المهندس / المشرف المعاين:</label>
              <input
                required
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow"
              >
                حفظ وتأكيد الموعد
              </button>
            </div>
          </form>
        </div>
      </StandardModal>

      {/* Modal: تفعيل العقار ونشره مع 360° */}
      <StandardModal
        isOpen={actionModal === "activate" && Boolean(selectedInspection)}
        onClose={() => setActionModal(null)}
        maxWidthClassName="max-w-3xl"
        title="تفعيل الوحدة ونشرها للطلاب مع جولة 360°"
        subtitle="تأكيد فحص العقار على الطبيعة وإدخال رابط الجولة الافتراضية ومعدل الجودة لنشره فوراً في الكتالوج العام"
        testId="admin-modal-activate-inspection"
        closeButtonAriaLabel="إغلاق نافذة التفعيل"
      >
        <div>
          <div className="flex items-center gap-2 mb-3 text-emerald-600 font-bold text-xs">
            <Sparkles size={16} />
            نزول المعاينة الفعلية وتفعيل العقار
          </div>

          <form onSubmit={handleActivateSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">
                تقييم جودة المعيشة (Livability Score ٪):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={70}
                  max={99}
                  value={livabilityScore}
                  onChange={(e) => setLivabilityScore(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="rounded-lg bg-emerald-500/10 px-3 py-1 font-bold text-emerald-600 text-sm">
                  {livabilityScore}٪
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                رابط جولة الـ 360° الافتراضية (Virtual 360 Tour):
              </label>
              <div className="relative">
                <input
                  required
                  type="url"
                  value={video360Url}
                  onChange={(e) => setVideo360Url(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs pl-8 outline-none focus:border-primary"
                />
                <Video size={14} className="absolute left-2.5 top-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">رابط الجولة ثلاثية الأبعاد المصورة بمعرفة فريق مكاني</span>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                رابط العرض التفاعلي ثلاثي الأبعاد (3D Presentation Model):
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={model3dUrl}
                  onChange={(e) => setModel3dUrl(e.target.value)}
                  placeholder="https://my.matterport.com/show/..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs pl-8 outline-none focus:border-primary"
                />
                <Layers size={14} className="absolute left-2.5 top-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">رابط نموذج الـ 3D التفاعلي للمعاينة الميدانية</span>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                تقرير مهندس المعاينة الميدانية:
              </label>
              <textarea
                rows={3}
                value={inspectorReport}
                onChange={(e) => setInspectorReport(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
              />
            </div>

            {/* تقييمات مكاني وإدارة المنطقة المحيطة */}
            {selectedInspection && (
              <div className="border-t border-border pt-3">
                <NearbyAmenitiesForm
                  amenities={activationAmenities || getEffectiveAmenities(selectedInspection)}
                  onChange={(upd) => setActivationAmenities(upd)}
                  city={selectedInspection.city}
                  university={selectedInspection.university}
                  propertyLat={selectedInspection.lat ? Number(selectedInspection.lat) : undefined}
                  propertyLng={selectedInspection.lng ? Number(selectedInspection.lng) : undefined}
                />
              </div>
            )}

            <div className="rounded-xl bg-emerald-500/10 p-3 text-[11px] text-emerald-800 dark:text-emerald-300 leading-5">
              ✓ عند الضغط على "تفعيل ونشر"، سيظهر العقار مباشرة لجميع الطلاب في صفحة "اكتشف السكن" كعقار موثق بمعاينة ميدانية مع تقييمات مكاني المعتمدة للخدمات.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
              >
                <Check size={16} />
                تفعيل ونشر على المنصة للطلاب الآن
              </button>
            </div>
          </form>
        </div>
      </StandardModal>

      {/* Modal: رفض الطلب */}
      <StandardModal
        isOpen={actionModal === "reject" && Boolean(selectedInspection)}
        onClose={() => setActionModal(null)}
        maxWidthClassName="max-w-md"
        title="رفض طلب المعاينة"
        subtitle={selectedInspection ? `توضيح سبب عدم قبول عقار (${selectedInspection.title}) للمالك` : ""}
        testId="admin-modal-reject-inspection"
        closeButtonAriaLabel="إغلاق نافذة الرفض"
      >
        <div>
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">سبب الرفض:</label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: الموقع غير آمن، أو الصور لا تعكس الواقع، أو بعد المسافة عن أقرب جامعة..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-destructive"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-destructive-foreground shadow"
              >
                تأكيد الرفض
              </button>
            </div>
          </form>
        </div>
      </StandardModal>

      {/* Modal: إشعار الواتساب المباشر للمالك */}
      <StandardModal
        isOpen={Boolean(whatsappInfoModal)}
        onClose={() => setWhatsappInfoModal(null)}
        maxWidthClassName="max-w-md"
        title="📱 إرسال إشعار للمالك عبر الواتساب"
        subtitle="تم حفظ الإجراء بنجاح. يمكنك إرسال الرسالة المجهزة للمالك عبر الواتساب بنقرة واحدة."
        testId="admin-modal-whatsapp-notification"
        closeButtonAriaLabel="إغلاق إشعار الواتساب"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-right">
            <p className="font-bold text-emerald-700 dark:text-emerald-300 mb-2">نص الرسالة المجهزة للمالك:</p>
            <div className="rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
              {whatsappInfoModal?.msg}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWhatsappInfoModal(null)}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
            >
              إغلاق
            </button>
            <a
              href={whatsappInfoModal?.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWhatsappInfoModal(null)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle size={16} />
              <span>فتح تطبيق WhatsApp وإرسال الرسالة</span>
            </a>
          </div>
        </div>
      </StandardModal>

      {/* Modal: معاينة والرد على تذكرة الدعم */}
      <StandardModal
        isOpen={Boolean(selectedSupportConversation)}
        onClose={() => setSelectedSupportConversation(null)}
        maxWidthClassName="max-w-2xl"
        title={selectedSupportConversation ? `تذكرة دعم: ${selectedSupportConversation.conversationCode}` : ""}
        subtitle={selectedSupportConversation?.subject || ""}
        testId="admin-modal-support-conversation"
        closeButtonAriaLabel="إغلاق نافذة محادثة الدعم"
      >
        {selectedSupportConversation ? (
          <div className="space-y-4 text-xs text-right">
            {/* User Info & Status Control Bar */}
            <div className="rounded-2xl border border-border bg-muted/30 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">
                    {selectedSupportConversation.user?.fullName || "المستخدم"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    selectedSupportConversation.userRole === "owner" ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                  }`}>
                    {selectedSupportConversation.userRole === "owner" ? "🏢 مالك" : "🎓 طالب"}
                  </span>
                </div>

                {/* Change Status Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-muted-foreground text-xs">الحالة:</span>
                  <select
                    disabled={isUpdatingStatus}
                    value={selectedSupportConversation.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value as any;
                      setIsUpdatingStatus(true);
                      try {
                        const updated = await updateSupportStatusApi(selectedSupportConversation.id, newStatus);
                        setSelectedSupportConversation(updated);
                        openToast(`تم تغيير حالة التذكرة إلى: ${SUPPORT_STATUS_LABELS[newStatus]?.label || newStatus}`);
                        refreshAdminSupport();
                      } catch (err: any) {
                        openToast(err?.message || "تعذر تغيير حالة التذكرة");
                      } finally {
                        setIsUpdatingStatus(false);
                      }
                    }}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold outline-none focus:border-primary"
                    data-testid="admin-select-support-status"
                  >
                    <option value="open">مفتوحة (جديدة)</option>
                    <option value="in_progress">قيد المعالجة</option>
                    <option value="resolved">تم الحل</option>
                    <option value="closed">مغلقة</option>
                  </select>
                </div>
              </div>

              {/* Contact Details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-[11px] border-t border-border/50 pt-2">
                <span>التصنيف: <strong className="text-foreground">{SUPPORT_CATEGORY_LABELS[selectedSupportConversation.category] || selectedSupportConversation.category}</strong></span>
                {selectedSupportConversation.user?.email && (
                  <span>البريد: <strong className="text-foreground">{selectedSupportConversation.user.email}</strong></span>
                )}
                {selectedSupportConversation.user?.phoneNumber && (
                  <span>الهاتف: <strong className="text-foreground font-mono">{selectedSupportConversation.user.phoneNumber}</strong></span>
                )}
              </div>
            </div>

            {/* Message Thread */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto p-3 border border-border rounded-2xl bg-background">
              {selectedSupportConversation.messages?.map((msg) => {
                const isAdminMsg = msg.senderRole === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col p-3 rounded-2xl max-w-[85%] ${
                      isAdminMsg
                        ? "mr-auto bg-purple-500/10 border border-purple-500/20 text-foreground"
                        : "ml-auto bg-muted/60 border border-border text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`font-bold text-[11px] ${isAdminMsg ? "text-purple-600 dark:text-purple-400" : "text-foreground"}`}>
                        {isAdminMsg ? "🛡️ فريق دعم مكاني" : msg.senderName}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-xs">{msg.body}</p>
                  </div>
                );
              })}
            </div>

            {/* Reply Box */}
            {selectedSupportConversation.status === "closed" ? (
              <div className="p-3 text-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs">
                ⚠️ هذه التذكرة مغلقة. قم بتغيير الحالة إلى "مفتوحة" أو "قيد المعالجة" لإرسال رد جديد.
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!replyMessageText.trim() || isSendingReply) return;

                  setIsSendingReply(true);
                  try {
                    await sendSupportMessageApi(selectedSupportConversation.id, replyMessageText.trim());
                    setReplyMessageText("");
                    openToast("تم إرسال رد المشرف بنجاح ✓");
                    
                    // Refresh conversation details
                    const updated = await getSupportConversationDetailsApi(selectedSupportConversation.id);
                    setSelectedSupportConversation(updated);
                    refreshAdminSupport();
                  } catch (err: any) {
                    openToast(err?.message || "تعذر إرسال الرد");
                  } finally {
                    setIsSendingReply(false);
                  }
                }}
                className="space-y-2 pt-2 border-t border-border"
              >
                <label className="block font-bold text-foreground text-xs">إرسال رد بصفتك مشرف الدعم:</label>
                <textarea
                  required
                  rows={3}
                  value={replyMessageText}
                  onChange={(e) => setReplyMessageText(e.target.value)}
                  placeholder="اكتب رد فريق الدعم هنا..."
                  className="w-full rounded-2xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
                  data-testid="admin-input-support-reply"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyMessageText.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
                    data-testid="admin-btn-send-support-reply"
                  >
                    <Send size={14} />
                    {isSendingReply ? "جاري الإرسال..." : "إرسال الرد للمستخدم"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </StandardModal>

      {/* Modal: إضافة مشرف جديد */}
      <StandardModal
        isOpen={showAddAdminModal}
        onClose={() => setShowAddAdminModal(false)}
        maxWidthClassName="max-w-md"
        title="إضافة مشرف جديد لطاقم النظام"
        subtitle="سيتم تسجيل المشرف مسبقاً في قاعدة بيانات PostgreSQL ليتمكن من الدخول فوراً عبر Clerk"
        testId="admin-modal-add-admin"
        closeButtonAriaLabel="إغلاق نافذة إضافة مشرف"
      >
        <div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (isSavingAdmin) return;
              setIsSavingAdmin(true);

              try {
                await createAdminAdminApi({
                  fullName: newAdminForm.fullName.trim(),
                  email: newAdminForm.email.toLowerCase().trim(),
                  role: newAdminForm.role,
                  phoneNumber: newAdminForm.phoneNumber.trim() || "01000000000",
                  nationalId: newAdminForm.nationalId.trim() || "00000000000000",
                  university: newAdminForm.university.trim() || "الإدارة المركزية",
                });

                openToast(`تم تسجيل الحساب الجديد لـ "${newAdminForm.fullName}" بنجاح ✓`);
                setShowAddAdminModal(false);
                loadAdmins();
              } catch (err: any) {
                openToast(err?.message || "فشل في إنشاء حساب المشرف. ربما البريد الإلكتروني مسجل مسبقاً.");
              } finally {
                setIsSavingAdmin(false);
              }
            }}
            className="space-y-4 text-xs text-right"
          >
            <div>
              <label className="block font-bold text-foreground mb-1 text-right">الاسم الكامل للمشرف:</label>
              <input
                required
                type="text"
                value={newAdminForm.fullName}
                onChange={(e) => setNewAdminForm({ ...newAdminForm, fullName: e.target.value })}
                placeholder="مثال: أحمد محمد علي"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary text-right"
                data-testid="admin-input-fullname"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1 text-right">البريد الإلكتروني الحقيقي (Clerk Email):</label>
              <input
                required
                type="email"
                value={newAdminForm.email}
                onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                placeholder="example@outlook.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary text-left"
                data-testid="admin-input-email"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block text-right">يجب أن يتطابق البريد الإلكتروني مع البريد الذي سيسجل به المشرف عبر Clerk.</span>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1 text-right">صلاحية الدخول والتحكم:</label>
              <select
                value={newAdminForm.role}
                onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold outline-none focus:border-primary text-right"
                data-testid="admin-select-role"
              >
                <option value="admin">مشرف عادي Admin</option>
                <option value="super_admin">مشرف عام Super Admin</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-right">
              <div>
                <label className="block font-bold text-foreground mb-1">رقم الهاتف (اختياري):</label>
                <input
                  type="text"
                  value={newAdminForm.phoneNumber}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, phoneNumber: e.target.value })}
                  placeholder="01012345678"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary text-right"
                />
              </div>
              <div>
                <label className="block font-bold text-foreground mb-1">الرقم القومي (اختياري):</label>
                <input
                  type="text"
                  value={newAdminForm.nationalId}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, nationalId: e.target.value })}
                  placeholder="14 رقماً"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary text-right"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddAdminModal(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSavingAdmin}
                className="rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-600 transition-colors disabled:opacity-50"
                data-testid="admin-btn-save"
              >
                {isSavingAdmin ? "جاري الحفظ..." : "حفظ وإضافة المشرف"}
              </button>
            </div>
          </form>
        </div>
      </StandardModal>
    </div>
  );
}
