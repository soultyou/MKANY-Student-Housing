import React, { useState, useEffect } from "react";
import { useAuth, EGYPTIAN_UNIVERSITIES, EGYPTIAN_CITIES } from "./clerk-auth";
import { StandardModal } from "@/components/ui/StandardModal";
import { GraduationCap, Building2, User, Phone, CreditCard, School, MapPin, CheckCircle2, AlertCircle } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  mode?: "student" | "owner";
  onToast?: (msg: string) => void;
}

export function OnboardingModal({ isOpen, mode = "student", onToast }: OnboardingModalProps) {
  const { user, completeUserOnboarding, signOut } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber && user.phoneNumber !== "01000000000" ? user.phoneNumber : "");
  const [nationalId, setNationalId] = useState(user?.nationalId && user.nationalId !== "00000000000000" ? user.nationalId : "");
  const [university, setUniversity] = useState(user?.university || EGYPTIAN_UNIVERSITIES[0]);
  const [city, setCity] = useState(user?.university && EGYPTIAN_CITIES.includes(user.university) ? user.university : EGYPTIAN_CITIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.fullName && user.fullName !== "مستخدم مكاني") {
        setFullName(user.fullName);
      }
      if (user.phoneNumber && user.phoneNumber !== "01000000000") {
        setPhoneNumber(user.phoneNumber);
      }
      if (user.nationalId && user.nationalId !== "00000000000000") {
        setNationalId(user.nationalId);
      }
      if (user.university) {
        setUniversity(user.university);
        if (EGYPTIAN_CITIES.includes(user.university)) {
          setCity(user.university);
        }
      }
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || fullName.trim().length < 3) {
      setErrorMsg("الاسم الثلاثي أو الرباعي مطلوب (3 أحرف على الأقل)");
      return;
    }

    const cleanPhone = phoneNumber.trim();
    if (!/^(01[0125]\d{8}|\+201[0125]\d{8})$/.test(cleanPhone)) {
      setErrorMsg("رقم الهاتف يجب أن يكون رقم مصري صحيح (مثال: 01012345678)");
      return;
    }

    if (mode === "student") {
      const cleanNationalId = nationalId.trim();
      if (!/^\d{14}$/.test(cleanNationalId)) {
        setErrorMsg("الرقم القومي يجب أن يتكون من 14 رقماً بالضبط");
        return;
      }
      if (!university) {
        setErrorMsg("يرجى اختيار الجامعة المقيد بها");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await completeUserOnboarding({
        accountType: mode,
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        nationalId: mode === "student" ? nationalId.trim() : undefined,
        university: mode === "owner" ? city : (mode === "student" ? university : undefined),
      });
      onToast?.(mode === "owner" ? "تم توثيق حساب المالك وتفعيله بنجاح!" : "تم توثيق حساب الطالب بنجاح!");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("403") || msg.toLowerCase().includes("forbidden") || msg.includes("غير مسموح")) {
        setErrorMsg("حدث خطأ 403 (غير مسموح). جاري تسجيل الخروج بأمان لتسجيل الدخول بحساب صحيح...");
        try {
          await signOut();
        } catch {}
      } else {
        setErrorMsg(msg || "حدث خطأ أثناء حفظ بيانات الحساب.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOwnerMode = mode === "owner";

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={() => {}} // Cannot dismiss onboarding without completing
      maxWidthClassName="max-w-xl"
      hideHeader={true}
      testId="onboarding-modal"
    >
      <div className="p-6 sm:p-8 text-right font-sans" dir="rtl">
        {/* Header */}
        <div className="mb-6 border-b border-border pb-5 text-center sm:text-right">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold mb-2 ${
            isOwnerMode ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
          }`}>
            {isOwnerMode ? (
              <>
                <Building2 size={14} />
                تأكيد واستكمال حساب المالك 🏢
              </>
            ) : (
              <>
                <GraduationCap size={14} />
                تأكيد واستكمال حساب الطالب 🎓
              </>
            )}
          </span>
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            {isOwnerMode ? "إكمال بيانات حساب المالك" : "إكمال بيانات حساب الطالب"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm leading-relaxed">
            {isOwnerMode
              ? "يرجى إدخال بيانات التوثيق والتواصل الخاصة بك كمالك عقار لإدارة وحداتك السكنية على منصة مكاني"
              : "يرجى إدخال بياناتك الجامعية والرسمية للبدء في تصفح وحجز السكن الطلابي وتوثيق العقود"}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-5">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                الاسم الرباعي الكامل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد محمود علي"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  required
                  data-testid="onboarding-input-fullname"
                />
                <User size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                رقم الموبايل / واتساب التواصل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="مثال: 01012345678"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary font-mono"
                  required
                  data-testid="onboarding-input-phone"
                />
                <Phone size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            {isOwnerMode ? (
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  المدينة / الموقع الرئيسي للعقارات <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary"
                    required
                    data-testid="onboarding-select-city"
                  >
                    {EGYPTIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <MapPin size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    الرقم القومي (14 رقماً) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={14}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                      placeholder="أدخل 14 رقماً من البطاقة الشخصية"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary font-mono"
                      required
                      data-testid="onboarding-input-nationalid"
                    />
                    <CreditCard size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                  </div>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    مطلوب لضمان وثوقية عقود السكن والضمانات القانونية.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    الجامعة المقيد بها <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary"
                      required
                      data-testid="onboarding-select-university"
                    >
                      {EGYPTIAN_UNIVERSITIES.map((uni) => (
                        <option key={uni} value={uni}>{uni}</option>
                      ))}
                    </select>
                    <School size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold text-white shadow-lg transition-all ${
                isOwnerMode ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90"
              }`}
              data-testid="onboarding-submit-btn"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  جاري الحفظ والتوثيق...
                </span>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {isOwnerMode ? "تأكيد وإنشاء حساب المالك 🏢" : "تأكيد وإنشاء حساب الطالب 🎓"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut();
                } catch {}
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              data-testid="onboarding-signout-btn"
            >
              تسجيل الخروج والبدء بحساب جديد (إصلاح مشاكل الصلاحيات)
            </button>
          </div>
        </form>
      </div>
    </StandardModal>
  );
}

