import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileQuestion,
  UserCheck,
  Building,
  Info,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  SupportConversationItem,
  SupportMessageItem,
  getMySupportConversationsApi,
  getSupportConversationDetailsApi,
  createSupportConversationApi,
  sendSupportMessageApi,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
} from "@/lib/support-store";

interface SupportCenterProps {
  role: "student" | "owner";
  openToast: (msg: string) => void;
  onClose?: () => void;
}

export function SupportCenter({ role, openToast, onClose }: SupportCenterProps) {
  const [conversations, setConversations] = useState<SupportConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected conversation for viewing messages & replying
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<SupportConversationItem | null>(null);
  const [isLoadingActive, setIsLoadingActive] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // New ticket modal / form state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState<string>(role === "student" ? "booking" : "property");
  const [newMessage, setNewMessage] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);

  // Categories tailoring based on user role
  const studentCategories = [
    { value: "booking", label: "حجز السكن" },
    { value: "payment", label: "دفع وإيصالات" },
    { value: "property", label: "استفسار عن عقار" },
    { value: "account", label: "حسابي والملف الشخصي" },
    { value: "verification", label: "التحقق والتوثيق الجامعي" },
    { value: "technical", label: "مشكلة تقنية بالمنصة" },
    { value: "other", label: "أخرى" },
  ];

  const ownerCategories = [
    { value: "property", label: "العقارات والوحدات السكنية" },
    { value: "booking", label: "الحجوزات والطلاب" },
    { value: "inspection", label: "المعاينات 360°" },
    { value: "verification", label: "التحقق وتوثيق المالك" },
    { value: "account", label: "الحساب والبيانات" },
    { value: "technical", label: "مشكلة تقنية" },
    { value: "other", label: "أخرى" },
  ];

  const categories = role === "student" ? studentCategories : ownerCategories;

  // Load conversations list
  const loadConversations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getMySupportConversationsApi();
      setConversations(data);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      setErrorMessage(err.message || "تعذر تحميل محادثات الدعم، يرجى المحاولة مرة أخرى.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [role]);

  // Load single conversation details when selected
  const openConversation = async (convId: string) => {
    setSelectedConvId(convId);
    setIsLoadingActive(true);
    setReplyError(null);
    try {
      const details = await getSupportConversationDetailsApi(convId);
      setActiveConversation(details);
    } catch (err: any) {
      console.error("Failed to load conversation details:", err);
      openToast(err.message || "تعذر فتح محادثة الدعم");
      setSelectedConvId(null);
      setActiveConversation(null);
    } finally {
      setIsLoadingActive(false);
    }
  };

  // Send reply message
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !replyBody.trim()) return;

    if (replyBody.trim().length < 2) {
      setReplyError("يجب كتابة حرفين على الأقل للرد");
      return;
    }

    setIsSendingReply(true);
    setReplyError(null);
    try {
      const newMsg = await sendSupportMessageApi(activeConversation.id, replyBody.trim());
      setReplyBody("");
      // Append message to active conversation
      setActiveConversation((prev) => {
        if (!prev) return prev;
        const currentMessages = prev.messages || [];
        return {
          ...prev,
          messages: [...currentMessages, newMsg],
          status: prev.status === "resolved" ? "in_progress" : prev.status,
          updatedAt: new Date().toISOString(),
        };
      });
      openToast("تم إرسال ردك إلى فريق الدعم بنجاح");
      // Silently refresh conversation list in background
      loadConversations(true);
    } catch (err: any) {
      setReplyError(err.message || "تعذر إرسال الرسالة، يرجى المحاولة ثانية");
    } finally {
      setIsSendingReply(false);
    }
  };

  // Submit new support conversation
  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      setNewError("يرجى ملء جميع الحقول المطلوبة (العنوان ونص الرسالة)");
      return;
    }

    if (newSubject.trim().length < 3) {
      setNewError("عنوان الموضوع يجب ألا يقل عن 3 أحرف");
      return;
    }

    if (newMessage.trim().length < 5) {
      setNewError("تفاصيل الرسالة يجب ألا تقل عن 5 أحرف");
      return;
    }

    setIsSubmittingNew(true);
    setNewError(null);
    try {
      const created = await createSupportConversationApi({
        subject: newSubject.trim(),
        category: newCategory,
        message: newMessage.trim(),
      });

      openToast("تم فتح تذكرة الدعم ومراسلة فريق مكاني بنجاح");
      setIsCreatingNew(false);
      setNewSubject("");
      setNewMessage("");
      // Reload list and immediately open created conversation
      await loadConversations(true);
      await openConversation(created.id);
    } catch (err: any) {
      setNewError(err.message || "تعذر إنشاء المحادثة، يرجى إعادة المحاولة.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl" data-testid={`support-center-${role}`}>
      {/* Header Banner */}
      <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <LifeBuoy size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-foreground">
                  مركز الدعم والمساعدة
                </h2>
                <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                  دعم منصة مكاني
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                قناة تواصل رسمية ومباشرة ومحمية بينك وبين فريق إدارة وتشغيل منصة مكاني حصراً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadConversations(false)}
              disabled={isLoading}
              title="تحديث المحادثات"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              data-testid="support-btn-refresh"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span>تحديث</span>
            </button>

            {!isCreatingNew && !selectedConvId && (
              <button
                onClick={() => {
                  setIsCreatingNew(true);
                  setNewError(null);
                }}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
                data-testid="support-btn-create-ticket"
              >
                <Plus size={16} />
                <span>فتح تذكرة دعم جديدة</span>
              </button>
            )}
          </div>
        </div>

        {/* Security & Privacy Notice banner */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground/90">
          <Lock size={18} className="text-primary shrink-0" />
          <p className="leading-relaxed">
            <strong className="text-primary font-bold ml-1">حماية الخصوصية:</strong>
            يتم التعامل مع استفساراتك وحجوزاتك بكل سرية ومراجعتها حصرياً من قبل مشرفي مكاني المعتمدين لضمان الشفافية وحماية حقوق الجميع.
          </p>
        </div>
      </div>

      {/* Main View Area */}
      {isCreatingNew ? (
        /* ================= FORM: CREATE NEW TICKET ================= */
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm" data-testid="support-new-ticket-form">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus size={18} />
              </span>
              <h3 className="text-lg font-bold text-foreground">إنشاء محادثة دعم جديدة مع إدارة مكاني</h3>
            </div>

            <button
              onClick={() => setIsCreatingNew(false)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              إلغاء والعودة للقائمة
            </button>
          </div>

          {newError && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs font-bold text-destructive">
              <AlertCircle size={16} className="shrink-0" />
              <span>{newError}</span>
            </div>
          )}

          <form onSubmit={handleCreateConversation} className="space-y-5">
            <div>
              <label htmlFor="support-category-select" className="block text-xs font-bold text-foreground mb-1.5">
                تصنيف التذكرة <span className="text-destructive">*</span>
              </label>
              <select
                id="support-category-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="support-input-category"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="support-subject-input" className="block text-xs font-bold text-foreground mb-1.5">
                عنوان الموضوع أو الاستفسار <span className="text-destructive">*</span>
              </label>
              <input
                id="support-subject-input"
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="مثال: استفسار بخصوص توثيق إيصال الدفع لحجز السكن"
                maxLength={200}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="support-input-subject"
                required
              />
              <span className="mt-1 block text-[11px] text-muted-foreground font-mono">
                {newSubject.length}/200 حرف
              </span>
            </div>

            <div>
              <label htmlFor="support-message-input" className="block text-xs font-bold text-foreground mb-1.5">
                تفاصيل الرسالة <span className="text-destructive">*</span>
              </label>
              <textarea
                id="support-message-input"
                rows={5}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="يرجى كتابة تفاصيل استفسارك أو المشكلة التي تواجهها بوضوح ليتمكن فريق الدعم من مساعدتك بأسرع وقت..."
                maxLength={5000}
                className="w-full rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="support-input-message"
                required
              />
              <span className="mt-1 block text-[11px] text-muted-foreground font-mono">
                {newMessage.length}/5000 حرف
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="rounded-xl border border-border bg-background px-6 py-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSubmittingNew}
                className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                data-testid="support-btn-submit-ticket"
              >
                {isSubmittingNew ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>إرسال التذكرة لفريق الدعم</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : selectedConvId && activeConversation ? (
        /* ================= CONVERSATION DETAILS & CHAT ================= */
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden" data-testid="support-conversation-thread">
          {/* Thread Header */}
          <div className="border-b border-border bg-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedConvId(null);
                    setActiveConversation(null);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
                  title="العودة لكل المحادثات"
                  data-testid="support-btn-back-to-list"
                >
                  <ArrowRight size={18} />
                </button>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-foreground">
                      {activeConversation.subject}
                    </h3>
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                      {activeConversation.conversationCode}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                      {SUPPORT_CATEGORY_LABELS[activeConversation.category] || activeConversation.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={12} />
                      {formatDate(activeConversation.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {(() => {
                  const statusInfo = SUPPORT_STATUS_LABELS[activeConversation.status] || {
                    label: activeConversation.status,
                    color: "bg-muted text-muted-foreground border-border",
                  };
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.color}`}
                      data-testid="support-thread-status"
                    >
                      <CheckCircle2 size={13} />
                      {statusInfo.label}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-muted/20" data-testid="support-messages-container">
            {isLoadingActive ? (
              <div className="py-12 text-center text-muted-foreground">
                <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-primary" />
                <p className="text-xs font-bold">جاري تحميل رسائل المحادثة...</p>
              </div>
            ) : !activeConversation.messages || activeConversation.messages.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                لا توجد رسائل مسجلة بعد في هذه المحادثة.
              </div>
            ) : (
              activeConversation.messages.map((msg) => {
                const isAdmin = msg.senderRole === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                    data-testid={`support-message-${msg.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-muted-foreground">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          <ShieldCheck size={12} />
                          فريق دعم منصة مكاني
                        </span>
                      ) : (
                        <span className="font-bold text-foreground">أنت ({role === "student" ? "طالب" : "مالك"})</span>
                      )}
                      <span className="font-mono text-[10px]">{formatDate(msg.createdAt)}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                        isAdmin
                          ? "bg-card border border-primary/20 text-foreground rounded-tr-none"
                          : "bg-primary text-primary-foreground rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Input Box */}
          {activeConversation.status === "closed" ? (
            <div className="p-5 border-t border-border bg-muted/50 text-center text-xs text-muted-foreground">
              <span className="font-bold block mb-1">تم إغلاق هذه المحادثة من قبل إدارة مكاني.</span>
              إذا كان لديك استفسار جديد أو مسألة أخرى، يرجى فتح تذكرة دعم جديدة أعلاه.
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="p-4 border-t border-border bg-card">
              {replyError && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive/10 p-2.5 text-xs font-bold text-destructive">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{replyError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  rows={2}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="اكتب ردك لفريق دعم مكاني هنا..."
                  maxLength={5000}
                  className="flex-1 rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  data-testid="support-input-reply"
                />

                <button
                  type="submit"
                  disabled={isSendingReply || !replyBody.trim()}
                  className="self-end sm:self-center flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  data-testid="support-btn-send-reply"
                >
                  {isSendingReply ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>إرسال الرد</span>
                    </>
                  )}
                </button>
              </div>
              <span className="mt-1 block text-[10px] text-muted-foreground font-mono">
                {replyBody.length}/5000 حرف
              </span>
            </form>
          )}
        </div>
      ) : (
        /* ================= CONVERSATIONS LIST ================= */
        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden" data-testid="support-conversations-list">
          <div className="border-b border-border p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                تذاكر ومحادثات الدعم الخاصة بك ({conversations.length})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                سجل تواصلك واستفساراتك المباشرة مع إدارة المنصة
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground" data-testid="support-loading-state">
              <RefreshCw size={32} className="mx-auto animate-spin mb-3 text-primary" />
              <p className="text-sm font-bold">جاري تحميل تذاكر الدعم...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-8 text-center" data-testid="support-error-state">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-bold text-destructive mb-3">{errorMessage}</p>
              <button
                onClick={() => loadConversations(false)}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-16 px-6 text-center" data-testid="support-empty-state">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <MessageSquare size={32} />
              </div>
              <h4 className="text-lg font-bold text-foreground">لا توجد محادثات دعم سابقة</h4>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                إذا كان لديك أي سؤال حول الحجز، التوثيق، المعاينة، أو واجهتك أي مشكلة، نحن هنا للمساعدة دائماً!
              </p>
              <button
                onClick={() => {
                  setIsCreatingNew(true);
                  setNewError(null);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
                data-testid="support-empty-create-btn"
              >
                <Plus size={16} />
                <span>فتح أول تذكرة دعم الآن</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => {
                const statusInfo = SUPPORT_STATUS_LABELS[conv.status] || {
                  label: conv.status,
                  color: "bg-muted text-muted-foreground border-border",
                };

                return (
                  <div
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className="p-5 hover:bg-muted/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    data-testid={`support-item-${conv.id}`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {conv.conversationCode}
                        </span>
                        <h4 className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                          {conv.subject}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold">
                          {SUPPORT_CATEGORY_LABELS[conv.category] || conv.category}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock size={12} />
                          آخر تحديث: {formatDate(conv.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
                        <MessageSquare size={14} className="text-primary" />
                        {conv.messageCount || 1} رسالة
                      </span>
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                      >
                        <span>عرض والرد</span>
                        <ChevronLeft size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
