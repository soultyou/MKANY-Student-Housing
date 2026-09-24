import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
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
  RefreshCw,
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
  Image as ImageIcon,
  Headphones,
  Upload,
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
  uploadMultipleImagesApi,
  uploadSingleImageApi
} from "@/lib/api-client";
import { NearbyAmenitiesForm } from "./NearbyAmenitiesForm";
import { PropertyLocationPicker } from "@/components/map/PropertyLocationPicker";
import { 
  getAdminBookingsApi, 
  updateBookingStatusApi, 
  StudentBooking,
  buildWhatsAppAdminConfirmationUrl,
  RentPayment,
  getRentPaymentsApi,
  updateContractApi,
  approveRentPaymentApi,
  rejectRentPaymentApi,
  recordManualRentPaymentApi
} from "@/lib/bookings-store";
import { useAuth } from "@/components/auth/clerk-auth";
import { StandardModal } from "@/components/ui/StandardModal";

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
    "overview" | "approvals" | "properties" | "verification" | "users" | "bookings" | "inspections" | "support" | "reserved_properties" | "analytics"
  >("overview");

  // Reserved Properties Aggregation States
  const [reservedProperties, setReservedProperties] = useState<any[]>([]);
  const [isLoadingReserved, setIsLoadingReserved] = useState<boolean>(false);
  const [selectedReservedProperty, setSelectedReservedProperty] = useState<any | null>(null);

  const fetchReservedProperties = async () => {
    setIsLoadingReserved(true);
    try {
      const data = await apiFetch("/api/bookings/admin/properties-reservations");
      setReservedProperties(data || []);
    } catch (err) {
      console.error(err);
      openToast("خطأ أثناء الاتصال بالخادم لتحميل الشقق المحجوزة");
    } finally {
      setIsLoadingReserved(false);
    }
  };

  useEffect(() => {
    if (mainTab === "reserved_properties") {
      fetchReservedProperties();
    }
  }, [mainTab]);

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
  const adminUsers = usersList.filter((u) => u.role === "admin").length;
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

  // Unified Property & Inspection Review Workspace States
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewPrice, setReviewPrice] = useState<number>(0);
  const [reviewUniversity, setReviewUniversity] = useState("");
  const [reviewCity, setReviewCity] = useState("");
  const [reviewAddress, setReviewAddress] = useState("");
  const [reviewRoomType, setReviewRoomType] = useState("شقة كاملة");
  const [reviewAreaSqm, setReviewAreaSqm] = useState<number>(90);
  const [reviewBedrooms, setReviewBedrooms] = useState<number>(2);
  const [reviewBathrooms, setReviewBathrooms] = useState<number>(1);
  const [reviewFloor, setReviewFloor] = useState("الدور الأول");
  const [reviewFurnishing, setReviewFurnishing] = useState("مفروش سوبر لوكس");
  const [reviewDescription, setReviewDescription] = useState("");
  const [reviewLat, setReviewLat] = useState<number | undefined>(undefined);
  const [reviewLng, setReviewLng] = useState<number | undefined>(undefined);
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [reviewVideo360Url, setReviewVideo360Url] = useState("");
  const [reviewModel3dUrl, setReviewModel3dUrl] = useState("");
  const [reviewLivabilityScore, setReviewLivabilityScore] = useState<number>(95);
  const [reviewInspectorReport, setReviewInspectorReport] = useState("");
  const [reviewAmenities, setReviewAmenities] = useState<any>(null);
  const [isUploadingReviewPhotos, setIsUploadingReviewPhotos] = useState<boolean>(false);

  const openInspectionReviewModal = (insp: PropertyInspection) => {
    setSelectedInspection(insp);
    setEditingProperty(null);
    setReviewTitle(insp.title || "");
    setReviewPrice(insp.pricePerMonth || 0);
    setReviewUniversity(insp.university || "");
    setReviewCity(insp.city || "");
    setReviewAddress(insp.address || "");
    setReviewRoomType(insp.roomType || "شقة كاملة");
    setReviewAreaSqm(insp.areaSqm || 90);
    setReviewBedrooms(insp.bedrooms || 2);
    setReviewBathrooms(insp.bathrooms || 1);
    setReviewFloor(insp.floor || "الدور الأول");
    setReviewFurnishing(insp.furnishing || "مفروش سوبر لوكس");
    setReviewDescription(insp.notes || "");
    setReviewLat(insp.lat ? Number(insp.lat) : undefined);
    setReviewLng(insp.lng ? Number(insp.lng) : undefined);
    setReviewPhotos(insp.finalImages?.length ? insp.finalImages : insp.initialPhotos || []);
    setReviewVideo360Url(insp.video360Url || "");
    setReviewModel3dUrl((insp as any).model3dUrl || "");
    setReviewLivabilityScore(insp.livabilityScore || 95);
    setReviewInspectorReport(insp.inspectorReport || "");
    setReviewAmenities(getEffectiveAmenities(insp));
    setActionModal("activate");
  };

  const openPropertyReviewModal = (prop: PlatformProperty) => {
    setEditingProperty(prop);
    setSelectedInspection(null);
    setReviewTitle(prop.title || "");
    setReviewPrice(prop.pricePerMonth || 0);
    setReviewUniversity(prop.university || "");
    setReviewCity(prop.city || "");
    setReviewAddress(prop.address || "");
    setReviewRoomType(prop.roomType || "شقة كاملة");
    setReviewAreaSqm(prop.areaSqm || 90);
    setReviewBedrooms(prop.bedrooms || 2);
    setReviewBathrooms(prop.bathrooms || 1);
    setReviewFloor(prop.floor || "الدور الأول");
    setReviewFurnishing(prop.furnishing || "مفروش سوبر لوكس");
    setReviewDescription(prop.description || "");
    setReviewLat(prop.lat ? Number(prop.lat) : undefined);
    setReviewLng(prop.lng ? Number(prop.lng) : undefined);
    setReviewPhotos(prop.images || []);
    setReviewVideo360Url(prop.video360Url || "");
    setReviewModel3dUrl((prop as any).model3dUrl || "");
    setReviewLivabilityScore(prop.livabilityScore || 95);
    setReviewInspectorReport("");
    setReviewAmenities(getEffectiveAmenities(prop));
  };

  const handleReviewPhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingReviewPhotos(true);
    try {
      const fileArray = Array.from(files);
      const res = await uploadMultipleImagesApi(fileArray);
      if (res && res.urls && res.urls.length > 0) {
        setReviewPhotos((prev) => [...prev, ...res.urls]);
        openToast(`تم رفع ${res.urls.length} صور جديدة بنجاح ✨`);
      }
    } catch (err) {
      console.warn("Multiple upload failed, trying single upload fallback:", err);
      let count = 0;
      for (const file of Array.from(files)) {
        try {
          const single = await uploadSingleImageApi(file);
          if (single?.url) {
            setReviewPhotos((prev) => [...prev, single.url]);
            count++;
          }
        } catch {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setReviewPhotos((prev) => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
      if (count > 0) openToast(`تم رفع ${count} صور بنجاح`);
    } finally {
      setIsUploadingReviewPhotos(false);
    }
  };

  const handleRemoveReviewPhoto = (indexToRemove: number) => {
    setReviewPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    openToast("تم حذف الصورة من المعرض");
  };

  const handleSetCoverPhoto = (index: number) => {
    setReviewPhotos((prev) => {
      const target = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [target, ...rest];
    });
    openToast("تم تعيين الصورة كغلاف رئيسي للعقار 📸");
  };

  const handleSaveReviewOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedInspection) {
      try {
        await updateInspectionApi(selectedInspection.id, {
          title: reviewTitle,
          pricePerMonth: reviewPrice,
          city: reviewCity,
          address: reviewAddress,
          university: reviewUniversity,
          roomType: reviewRoomType,
          areaSqm: reviewAreaSqm,
          bedrooms: reviewBedrooms,
          bathrooms: reviewBathrooms,
          floor: reviewFloor,
          furnishing: reviewFurnishing,
          notes: reviewDescription,
          lat: reviewLat,
          lng: reviewLng,
          finalImages: reviewPhotos,
          video360Url: reviewVideo360Url,
          model3dUrl: reviewModel3dUrl,
          livabilityScore: reviewLivabilityScore,
          inspectorReport: reviewInspectorReport,
          nearbyAmenities: reviewAmenities,
        });
        openToast(`تم حفظ التعديلات ورابط الـ 360° بنجاح 💾 (الوحدة لا تزال قيد المراجعة ولا تظهر للطلاب حتى الاعتماد)`);
        refreshAll();
        setActionModal(null);
        setSelectedInspection(null);
      } catch (err: any) {
        console.error("Failed to save inspection review:", err);
        openToast(err?.message || "تعذر حفظ التعديلات");
      }
    } else if (editingProperty) {
      try {
        await updateApartmentApi(editingProperty.id, {
          title: reviewTitle,
          pricePerMonth: reviewPrice,
          city: reviewCity,
          address: reviewAddress,
          university: reviewUniversity,
          roomType: reviewRoomType,
          areaSqm: reviewAreaSqm,
          bedrooms: reviewBedrooms,
          bathrooms: reviewBathrooms,
          floor: reviewFloor,
          furnishing: reviewFurnishing,
          description: reviewDescription,
          lat: reviewLat,
          lng: reviewLng,
          images: reviewPhotos,
          video360Url: reviewVideo360Url,
          model3dUrl: reviewModel3dUrl,
          livabilityScore: reviewLivabilityScore,
          nearbyAmenities: reviewAmenities,
        });
        openToast(`تم حفظ التعديلات بنجاح 💾 (حالة العقار: ${editingProperty.status})`);
        refreshAll();
        setEditingProperty(null);
      } catch (err: any) {
        console.error("Failed to save property edit:", err);
        openToast(err?.message || "تعذر حفظ التعديلات");
      }
    }
  };

  const handleApproveAndPublish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!reviewLat || !reviewLng) {
      openToast("⚠️ تعذر الاعتماد والنشر: يجب تحديد موقع العقار على الخريطة أولاً!");
      return;
    }

    if (!reviewPhotos || reviewPhotos.length === 0) {
      openToast("⚠️ تعذر الاعتماد والنشر: يجب إرفاق صورة واحدة على الأقل للعقار!");
      return;
    }

    if (!reviewTitle || !reviewPrice) {
      openToast("⚠️ تعذر الاعتماد والنشر: يرجى استكمال عنوان وسعر العقار!");
      return;
    }

    if (selectedInspection) {
      try {
        const res = await publishInspectionApi(selectedInspection.id, {
          title: reviewTitle,
          pricePerMonth: reviewPrice,
          city: reviewCity,
          address: reviewAddress,
          university: reviewUniversity,
          roomType: reviewRoomType,
          areaSqm: reviewAreaSqm,
          bedrooms: reviewBedrooms,
          bathrooms: reviewBathrooms,
          floor: reviewFloor,
          furnishing: reviewFurnishing,
          notes: reviewDescription,
          lat: reviewLat,
          lng: reviewLng,
          finalImages: reviewPhotos,
          video360Url: reviewVideo360Url,
          model3dUrl: reviewModel3dUrl,
          livabilityScore: reviewLivabilityScore,
          inspectorReport: reviewInspectorReport,
          nearbyAmenities: reviewAmenities,
        });

        activateAndPublishProperty(selectedInspection.id, {
          livabilityScore: reviewLivabilityScore,
          video360Url: reviewVideo360Url,
          inspectorReport: reviewInspectorReport,
          nearbyAmenities: reviewAmenities,
        });

        openToast(`🎉 تم اعتماد ونشر "${reviewTitle}" رسمياً للطلاب!`);

        if (res?.whatsappUrl && res?.whatsappMessage) {
          setWhatsappInfoModal({
            url: res.whatsappUrl,
            msg: res.whatsappMessage,
            ownerPhone: selectedInspection.ownerPhone || "01000000000",
          });
        }

        refreshAll();
        setActionModal(null);
        setSelectedInspection(null);
      } catch (err: any) {
        console.error("Failed to publish inspection:", err);
        openToast(err?.message || "تعذر اعتماد ونشر العقار");
      }
    } else if (editingProperty) {
      try {
        await updateApartmentApi(editingProperty.id, {
          title: reviewTitle,
          pricePerMonth: reviewPrice,
          city: reviewCity,
          address: reviewAddress,
          university: reviewUniversity,
          roomType: reviewRoomType,
          areaSqm: reviewAreaSqm,
          bedrooms: reviewBedrooms,
          bathrooms: reviewBathrooms,
          floor: reviewFloor,
          furnishing: reviewFurnishing,
          description: reviewDescription,
          lat: reviewLat,
          lng: reviewLng,
          images: reviewPhotos,
          video360Url: reviewVideo360Url,
          model3dUrl: reviewModel3dUrl,
          livabilityScore: reviewLivabilityScore,
          nearbyAmenities: reviewAmenities,
          status: "متاح",
          verified: true,
        });

        await approveApartmentApi(editingProperty.id);

        openToast(`🎉 تم اعتماد ونشر "${reviewTitle}" رسمياً للطلاب!`);
        refreshAll();
        setEditingProperty(null);
      } catch (err: any) {
        console.error("Failed to approve property:", err);
        openToast(err?.message || "تعذر اعتماد ونشر العقار");
      }
    }
  };

  // مؤشرات العقارات
  const totalProperties = properties.length;
  const pendingProperties = properties.filter((p) => p.status === "قيد المراجعة").length;
  const approvedProperties = properties.filter((p) => p.status === "متاح").length;
  const rejectedProperties = properties.filter((p) => p.status === "مرفوض").length;
  const occupiedProperties = properties.filter((p) => p.status === "مشغول").length;

  // --- Financial Analytics and Accounting States ---
  const [financialAnalytics, setFinancialAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [selectedAnalyticsYear, setSelectedAnalyticsYear] = useState<string>("all");
  const [selectedAnalyticsMonth, setSelectedAnalyticsMonth] = useState<string>("all");

  const fetchFinancialAnalytics = async (year: string, month: string) => {
    setIsLoadingAnalytics(true);
    try {
      let url = "/api/admin/financial/summary";
      const params = new URLSearchParams();
      if (year !== "all") params.append("year", year);
      if (month !== "all") params.append("month", month);
      
      const queryStr = params.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }

      const data = await apiFetch(url);
      setFinancialAnalytics(data);
    } catch (err) {
      console.error(err);
      openToast("خطأ أثناء الاتصال بالخادم لتحميل التقارير المالية");
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (mainTab === "analytics") {
      fetchFinancialAnalytics(selectedAnalyticsYear, selectedAnalyticsMonth);
    }
  }, [mainTab, selectedAnalyticsYear, selectedAnalyticsMonth]);

  // بيانات الحجوزات وإيصالات الدفع
  const [bookings, setBookings] = useState<StudentBooking[]>([]);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [expandedLedgerBookingId, setExpandedLedgerBookingId] = useState<string | null>(null);

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
  
  // حقول تعديل وتأكيد موعد الحجز والمعاينة للطالب
  const [confirmingBooking, setConfirmingBooking] = useState<any | null>(null);
  const [bDate, setBDate] = useState("");
  const [bTime, setBTime] = useState("");
  const [bNotes, setBNotes] = useState("");

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
        lat: editingProperty.lat,
        lng: editingProperty.lng,
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
    notes?: string,
    appointmentDate?: string,
    appointmentTime?: string
  ) => {
    await updateBookingStatusApi(bookingId, newStatus, notes, appointmentDate, appointmentTime);
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

          <button
            onClick={() => setMainTab("reserved_properties")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "reserved_properties"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-reserved-properties"
          >
            <Home size={16} />
            🏠 الشقق المحجوزة
          </button>

          <button
            onClick={() => setMainTab("analytics")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-3.5 whitespace-nowrap transition-colors ${
              mainTab === "analytics"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-analytics"
          >
            <BarChart3 size={16} />
            📊 المحاسبة والتحليلات
          </button>
        </div>
      </div>

      {/* مساحة العمل */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-right">

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
                            onClick={() => openPropertyReviewModal(prop)}
                            className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            data-testid={`admin-btn-review-${prop.id}`}
                          >
                            <Eye size={14} />
                            مراجعة وفحص العقار
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
                            onClick={() => openPropertyReviewModal(prop)}
                            className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            إعادة مراجعة والاعتماد ✓
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
                          onClick={() => openPropertyReviewModal(prop)}
                          className="flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <Edit3 size={13} />
                          تعديل وتحديد الموقع
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

                      {(insp.status === "scheduled" || insp.status === "inspected" || insp.status === "pending") && (
                        <button
                          onClick={() => openInspectionReviewModal(insp)}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
                          data-testid={`admin-btn-review-inspection-${insp.id}`}
                        >
                          <Eye size={14} />
                          فحص ومراجعة العقار (360°)
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
                      onClick={() => openPropertyReviewModal(prop)}
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
                      {(b.appointmentDate || b.appointmentTime) && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                          {b.appointmentDate && (
                            <span>موعد المعاينة: <strong className="text-emerald-600 font-bold">{b.appointmentDate}</strong></span>
                          )}
                          {b.appointmentDate && b.appointmentTime && <span>•</span>}
                          {b.appointmentTime && (
                            <span>التوقيت: <strong className="text-emerald-600 font-bold">{b.appointmentTime}</strong></span>
                          )}
                        </div>
                      )}
                      {b.adminNotes && (
                        <p className="mt-2 text-xs text-muted-foreground italic bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                          ملاحظة الإدارة: {b.adminNotes}
                        </p>
                      )}
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
                        onClick={() => {
                          setConfirmingBooking(b);
                          setBDate(b.appointmentDate || "الإثنين، ١٥ سبتمبر ٢٠٢٤");
                          setBTime(b.appointmentTime || "الساعة ٢:٠٠ ظهراً");
                          setBNotes(b.adminNotes || "تمت مراجعة الإيصال وتأكيده مع الإدارة.");
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-bold ${
                          b.status === "confirmed"
                            ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                        }`}
                      >
                        {b.status === "confirmed" ? "تعديل الموعد / التفاصيل" : "تأكيد وجدولة الموعد"}
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
                        href={buildWhatsAppAdminConfirmationUrl(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        title="مراسلة الطالب لتأكيد موعد المعاينة"
                        data-testid={`admin-whatsapp-btn-${b.id}`}
                      >
                        <MessageCircle size={14} />
                        واتساب التأكيد
                      </a>

                      {b.status === "confirmed" && (
                        <button
                          onClick={() => setExpandedLedgerBookingId(expandedLedgerBookingId === b.id ? null : b.id)}
                          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-500/20"
                          data-testid={`btn-admin-toggle-ledger-${b.id}`}
                        >
                          {expandedLedgerBookingId === b.id ? "إغلاق الدفتر" : "إدارة العقد والدفتر المالي 📜"}
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedLedgerBookingId === b.id && (
                    <AdminBookingRentLedger
                      booking={b}
                      openToast={openToast}
                      onRefresh={() => {
                        // Triggers the overall data refresh for bookings
                        getAdminBookingsApi().then((data) => setBookings(data)).catch(console.error);
                      }}
                    />
                  )}
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

        {/* التبويب 8: الشقق المحجوزة وتفاصيل الإشغال والحاجزين */}
        {mainTab === "reserved_properties" && (
          <div className="space-y-6" data-testid="section-admin-reserved-properties">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <Home size={20} className="text-primary" />
                  الشقق المحجوزة ونظام إدارة الحاجزين
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  استعراض مباشر وموثق لجميع الشقق التي تحتوي على عمليات حجز، وسعة الإشغال، والوصول الفوري لجميع بيانات الطلاب وإيصالات اشتراكهم.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchReservedProperties}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground shadow-sm"
                >
                  تحديث البيانات ↺
                </button>
              </div>
            </div>

            {isLoadingReserved ? (
              <div className="py-20 text-center">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-2" />
                <p className="text-xs text-muted-foreground font-bold">جاري تحميل الشقق المحجوزة وتجميع بيانات الإشغال...</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reservedProperties.map((item) => {
                  const isFullyBooked = item.occupancy.isFull;
                  return (
                    <div
                      key={item.property.id}
                      className={`rounded-2xl border bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-all ${
                        isFullyBooked ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-border"
                      }`}
                      data-testid={`reserved-property-card-${item.property.id}`}
                    >
                      <div className="flex items-start justify-between" dir="rtl">
                        <div className="min-w-0 text-right">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary block w-fit mb-1.5">
                            {item.property.university}
                          </span>
                          <h3 className="font-extrabold text-foreground text-sm line-clamp-1">{item.property.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.property.address}</p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black whitespace-nowrap ${
                            isFullyBooked
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {isFullyBooked ? "مكتملة الحجز" : "متاح غرف شاغرة"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-xl text-center text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">السعة الإجمالية</span>
                          <strong className="font-bold text-foreground">{item.occupancy.capacity}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">الأماكن المشغولة</span>
                          <strong className="font-bold text-foreground">{item.occupancy.occupiedPlaces}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">المتاح</span>
                          <strong className="font-bold text-primary">{item.occupancy.availablePlaces}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs border-t border-border/60 pt-3">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-muted-foreground" />
                          <span className="font-semibold text-muted-foreground">عدد الطلاب الحاجزين:</span>
                          <strong className="text-foreground font-black">{item.bookings.length}</strong>
                        </div>

                        <button
                          onClick={() => setSelectedReservedProperty(item)}
                          className="rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all"
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    </div>
                  );
                })}

                {reservedProperties.length === 0 && (
                  <div className="col-span-full rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground space-y-2">
                    <Home size={32} className="mx-auto text-muted-foreground/60 mb-2" />
                    <p className="font-bold text-foreground">لا توجد عقارات محجوزة حالياً</p>
                    <p className="text-xs text-muted-foreground">تظهر العقارات هنا بمجرد تسجيل طلبات حجز أو إشغال عليها.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* التبويب 9: المحاسبة والتحليلات */}
        {mainTab === "analytics" && (
          <div className="space-y-6 animate-fadeIn" data-testid="section-admin-analytics" dir="rtl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  المحاسبة والتحليلات المالية والتشغيلية
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تقارير محاسبية تفصيلية مستخرجة بالكامل من قاعدة بيانات PostgreSQL الحقيقية لجميع مدفوعات الطلاب والاشتراكات ومعدلات الإشغال.
                </p>
              </div>

              {/* فلاتر مبسطة */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
                  <span className="text-[11px] font-bold text-muted-foreground">السنة:</span>
                  <select
                    value={selectedAnalyticsYear}
                    onChange={(e) => setSelectedAnalyticsYear(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold focus:ring-0 p-0 text-foreground"
                    data-testid="filter-analytics-year"
                  >
                    <option value="all">كل السنوات</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
                  <span className="text-[11px] font-bold text-muted-foreground">الشهر:</span>
                  <select
                    value={selectedAnalyticsMonth}
                    onChange={(e) => setSelectedAnalyticsMonth(e.target.value)}
                    className="bg-transparent border-0 text-xs font-bold focus:ring-0 p-0 text-foreground"
                    data-testid="filter-analytics-month"
                  >
                    <option value="all">كل الشهور</option>
                    <option value="01">يناير (01)</option>
                    <option value="02">فبراير (02)</option>
                    <option value="03">مارس (03)</option>
                    <option value="04">أبريل (04)</option>
                    <option value="05">مايو (05)</option>
                    <option value="06">يونيو (06)</option>
                    <option value="07">يوليو (07)</option>
                    <option value="08">أغسطس (08)</option>
                    <option value="09">سبتمبر (09)</option>
                    <option value="10">أكتوبر (10)</option>
                    <option value="11">نوفمبر (11)</option>
                    <option value="12">ديسمبر (12)</option>
                  </select>
                </div>

                <button
                  onClick={() => fetchFinancialAnalytics(selectedAnalyticsYear, selectedAnalyticsMonth)}
                  className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors"
                  title="تحديث البيانات"
                >
                  <RefreshCw size={14} className={isLoadingAnalytics ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {isLoadingAnalytics && !financialAnalytics ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground font-bold">جاري تحميل وتجميع المؤشرات المالية الحقيقية...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. الكروت المحاسبية العليا */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-right">
                    <span className="text-[10px] font-bold text-primary/80 uppercase">إجمالي الإيرادات</span>
                    <h4 className="text-lg font-black text-foreground mt-1">
                      {((financialAnalytics?.summary?.totalRevenue || 0)).toLocaleString("ar-EG")} <span className="text-[10px] font-normal">ج.م</span>
                    </h4>
                    <p className="text-[9px] text-muted-foreground mt-0.5">شامل الإيجار، الاشتراكات والودائع</p>
                  </div>

                  <div className="bg-card border border-border p-4 rounded-xl text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">اشتراكات مكاني</span>
                    <h4 className="text-lg font-black text-foreground mt-1">
                      {((financialAnalytics?.summary?.subscriptionRevenue || 0)).toLocaleString("ar-EG")} <span className="text-[10px] font-normal">ج.م</span>
                    </h4>
                    <p className="text-[9px] text-emerald-600 mt-0.5">الاشتراكات المعتمدة فقط</p>
                  </div>

                  <div className="bg-card border border-border p-4 rounded-xl text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">الإيجارات المحصلة</span>
                    <h4 className="text-lg font-black text-foreground mt-1">
                      {((financialAnalytics?.summary?.collectedRent || 0)).toLocaleString("ar-EG")} <span className="text-[10px] font-normal">ج.م</span>
                    </h4>
                    <p className="text-[9px] text-blue-600 mt-0.5">الدفعات المدفوعة فعلياً</p>
                  </div>

                  <div className="bg-card border border-border p-4 rounded-xl text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">الإيجارات المستحقة</span>
                    <h4 className="text-lg font-black text-foreground mt-1">
                      {((financialAnalytics?.summary?.dueRent || 0)).toLocaleString("ar-EG")} <span className="text-[10px] font-normal">ج.م</span>
                    </h4>
                    <p className="text-[9px] text-amber-600 mt-0.5">في انتظار السداد والرفع</p>
                  </div>

                  <div className="bg-card border border-border p-4 rounded-xl text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">الودائع المحصلة</span>
                    <h4 className="text-lg font-black text-foreground mt-1">
                      {((financialAnalytics?.summary?.collectedDeposit || 0)).toLocaleString("ar-EG")} <span className="text-[10px] font-normal">ج.م</span>
                    </h4>
                    <p className="text-[9px] text-indigo-600 mt-0.5">مبالغ التأمين المدفوعة</p>
                  </div>

                  <div className="bg-card border border-border p-4 rounded-xl text-right">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">أعضاء Pro</span>
                    <h4 className="text-lg font-black text-foreground mt-1 text-primary">
                      {financialAnalytics?.summary?.proUsersCount || 0} <span className="text-[10px] font-normal text-muted-foreground">عضو</span>
                    </h4>
                    <p className="text-[9px] text-muted-foreground mt-0.5">الاشتراك مقبول ومفعّل</p>
                  </div>
                </div>

                {/* الصف الثاني: الرسم البياني وتفصيل الحالات */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* الرسم البياني المحاسبي */}
                  <div className="lg:col-span-2 bg-card border border-border p-5 rounded-2xl">
                    <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-1.5">
                      <span>📈</span> الإيرادات المحصلة شهرياً بالتفصيل
                    </h3>
                    {(!financialAnalytics?.monthlyRevenueData || financialAnalytics.monthlyRevenueData.length === 0) ? (
                      <div className="py-20 text-center text-xs text-muted-foreground">لا توجد دفعات مكتملة أو اشتراكات مقبولة حالياً لعرض الرسم البياني.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-full">
                          {/* Beautiful Pure SVG Chart */}
                          <svg viewBox="0 0 600 240" className="w-full h-auto">
                            {/* Horizontal Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                              const maxVal = Math.max(...(financialAnalytics.monthlyRevenueData.map((d: any) => d.total) || [1200]));
                              const val = Math.round(maxVal * ratio);
                              const y = 190 - ratio * 150;
                              return (
                                <g key={idx}>
                                  <line x1="60" y1={y} x2="570" y2={y} stroke="var(--border)" strokeDasharray="3 3" strokeWidth="1" />
                                  <text x="50" y={y + 4} textAnchor="end" className="text-[9px] fill-muted-foreground font-mono font-black">
                                    {val.toLocaleString("ar-EG")}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Grouped stacked bars */}
                            {financialAnalytics.monthlyRevenueData.map((d: any, idx: number) => {
                              const maxVal = Math.max(...(financialAnalytics.monthlyRevenueData.map((d: any) => d.total) || [1200]));
                              const count = financialAnalytics.monthlyRevenueData.length;
                              const width = 36;
                              const gap = (480 - count * width) / (count + 1);
                              const x = 75 + idx * (width + gap);

                              const hSub = (d.subscription / maxVal) * 150;
                              const hRent = (d.rent / maxVal) * 150;
                              const hDep = (d.deposit / maxVal) * 150;

                              const ySub = 190 - hSub;
                              const yRent = ySub - hRent;
                              const yDep = yRent - hDep;

                              return (
                                <g key={idx} className="group cursor-pointer">
                                  {/* Subscriptions */}
                                  {hSub > 0 && (
                                    <rect x={x} y={ySub} width={width} height={hSub} fill="#14b8a6" className="transition-all duration-300 hover:opacity-90" />
                                  )}
                                  {/* Rents */}
                                  {hRent > 0 && (
                                    <rect x={x} y={yRent} width={width} height={hRent} fill="#3b82f6" className="transition-all duration-300 hover:opacity-90" />
                                  )}
                                  {/* Deposits */}
                                  {hDep > 0 && (
                                    <rect x={x} y={yDep} width={width} height={hDep} fill="#f59e0b" className="transition-all duration-300 hover:opacity-90" />
                                  )}

                                  {/* Month label */}
                                  <text x={x + width / 2} y="206" textAnchor="middle" className="text-[9px] fill-foreground font-bold">
                                    {(() => {
                                      const parts = d.month.split("-");
                                      const monthMap: any = {
                                        "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
                                        "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
                                        "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر"
                                      };
                                      return `${monthMap[parts[1]] || parts[1]} ${parts[0]}`;
                                    })()}
                                  </text>

                                  <title>
                                    {`إيرادات شهر ${d.month}:
إجمالي المحصل: ${d.total.toLocaleString()} ج.م
• اشتراكات مكاني: ${d.subscription.toLocaleString()} ج.م
• الإيجارات: ${d.rent.toLocaleString()} ج.م
• الودائع: ${d.deposit.toLocaleString()} ج.م`}
                                  </title>
                                </g>
                              );
                            })}

                            {/* Base Line */}
                            <line x1="60" y1="190" x2="570" y2="190" stroke="var(--border)" strokeWidth="1.5" />
                          </svg>
                        </div>

                        {/* Legends */}
                        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold text-muted-foreground border-t border-border pt-3">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-[#14b8a6]" />
                            <span>اشتراك مكاني (١,٢٠٠ ج.م)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-[#3b82f6]" />
                            <span>الإيجارات المحصلة</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded bg-[#f59e0b]" />
                            <span>الودائع المحصلة</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* تحليل حالات الدفع وسجل المعاملات */}
                  <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground mb-4 flex items-center gap-1.5">
                        <span>🔍</span> تحليل حالات الدفع المالي الشهري
                      </h3>
                      <p className="text-[11px] text-muted-foreground mb-4">
                        حالات الدفع الخاصة بالدفعات المالية المسجلة حالياً في دفتر الإيجار الشهري.
                      </p>

                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10">
                          <span className="text-xs font-bold text-emerald-700">مدفوع ومقبول ✅</span>
                          <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-500/15 px-2 py-0.5 rounded-lg">
                            {financialAnalytics?.paymentStatusCounts?.paid || 0} دفعة
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-blue-500/5 p-2.5 rounded-xl border border-blue-500/10">
                          <span className="text-xs font-bold text-blue-700">قيد المراجعة والتدقيق 🔍</span>
                          <span className="text-xs font-mono font-black text-blue-800 bg-blue-500/15 px-2 py-0.5 rounded-lg">
                            {financialAnalytics?.paymentStatusCounts?.pending_review || 0} دفعة
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
                          <span className="text-xs font-bold text-amber-700">مستحق ولم يتم الرفع ⏳</span>
                          <span className="text-xs font-mono font-black text-amber-800 bg-amber-500/15 px-2 py-0.5 rounded-lg">
                            {financialAnalytics?.paymentStatusCounts?.due || 0} دفعة
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-rose-500/5 p-2.5 rounded-xl border border-rose-500/10">
                          <span className="text-xs font-bold text-rose-700">متأخر ومتجاوز الاستحقاق ⚠️</span>
                          <span className="text-xs font-mono font-black text-rose-800 bg-rose-500/15 px-2 py-0.5 rounded-lg">
                            {financialAnalytics?.paymentStatusCounts?.overdue || 0} دفعة
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-red-500/5 p-2.5 rounded-xl border border-red-500/10">
                          <span className="text-xs font-bold text-red-700">مرفوض مع تدوين ملاحظات ❌</span>
                          <span className="text-xs font-mono font-black text-red-800 bg-red-500/15 px-2 py-0.5 rounded-lg">
                            {financialAnalytics?.paymentStatusCounts?.rejected || 0} دفعة
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border pt-3 text-[10px] text-muted-foreground leading-relaxed">
                      * يرجى العلم أن الدفعات ذات الحالة <strong>قيد المراجعة</strong> أو <strong>المرفوضة</strong> لا يتم تضمين مبالغها في الإيرادات المحصلة إلا بعد قيام المشرف باعتماد الإيصال والموافقة اليدوية عليه.
                    </div>
                  </div>
                </div>

                {/* الصف الثالث: تفصيلات الاشتراكات والإيجارات والودائع وسعة الإشغال */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* تحليلات الاشتراكات */}
                  <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                      <span className="text-[#14b8a6]">●</span> تحليلات اشتراكات مكاني
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الاشتراكات المعتمدة:</span>
                        <span className="font-bold text-foreground">{financialAnalytics?.subscription?.approvedCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الاشتراكات قيد المراجعة:</span>
                        <span className="font-bold text-foreground text-amber-600">{financialAnalytics?.subscription?.pendingCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الاشتراكات المرفوضة:</span>
                        <span className="font-bold text-foreground text-red-600">{financialAnalytics?.subscription?.rejectedCount || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">عدد أعضاء Pro النشطين:</span>
                        <span className="font-bold text-primary">{financialAnalytics?.subscription?.proMembersCount || 0}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between items-center text-xs font-black">
                        <span className="text-foreground">إيراد الاشتراكات المعتمد:</span>
                        <span className="text-[#14b8a6]">{(financialAnalytics?.subscription?.totalRevenue || 0).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* تحليلات الإيجار */}
                  <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                      <span className="text-[#3b82f6]">●</span> تحليلات الإيجارات الشهرية
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الدفعات المدفوعة:</span>
                        <span className="font-bold text-emerald-600">{financialAnalytics?.rent?.paidCount || 0} دفعة</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الدفعات قيد المراجعة:</span>
                        <span className="font-bold text-blue-600">{financialAnalytics?.rent?.pendingCount || 0} دفعة</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الدفعات المستحقة:</span>
                        <span className="font-bold text-amber-600">{financialAnalytics?.rent?.dueCount || 0} دفعة</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الدفعات المتأخرة:</span>
                        <span className="font-bold text-red-600">{financialAnalytics?.rent?.overdueCount || 0} دفعة</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between items-center text-xs font-black">
                        <span className="text-foreground">إجمالي المحصل الفعلي:</span>
                        <span className="text-primary">{(financialAnalytics?.rent?.totalCollected || 0).toLocaleString()} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* تحليلات الودائع والتأمين */}
                  <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                      <span className="text-[#f59e0b]">●</span> تحليلات مبالغ التأمين والودائع
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الودائع المحصلة بالكامل:</span>
                        <span className="font-bold text-emerald-600">{(financialAnalytics?.deposit?.totalPaid || 0).toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">الودائع المتبقية/غير المسددة:</span>
                        <span className="font-bold text-red-600">{(financialAnalytics?.deposit?.totalUnpaid || 0).toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">إجمالي مبالغ التأمين المطلوبة:</span>
                        <span className="font-bold text-foreground">{(financialAnalytics?.deposit?.totalRequired || 0).toLocaleString()} ج.م</span>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#f59e0b] h-1.5 rounded-full" 
                            style={{ 
                              width: `${(financialAnalytics?.deposit?.totalRequired || 0) > 0 
                                ? Math.round(((financialAnalytics?.deposit?.totalPaid || 0) / financialAnalytics.deposit.totalRequired) * 100) 
                                : 0}%` 
                            }} 
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>نسبة التحصيل:</span>
                          <span className="font-bold">
                            {(financialAnalytics?.deposit?.totalRequired || 0) > 0 
                              ? Math.round(((financialAnalytics?.deposit?.totalPaid || 0) / financialAnalytics.deposit.totalRequired) * 100) 
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* تحليلات إشغال السكن والعقارات */}
                  <div className="bg-card border border-border p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-black text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                      <span className="text-primary">●</span> سعة الإشغال والقدرة التشغيلية
                    </h3>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">إجمالي العقارات:</span>
                        <span className="font-bold text-foreground">{financialAnalytics?.occupancy?.totalProperties || 0} عقار</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">مكتملة الحجز:</span>
                        <span className="font-bold text-foreground">{financialAnalytics?.occupancy?.fullyBookedProperties || 0} عقار</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">شبه مشغولة/محجوزة:</span>
                        <span className="font-bold text-foreground">{financialAnalytics?.occupancy?.reservedProperties || 0} عقار</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">إجمالي الأماكن (الأسرة):</span>
                        <span className="font-bold text-foreground">{financialAnalytics?.occupancy?.totalPlaces || 0} مكان</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">الأسرة المشغولة:</span>
                        <span className="font-bold text-primary">{financialAnalytics?.occupancy?.occupiedPlaces || 0} مكان</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">الأسرة المتاحة:</span>
                        <span className="font-bold text-emerald-600">{financialAnalytics?.occupancy?.availablePlaces || 0} مكان</span>
                      </div>

                      <div className="pt-2 border-t border-border">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${financialAnalytics?.occupancy?.occupancyRate || 0}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                          <span>نسبة إشغال السكن الكلية:</span>
                          <span className="font-bold text-primary">{financialAnalytics?.occupancy?.occupancyRate || 0}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Unified Property & Inspection Review Workspace */}
      <StandardModal
        isOpen={(actionModal === "activate" && Boolean(selectedInspection)) || Boolean(editingProperty)}
        onClose={() => {
          setActionModal(null);
          setEditingProperty(null);
          setSelectedInspection(null);
        }}
        maxWidthClassName="max-w-4xl"
        title={selectedInspection ? "نافذة فحص ومراجعة طلب المعاينة والـ 360°" : "نافذة مراجعة وتعديل بيانات العقار"}
        subtitle="مراجعة وتحديث تفاصيل السكن، تحديد الموقع على الخريطة، رفع وتعديل الصور والجولة الافتراضية والخدمات المحيطة"
        testId="admin-modal-review-workspace"
        closeButtonAriaLabel="إغلاق نافذة المراجعة"
      >
        <div className="space-y-6 text-xs max-h-[80vh] overflow-y-auto px-1 pr-2">
          {/* شريط معلومات العقار/المعاينة */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Building2 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-sm">
                    {reviewTitle || "عقار بدون عنوان"}
                  </span>
                  <span className="rounded-md bg-background px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                    {selectedInspection ? `طلب معاينة #${selectedInspection.id}` : `عقار #${editingProperty?.id}`}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {reviewAddress || "لم يحدد العنوان"} • {reviewCity || "لم تحدد المدينة"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-primary/10 px-3 py-1 font-extrabold text-primary text-xs">
                {reviewPrice} جنيه / شهرياً
              </span>
              <span className="rounded-xl bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                الحالة: {selectedInspection ? selectedInspection.status : editingProperty?.status || "قيد المراجعة"}
              </span>
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* 1. البيانات الأساسية والخصائص */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5 border-b border-border pb-2">
                <FileText size={15} className="text-primary" />
                البيانات التفصيلية للشقة والخصائص الأساسية
              </h4>

              <div>
                <label className="block font-bold text-foreground mb-1">عنوان الوحدة (Title):</label>
                <input
                  type="text"
                  required
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="عنوان تسويقي واضح للعقار..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">الإيجار الشهري (جنيه):</label>
                  <input
                    type="number"
                    required
                    value={reviewPrice}
                    onChange={(e) => setReviewPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">الجامعة القريبة:</label>
                  <input
                    type="text"
                    required
                    value={reviewUniversity}
                    onChange={(e) => setReviewUniversity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">المدينة / المركز:</label>
                  <input
                    type="text"
                    required
                    value={reviewCity}
                    onChange={(e) => setReviewCity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">العنوان التفصيلي:</label>
                <input
                  type="text"
                  required
                  value={reviewAddress}
                  onChange={(e) => setReviewAddress(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">نوع السكن:</label>
                  <select
                    value={reviewRoomType}
                    onChange={(e) => setReviewRoomType(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="شقة كاملة">شقة كاملة</option>
                    <option value="استوديو">استوديو</option>
                    <option value="غرفة فردية">غرفة فردية</option>
                    <option value="غرفة مزدوجة">غرفة مزدوجة</option>
                    <option value="سرير في غرفة">سرير في غرفة</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">المساحة (م²):</label>
                  <input
                    type="number"
                    value={reviewAreaSqm}
                    onChange={(e) => setReviewAreaSqm(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">عدد الغرف:</label>
                  <input
                    type="number"
                    value={reviewBedrooms}
                    onChange={(e) => setReviewBedrooms(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">عدد الحمامات:</label>
                  <input
                    type="number"
                    value={reviewBathrooms}
                    onChange={(e) => setReviewBathrooms(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">الطابق / الدور:</label>
                  <input
                    type="text"
                    value={reviewFloor}
                    onChange={(e) => setReviewFloor(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">مستوى الفرش:</label>
                  <input
                    type="text"
                    value={reviewFurnishing}
                    onChange={(e) => setReviewFurnishing(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">الوصف والملاحظات الإضافية:</label>
                <textarea
                  rows={2}
                  value={reviewDescription}
                  onChange={(e) => setReviewDescription(e.target.value)}
                  placeholder="تفاصيل إضافية حول السكن والخدمات المتاحة..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* 2. موقع العقار على الخريطة */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                  <MapPin size={15} className="text-primary" />
                  تحديد موقع العقار الجغرافي على الخريطة (Leaflet & OpenStreetMap)
                </h4>
                {reviewLat && reviewLng ? (
                  <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    تم التحديد: ({reviewLat.toFixed(4)}, {reviewLng.toFixed(4)})
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 flex items-center gap-1">
                    <AlertCircle size={12} />
                    يحتاج تحديد الموقع
                  </span>
                )}
              </div>

              {(!reviewLat || !reviewLng) && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>⚠️ يتطلب العقار تحديد الإحداثيات الجغرافية على الخريطة. يرجى الضغط على الخريطة أو سحب الدبوس لتعيين الموقع الدقيق قبل الاعتماد.</span>
                </div>
              )}

              <PropertyLocationPicker
                initialLat={reviewLat}
                initialLng={reviewLng}
                city={reviewCity}
                university={reviewUniversity}
                onLocationChange={(coords) => {
                  setReviewLat(coords.lat);
                  setReviewLng(coords.lng);
                }}
              />
            </div>

            {/* 3. إدارة صور العقار المعروضة */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                  <ImageIcon size={15} className="text-primary" />
                  معرض صور المعاينة والعقار ({reviewPhotos.length} صورة)
                </h4>

                <label className="cursor-pointer rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary flex items-center gap-1.5 hover:bg-primary/20 transition-colors">
                  <Upload size={14} />
                  {isUploadingReviewPhotos ? "جاري الرفع..." : "إضافة صور جديدة"}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleReviewPhotosUpload}
                    disabled={isUploadingReviewPhotos}
                  />
                </label>
              </div>

              {reviewPhotos.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-border rounded-xl">
                  <ImageIcon size={28} className="mx-auto text-muted-foreground mb-1.5" />
                  <p className="font-bold text-foreground text-xs">لا توجد صور مرفقة حتى الآن</p>
                  <p className="text-[10px] text-muted-foreground">اضغط على زر "إضافة صور جديدة" لإرفاق صور المعاينة الحقيقية.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {reviewPhotos.map((photoUrl, idx) => (
                    <div key={idx} className="relative group rounded-xl border border-border overflow-hidden h-28 bg-muted">
                      <img src={photoUrl} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 right-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                          الغلاف الرئيسي 📸
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveReviewPhoto(idx)}
                            className="rounded-lg bg-rose-600 p-1 text-white hover:bg-rose-700"
                            title="حذف الصورة"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(idx)}
                            className="w-full rounded-lg bg-white/90 dark:bg-black/80 py-1 text-[9px] font-bold text-foreground hover:bg-white"
                          >
                            تعيين كغلاف رئيسي
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. الجولة الافتراضية 360° والموديل ثلاثي الأبعاد */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5 border-b border-border pb-2">
                <Video size={15} className="text-primary" />
                الجولة الافتراضية 360° والموديل ثلاثي الأبعاد (Virtual Tour & 3D Model)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    رابط جولة الـ 360° الافتراضية:
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={reviewVideo360Url}
                      onChange={(e) => setReviewVideo360Url(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs pl-8 outline-none focus:border-primary"
                    />
                    <Video size={14} className="absolute left-2.5 top-3 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">رابط الجولة التفاعلية ثلاثية الأبعاد</span>
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">
                    رابط النموذج ثلاثي الأبعاد 3D Model (اختياري):
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={reviewModel3dUrl}
                      onChange={(e) => setReviewModel3dUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs pl-8 outline-none focus:border-primary"
                    />
                    <Layers size={14} className="absolute left-2.5 top-3 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">رابط مجسم السكن المخطط 3D</span>
                </div>
              </div>
            </div>

            {/* 5. تقرير المفتش الميداني ومؤشر جودة المعيشة */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <h4 className="font-extrabold text-foreground text-xs flex items-center gap-1.5 border-b border-border pb-2">
                <ShieldCheck size={15} className="text-primary" />
                تقرير المفتش الميداني ومؤشر جودة المعيشة (Livability Score)
              </h4>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  مؤشر جودة المعيشة المعايير الميدانية (%):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={70}
                    max={99}
                    value={reviewLivabilityScore}
                    onChange={(e) => setReviewLivabilityScore(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="rounded-lg bg-emerald-500/10 px-3 py-1 font-bold text-emerald-600 text-sm">
                    {reviewLivabilityScore}٪
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  تقرير مهندس المعاينة والتدقيق الميداني:
                </label>
                <textarea
                  rows={2}
                  value={reviewInspectorReport}
                  onChange={(e) => setReviewInspectorReport(e.target.value)}
                  placeholder="ملاحظات المهندس حول السلامة، التهوية، جودة الأثاث والنظافة..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* 6. خدمات ومعالم المنطقة المحيطة */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <NearbyAmenitiesForm
                amenities={reviewAmenities || getEffectiveAmenities(selectedInspection || editingProperty)}
                onChange={(upd) => setReviewAmenities(upd)}
                city={reviewCity}
                university={reviewUniversity}
                propertyLat={reviewLat}
                propertyLng={reviewLng}
              />
            </div>

            {/* شريط الإجراءات والزرين الأساسيين */}
            <div className="sticky bottom-0 bg-background/95 backdrop-blur-md pt-3 pb-1 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setEditingProperty(null);
                  setSelectedInspection(null);
                }}
                className="w-full sm:w-auto rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                إلغاء وإغلاق
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveReviewOnly}
                  className="w-full sm:w-auto rounded-xl border border-primary/40 bg-primary/10 px-5 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  data-testid="admin-btn-save-review-only"
                >
                  <FileText size={15} />
                  حفظ التعديلات (بدون نشر)
                </button>

                <button
                  type="button"
                  onClick={handleApproveAndPublish}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow flex items-center justify-center gap-1.5"
                  data-testid="admin-btn-approve-publish-final"
                >
                  <CheckCircle2 size={16} />
                  ✅ اعتماد ونشر للطلاب
                </button>
              </div>
            </div>
          </form>
        </div>
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

      {/* Modal: تأكيد الحجز وجدولة موعد المعاينة للطالب */}
      <StandardModal
        isOpen={Boolean(confirmingBooking)}
        onClose={() => setConfirmingBooking(null)}
        maxWidthClassName="max-w-md"
        title="تأكيد الحجز وجدولة موعد المعاينة للغرفة"
        subtitle={confirmingBooking ? `تأكيد حجز الطالب (${confirmingBooking.studentName}) وتحديد موعد المعاينة النهائي` : ""}
        testId="admin-modal-confirm-booking"
        closeButtonAriaLabel="إغلاق نافذة تأكيد الحجز"
      >
        <div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!confirmingBooking) return;
              await handleChangeBookingStatus(
                confirmingBooking.id,
                "confirmed",
                bNotes || "تمت مراجعة الإيصال وتأكيده مع الإدارة.",
                bDate,
                bTime
              );
              setConfirmingBooking(null);
            }}
            className="space-y-4 text-xs text-right"
            dir="rtl"
          >
            <div>
              <label className="block font-bold text-foreground mb-1">تاريخ المعاينة الميدانية / تسليم الغرفة:</label>
              <input
                required
                type="text"
                value={bDate}
                onChange={(e) => setBDate(e.target.value)}
                placeholder="مثال: الإثنين، ١٥ سبتمبر ٢٠٢٤"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary text-right"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">وقت المعاينة الميدانية / تسليم الغرفة:</label>
              <input
                required
                type="text"
                value={bTime}
                onChange={(e) => setBTime(e.target.value)}
                placeholder="مثال: الساعة ٢:٠٠ ظهراً"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary text-right"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">ملاحظات الإدارة:</label>
              <textarea
                value={bNotes}
                onChange={(e) => setBNotes(e.target.value)}
                placeholder="مثال: تم التأكد من إيداع المبلغ المالي، يرجى الحضور في الموعد المحدد."
                className="w-full h-20 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary text-right font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingBooking(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
              >
                تأكيد واعتماد الحجز والموعد
              </button>
            </div>
          </form>
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

      {/* Modal: تفاصيل الشقة المحجوزة وقائمة الحاجزين الكاملة */}
      <StandardModal
        isOpen={Boolean(selectedReservedProperty)}
        onClose={() => setSelectedReservedProperty(null)}
        maxWidthClassName="max-w-3xl"
        title="🏠 تفاصيل إشغال العقار وقائمة جميع الحاجزين"
        subtitle={selectedReservedProperty?.property.title}
        testId="admin-modal-reserved-property-details"
        closeButtonAriaLabel="إغلاق تفاصيل الشقة المحجوزة"
      >
        {selectedReservedProperty && (
          <div className="space-y-6 text-right text-xs" dir="rtl">
            
            {/* بطاقة العقار العلوية */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {selectedReservedProperty.property.university}
                </span>
                <h3 className="text-base font-black text-foreground mt-1">{selectedReservedProperty.property.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedReservedProperty.property.address}</p>
              </div>
              <div className="space-y-1.5 border-t md:border-t-0 md:border-r border-border/60 pt-3 md:pt-0 md:pr-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">الإيجار الشهري:</span>
                  <strong className="text-foreground font-extrabold">{selectedReservedProperty.property.pricePerMonth} جنيه</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">حالة السكن:</span>
                  <strong className={selectedReservedProperty.occupancy.isFull ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>
                    {selectedReservedProperty.occupancy.isFull ? "مكتملة الحجز" : "متاح أماكن شاغرة"}
                  </strong>
                </div>
              </div>
            </div>

            {/* إحصاءات الإشغال الفعلي */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border p-3.5 bg-card">
                <span className="text-[10px] text-muted-foreground block font-bold">السعة (غرف النوم)</span>
                <strong className="text-lg font-black text-foreground block mt-0.5">{selectedReservedProperty.occupancy.capacity}</strong>
              </div>
              <div className="rounded-xl border border-border p-3.5 bg-card">
                <span className="text-[10px] text-muted-foreground block font-bold">شركاء سكن حاليين (المالك)</span>
                <strong className="text-lg font-black text-foreground block mt-0.5">{selectedReservedProperty.occupancy.currentRoommates}</strong>
              </div>
              <div className="rounded-xl border border-border p-3.5 bg-card">
                <span className="text-[10px] text-muted-foreground block font-bold">حجوزات نشطة</span>
                <strong className="text-lg font-black text-primary block mt-0.5">
                  {selectedReservedProperty.occupancy.confirmedBookings + selectedReservedProperty.occupancy.pendingBookings}
                </strong>
              </div>
              <div className="rounded-xl border border-border p-3.5 bg-card">
                <span className="text-[10px] text-muted-foreground block font-bold">الأماكن المتبقية الشاغرة</span>
                <strong className="text-lg font-black text-emerald-600 block mt-0.5">{selectedReservedProperty.occupancy.availablePlaces}</strong>
              </div>
            </div>

            {/* قائمة جميع الحاجزين */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-foreground border-b border-border pb-2 flex items-center gap-1.5">
                <Users size={16} className="text-primary" />
                قائمة جميع الطلاب الحاجزين في هذه الوحدة ({selectedReservedProperty.bookings.length})
              </h4>

              <div className="space-y-3.5 max-h-[40vh] overflow-y-auto pr-1">
                {selectedReservedProperty.bookings.map((b: any) => (
                  <div key={b.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-2 py-0.5 font-mono font-bold text-foreground">
                          {b.bookingCode}
                        </span>
                        <strong className="text-sm font-black text-foreground">{b.student.fullName}</strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-600" :
                          b.status === "pending_review" ? "bg-blue-500/10 text-blue-600" : "bg-rose-500/10 text-rose-600"
                        }`}>
                          حجز: {b.status === "confirmed" ? "مؤكد" : b.status === "pending_review" ? "تحت المراجعة" : "مرفوض"}
                        </span>

                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.subscriptionStatus === "approved" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          اشتراك مكاني: {b.subscriptionStatus === "approved" ? "مقبول" : "تحت المراجعة"}
                        </span>

                        <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                          Pro: {b.subscriptionStatus === "approved" ? "⭐ مفعّل" : "غير مفعّل"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground text-right">
                      <div>
                        <span className="text-[10px] block text-muted-foreground">رقم هاتف الطالب:</span>
                        <div className="flex items-center gap-1 mt-0.5 justify-end">
                          <strong className="text-foreground font-mono">{b.student.phoneNumber}</strong>
                          {b.student.phoneNumber && (
                            <a
                              href={`https://wa.me/${b.student.phoneNumber.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-600 inline-flex"
                              title="مراسلة عبر واتساب"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] block text-muted-foreground">تاريخ ووقت المعاينة:</span>
                        <strong className="text-foreground block mt-0.5">{b.appointmentDate} - {b.appointmentTime}</strong>
                      </div>

                      <div>
                        <span className="text-[10px] block text-muted-foreground">مبلغ اشتراك مكاني:</span>
                        <strong className="text-foreground block mt-0.5">{b.subscriptionAmount} جنيه</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-border/40 pt-2.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">حالة التأمين (الوديعة):</span>
                        <strong className="text-foreground block mt-0.5">
                          {b.depositAmount > 0 ? `${b.depositAmount} جنيه` : "يحدد لاحقاً"} ({b.depositStatus === "paid" ? "مقبول" : "غير مدفوع"})
                        </strong>
                      </div>

                      {b.subscriptionReceiptUrl && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground block">إيصال الاشتراك:</span>
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptUrl(b.subscriptionReceiptUrl)}
                            className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-[11px] font-bold"
                          >
                            <Eye size={12} />
                            عرض الإيصال
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rent Payments Ledger */}
                    {b.rentPayments && b.rentPayments.length > 0 && (
                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/40 mt-2">
                        <span className="text-[10px] font-bold text-foreground block mb-1">دفتر إيجارات الطالب (Rent Ledger):</span>
                        <div className="space-y-1 text-[10px]">
                          {b.rentPayments.map((p: any) => (
                            <div key={p.id} className="flex justify-between items-center">
                              <span>قسط شهر: {p.monthName}</span>
                              <span className={`font-mono font-bold ${p.status === "approved" ? "text-emerald-600" : "text-amber-500"}`}>
                                {p.amount} جنيه ({p.status === "approved" ? "مقبول" : "قيد المراجعة"})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {selectedReservedProperty.bookings.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    لا يوجد حوزات مضافة لهذه الشقة حالياً.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setSelectedReservedProperty(null)}
                className="rounded-xl border border-border px-5 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        )}
      </StandardModal>
    </div>
  );
}

interface AdminBookingRentLedgerProps {
  booking: StudentBooking;
  openToast: (msg: string) => void;
  onRefresh?: () => void;
}

export function AdminBookingRentLedger({ booking, openToast, onRefresh }: AdminBookingRentLedgerProps) {
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Contract parameters form
  const [startDate, setStartDate] = useState(booking.contractStartDate || "");
  const [endDate, setEndDate] = useState(booking.contractEndDate || "");
  const [depositAmount, setDepositAmount] = useState(booking.depositAmount || 0);
  const [depositStatus, setDepositStatus] = useState<"unpaid" | "partial" | "paid">(booking.depositStatus || "unpaid");
  const [handoverStatus, setHandoverStatus] = useState<"not_started" | "scheduled" | "completed">(booking.handoverStatus || "not_started");
  const [handoverDate, setHandoverDate] = useState(booking.handoverDate || "");
  const [subscriptionStatus, setSubscriptionStatus] = useState<"unpaid" | "pending_review" | "approved" | "rejected">(booking.subscriptionStatus || "unpaid");
  const [savingContract, setSavingContract] = useState(false);

  // Manual payment form state
  const [manualPayingPaymentId, setManualPayingPaymentId] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualPaidAt, setManualPaidAt] = useState<string>(new Date().toISOString().split("T")[0]);
  const [manualSource, setManualSource] = useState<string>("فودافون كاش");
  const [submittingManual, setSubmittingManual] = useState(false);

  // Receipt modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const list = await getRentPaymentsApi(booking.id);
      setPayments(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [booking.id]);

  const handleSaveContract = async () => {
    if (!startDate || !endDate) {
      openToast("يرجى تحديد تاريخ بداية ونهاية العقد لتوليد الدفعات");
      return;
    }
    setSavingContract(true);
    try {
      const res = await updateContractApi(booking.id, {
        contractStartDate: startDate,
        contractEndDate: endDate,
        depositAmount: Number(depositAmount),
        depositStatus,
        handoverStatus,
        handoverDate,
        subscriptionStatus,
      });

      if (!res) {
        throw new Error("فشل تحديث العقد");
      }

      openToast("تم حفظ العقد وتحديث جدول الدفعات بنجاح");
      fetchPayments();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      openToast(err.message || "حدث خطأ أثناء حفظ العقد");
    } finally {
      setSavingContract(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      const res = await approveRentPaymentApi(booking.id, paymentId);
      if (res) {
        openToast("تم تأكيد واعتماد دفعة الإيجار");
        fetchPayments();
      } else {
        openToast("فشل اعتماد الدفعة");
      }
    } catch (err) {
      console.error(err);
      openToast("فشل اعتماد الدفعة");
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      const res = await rejectRentPaymentApi(booking.id, paymentId);
      if (res) {
        openToast("تم رفض الإيصال وطلب إعادة الرفع من الطالب");
        fetchPayments();
      } else {
        openToast("فشل رفض الدفعة");
      }
    } catch (err) {
      console.error(err);
      openToast("فشل رفض الدفعة");
    }
  };

  const handleManualPaySubmit = async (paymentId: string) => {
    setSubmittingManual(true);
    try {
      const res = await recordManualRentPaymentApi(booking.id, paymentId, {
        amount: Number(manualAmount),
        paidAt: manualPaidAt,
        paymentSource: manualSource,
      });

      if (res) {
        openToast("تم تسجيل الدفع اليدوي بنجاح بالدفتر المالي");
        setManualPayingPaymentId(null);
        fetchPayments();
      } else {
        openToast("فشل تسجيل الدفع اليدوي");
      }
    } catch (err) {
      console.error(err);
      openToast("فشل تسجيل الدفع اليدوي");
    } finally {
      setSubmittingManual(false);
    }
  };

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
        return <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs px-2.5 py-1 rounded-lg font-bold animate-pulse">قيد المراجعة</span>;
      case "rejected":
        return <span className="bg-rose-500/15 text-rose-700 dark:text-rose-400 text-xs px-2.5 py-1 rounded-lg font-bold">مرفوض الإيصال</span>;
      case "overdue":
        return <span className="bg-red-600/15 text-red-600 dark:text-red-400 text-xs px-2.5 py-1 rounded-lg font-bold animate-pulse">متأخر</span>;
      default:
        return <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-lg font-medium">مستحق</span>;
    }
  };

  return (
    <div className="mt-4 p-5 border border-border rounded-2xl bg-muted/15 space-y-5 text-right w-full lg:col-span-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 gap-2">
        <h4 className="text-sm font-extrabold text-foreground">الدفتر المالي المركزي للوحدة السكنية 🏛️</h4>
        <span className="text-xs text-muted-foreground font-mono">طالب الحجز: {booking.studentName} | كود الحجز: {booking.bookingCode}</span>
      </div>

      {/* Contract dates editor form */}
      <div className="bg-background border border-border p-4 rounded-2xl space-y-4">
        <h5 className="text-xs font-bold text-foreground">تفاصيل عقد السكن ومبلغ وديعة الاستلام:</h5>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">تاريخ بداية العقد</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs bg-muted border border-border rounded-xl p-2 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">تاريخ نهاية العقد</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs bg-muted border border-border rounded-xl p-2 font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">قيمة وديعة التأمين (الاستردادية)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              className="w-full text-xs bg-muted border border-border rounded-xl p-2 font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">حالة سداد وديعة التأمين</label>
            <select
              value={depositStatus}
              onChange={(e) => setDepositStatus(e.target.value as any)}
              className="w-full text-xs bg-muted border border-border rounded-xl p-2 font-bold"
            >
              <option value="unpaid">غير مدفوعة (معلقة)</option>
              <option value="partial">مدفوعة جزئياً</option>
              <option value="paid">مدفوعة بالكامل ✅</option>
            </select>
          </div>
        </div>

        {/* Row 2: Mkany Subscription & Handover Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/30">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">المرحلة ١: حالة اشتراك مكاني (1200 ج.م)</label>
            <select
              value={subscriptionStatus}
              onChange={(e) => setSubscriptionStatus(e.target.value as any)}
              className="w-full text-xs bg-muted border border-border rounded-xl p-2 font-bold"
            >
              <option value="unpaid">غير مدفوع</option>
              <option value="pending_review">قيد المراجعة ⏳</option>
              <option value="approved">مقبول ومفعّل Pro ⭐</option>
              <option value="rejected">مرفوض</option>
            </select>
            {booking.receiptImageUrl && (
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(booking.receiptImageUrl || null)}
                className="text-[10px] text-primary hover:underline mt-1 font-bold block text-right"
              >
                🔍 معاينة إيصال الاشتراك المرفوع
              </button>
            )}
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">المرحلة ٢: حالة تسليم الشقة والمفاتيح</label>
            <select
              value={handoverStatus}
              onChange={(e) => setHandoverStatus(e.target.value as any)}
              className="w-full text-xs bg-muted border border-border rounded-xl p-2 font-bold"
            >
              <option value="not_started">لم تبدأ بعد</option>
              <option value="scheduled">مجدولة للتسليم 📅</option>
              <option value="completed">تم تسليم المفاتيح بنجاح 🔑</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">تاريخ تسليم الشقة الفعلي</label>
            <input
              type="date"
              value={handoverDate}
              onChange={(e) => setHandoverDate(e.target.value)}
              className="w-full text-xs bg-muted border border-border rounded-xl p-2 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/50">
          <button
            onClick={handleSaveContract}
            disabled={savingContract}
            className="text-xs bg-primary hover:bg-primary-hover text-white font-extrabold px-4 py-2 rounded-xl shadow"
          >
            {savingContract ? "جاري الحفظ..." : "حفظ تفاصيل العقد وتوليد الدفعات المركزية 🔄"}
          </button>
        </div>
      </div>

      {/* Render monthly rent schedule */}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center">جاري تحميل كشف الإيجارات...</p>
      ) : (
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-foreground">جدول الدفعات وإيصالات المراجعة بالدفتر:</h5>

          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا يوجد دفعات نشطة. يرجى ملء تواريخ العقد أعلاه لحفظ وتوليد الدفعات.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3">الشهر</th>
                      <th className="p-3">المبلغ المستحق</th>
                      <th className="p-3">تاريخ الاستحقاق</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراء المالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/5">
                        <td className="p-3 font-semibold text-xs">{p.billingPeriod}</td>
                        <td className="p-3 font-bold text-xs text-primary">{p.amount} جنيه</td>
                        <td className="p-3 text-xs font-mono">{p.dueDate}</td>
                        <td className="p-3">{getPaymentStatusBadge(p.status)}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-2 items-center justify-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {p.receiptImageUrl && (
                                <button
                                  onClick={() => setPreviewReceiptUrl(p.receiptImageUrl || null)}
                                  className="text-[10px] bg-muted hover:bg-muted/80 text-foreground px-2 py-1 rounded-lg border border-border font-medium flex items-center gap-1"
                                >
                                  <ImageIcon size={10} />
                                  معاينة الإيصال
                                </button>
                              )}

                              {p.status === "pending_review" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(p.id)}
                                    className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg font-bold"
                                  >
                                    قبول واعتماد
                                  </button>
                                  <button
                                    onClick={() => handleReject(p.id)}
                                    className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded-lg font-bold"
                                  >
                                    رفض
                                  </button>
                                </>
                              )}

                              {p.status !== "paid" && (
                                <button
                                  onClick={() => {
                                    setManualPayingPaymentId(manualPayingPaymentId === p.id ? null : p.id);
                                    setManualAmount(p.amount);
                                  }}
                                  className="text-[10px] bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-0.5"
                                >
                                  تسجيل الدفع يدويًا 💳
                                </button>
                              )}
                            </div>

                            {/* Manual payment drawer */}
                            {manualPayingPaymentId === p.id && (
                              <div className="w-full max-w-sm border border-purple-500/20 bg-purple-500/5 p-3 rounded-xl space-y-2 mt-2 text-right">
                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">تسجيل سداد يدوي (بدون إيصال طالب):</span>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div>
                                    <label className="text-[8px] text-muted-foreground block">القيمة الفعلية</label>
                                    <input
                                      type="number"
                                      value={manualAmount}
                                      onChange={(e) => setManualAmount(Number(e.target.value))}
                                      className="w-full text-[10px] bg-background border border-border p-1 rounded font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-muted-foreground block">وسيلة الدفع</label>
                                    <input
                                      type="text"
                                      value={manualSource}
                                      onChange={(e) => setManualSource(e.target.value)}
                                      placeholder="مثال: كاش للآدمن"
                                      className="w-full text-[10px] bg-background border border-border p-1 rounded font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] text-muted-foreground block">تاريخ الدفع</label>
                                    <input
                                      type="date"
                                      value={manualPaidAt}
                                      onChange={(e) => setManualPaidAt(e.target.value)}
                                      className="w-full text-[10px] bg-background border border-border p-1 rounded font-mono"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => setManualPayingPaymentId(null)}
                                    className="text-[8px] bg-background border px-2 py-1 rounded"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    onClick={() => handleManualPaySubmit(p.id)}
                                    disabled={submittingManual}
                                    className="text-[8px] bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded font-bold"
                                  >
                                    {submittingManual ? "جاري..." : "تأكيد الدفع"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview rent receipt modal */}
      <StandardModal
        isOpen={Boolean(previewReceiptUrl)}
        onClose={() => setPreviewReceiptUrl(null)}
        maxWidthClassName="max-w-lg"
        title="معاينة إيصال الدفع الشهري المرفوع"
        closeButtonAriaLabel="إغلاق معاينة الإيصال"
      >
        <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border">
          {previewReceiptUrl && (
            <img src={previewReceiptUrl} alt="إيصال" className="w-full object-contain mx-auto" />
          )}
        </div>
      </StandardModal>
    </div>
  );
}
