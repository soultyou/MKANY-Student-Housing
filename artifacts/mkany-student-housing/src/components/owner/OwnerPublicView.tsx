import React from "react";
import { 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  CircleDollarSign, 
  Eye, 
  Clock, 
  FileCheck, 
  Camera, 
  CheckCircle2, 
  ArrowLeft, 
  PhoneCall, 
  ChevronDown, 
  Lock, 
  UserCheck, 
  Layers, 
  Sparkle,
  LogIn,
  UserPlus,
  Compass
} from "lucide-react";
import { useAuth, SignInButton, SignUpButton } from "@/components/auth/clerk-auth";

interface OwnerPublicViewProps {
  onGoToDashboard: () => void;
  onOpenToast: (msg: string) => void;
  onGoToStudentListings: () => void;
}

/**
 * صفحة الملاك العامة (متاحة لجميع الزوار والمستخدمين بدون تسجيل دخول)
 * تعرض تفاصيل الخدمات، مميزات عرض العقارات، وكيفية الانضمام وتوثيق العقار
 * خالية تماماً من أي لوحة تحكم أو إحصائيات مالية أو أزرار إضافة وحدات
 */
export function OwnerPublicView({
  onGoToDashboard,
  onOpenToast,
  onGoToStudentListings,
}: OwnerPublicViewProps) {
  const { isSignedIn, user, updateUserProfile } = useAuth();
  const isOwner = user?.role === "owner" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="owner-public-page">
      {/* القسم الرئيسي للترحيب بالملاك - Hero */}
      <section className="hero-wash relative overflow-hidden border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary">
                <Building2 size={15} />
                بوابة ملاك وأصحاب السكن الطلابي في مصر
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.3]">
                أجّر عقارك الطلابي بأعلى عائد، <br />
                <span className="text-primary">وبدون عمولة سماسرة</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                نوصلك بآلاف الطلاب الجامعيين الموثّقين مباشرة. نتولى المعاينة الميدانية والتصوير الافتراضي 360°، والعقود القانونية الإلكترونية لحفظ حقوقك كاملة.
              </p>

              {/* بطاقات المزايا السريعة */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
                  <span className="block text-xl font-black text-primary">٠٪</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">عمولة سمسار</span>
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
                  <span className="block text-xl font-black text-primary">٣٦٠°</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">تصوير افتراضي مجاني</span>
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
                  <span className="block text-xl font-black text-primary">١٠٠٪</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">طلاب موثقون بالهوية</span>
                </div>
                <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
                  <span className="block text-xl font-black text-primary">عقد</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">إلكتروني نظامي</span>
                </div>
              </div>

              {/* أزرار الإجراءات والحساب */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                {!isSignedIn ? (
                  <>
                    <SignInButton mode="modal">
                      <button 
                        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
                        data-testid="button-owner-login"
                      >
                        <LogIn size={18} />
                        تسجيل الدخول إلى لوحة المالك
                      </button>
                    </SignInButton>

                    <SignUpButton mode="modal" intent="owner">
                      <button 
                        className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
                        data-testid="button-owner-signup"
                      >
                        <UserPlus size={18} />
                        انضم كمالك عقار جديد
                      </button>
                    </SignUpButton>
                  </>
                ) : isOwner ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button 
                      onClick={onGoToDashboard}
                      className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
                      data-testid="button-enter-owner-dashboard"
                    >
                      <Layers size={18} />
                      الانتقال إلى لوحة تحكم المالك 👈
                    </button>
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
                      <CheckCircle2 size={16} />
                      حسابك نشط كمالك عقارات موثّق ({user?.fullName})
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-border bg-card/80 p-4">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <UserCheck size={18} className="text-primary shrink-0" />
                      أنت مسجل حالياً بحساب طالب: <strong className="text-foreground">{user?.fullName}</strong>. هذه الصفحة تعرض معلومات الشراكة العقارية لأصحاب العقارات.
                    </span>
                    <button 
                      onClick={onGoToStudentListings}
                      className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors shrink-0"
                      data-testid="button-browse-student-housing"
                    >
                      تصفح سكن الطلاب 👈
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* بطاقة توضيحية لخدمات المالك */}
            <div className="relative rounded-3xl border border-border bg-card/80 p-6 sm:p-8 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <div>
                  <span className="text-xs font-bold text-primary">برنامج مكاني للشراكة العقارية</span>
                  <h3 className="text-xl font-bold">لماذا يفضل الملاك منصة مكاني؟</h3>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <ShieldCheck size={26} />
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/50 p-3.5">
                  <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-500" />
                  <div>
                    <strong className="block text-foreground">حجز كامل الطاقة الاستيعابية مبكراً</strong>
                    <p className="mt-0.5 text-xs text-muted-foreground">شراكاتنا مع الكليات والجامعات تجعل غرفك وشققك تُحجز بالكامل قبل بدء الترم الدراسي.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/50 p-3.5">
                  <Camera size={19} className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <strong className="block text-foreground">نزول فريق المعاينة وتصوير 360° الافتراضي</strong>
                    <p className="mt-0.5 text-xs text-muted-foreground">فريق مهندسين ميداني يعاين الشقة ويصور جولة افتراضية احترافية مجاناً لزيادة ثقة الطلاب والحجز الفوري.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/50 p-3.5">
                  <UserCheck size={19} className="mt-0.5 shrink-0 text-sky-500" />
                  <div>
                    <strong className="block text-foreground">فلترة دقيقة وهوية موثوقة للطلاب</strong>
                    <p className="mt-0.5 text-xs text-muted-foreground">لا مستأجرين مجهولين. نتحقق من بطاقة الرقم القومي وإثبات القيد الجامعي لكل طالب قبل الحجز.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/50 p-3.5">
                  <FileCheck size={19} className="mt-0.5 shrink-0 text-amber-500" />
                  <div>
                    <strong className="block text-foreground">عقود إلكترونية تحفظ حقوق الصيانة والتأمين</strong>
                    <p className="mt-0.5 text-xs text-muted-foreground">توقيع رقمي موثق مع شروط واضحة تلزم الطلاب بالهدوء والنظافة وسداد الإيجار في الموعد.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-primary/10 p-4 text-xs leading-6 text-muted-foreground">
                <span className="font-bold text-primary">💡 ملاحظة للملاك:</span> لوحة التحكم الخاصة بإدارة الحجوزات وإضافة الوحدات ومتابعة الإيرادات محمية وتتطلب تسجيل الدخول بحساب مالك.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* كيف تعمل دورة إدراج وتوثيق العقار للملاك؟ - 4 خطوات واضحة */}
      <section className="border-b border-border bg-card/40 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold text-primary">دورة الإدراج والتوثيق</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">كيف تعرض عقارك للطلاب عبر مكاني؟</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-7">
              صممنا دورة عمل واضحة تضمن للمالك أعلى مستأجرين قيمة وتضمن للطالب المصداقية الكاملة.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative rounded-2xl border border-border bg-background p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">٠١</span>
              <h3 className="mt-5 text-lg font-bold">تسجيل حساب مالك</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                أنشئ حسابك كمالك عقار في دقيقة واحدة باستخدام بريدك ورقم هاتفك المصري، أو سجّل دخولك مباشرة.
              </p>
            </div>

            <div className="relative rounded-2xl border border-border bg-background p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">٠٢</span>
              <h3 className="mt-5 text-lg font-bold">إرسال طلب المعاينة</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                من لوحة تحكمك، اضغط "إضافة وحدة" وأرسل البيانات الأولية وصور العقار والموعد المفضل لزيارة فريقنا.
              </p>
            </div>

            <div className="relative rounded-2xl border border-border bg-background p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">٠٣</span>
              <h3 className="mt-5 text-lg font-bold">نزول المعاينة الميدانية 360°</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                يزور مهندس مكاني العقار فعلياً للتأكد من السلامة وتصوير الجولة الافتراضية 360° وقياس جودة المعيشة.
              </p>
            </div>

            <div className="relative rounded-2xl border border-border bg-background p-6 shadow-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-black text-emerald-500">٠٤</span>
              <h3 className="mt-5 text-lg font-bold">تفعيل العقار وبدء الحجز</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                يتم نشر العقار الموثق فوراً للطلاب بالجامعات وتبدأ في استقبال طلبات الحجز ومتابعة الإيرادات.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* باقات وخدمات مكاني للملاك */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-bold text-primary">خدمات متكاملة</p>
              <h2 className="text-3xl font-extrabold sm:text-4xl">باقات تناسب نوع وحجم استثمارك</h2>
              <p className="mt-2 text-sm text-muted-foreground">سواء كنت تؤجر غرفة واحدة أو عمارة سكنية كاملة للطلاب.</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
              ⚡ ضمان إشغال يصل إلى ٩٨٪
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* باقة التوثيق الأساسي */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">الباقة الأساسية</span>
                <h3 className="mt-4 text-2xl font-bold">التوثيق والإدراج</h3>
                <p className="mt-2 text-xs text-muted-foreground">مثالية للملاك الراغبين في تسويق وتوثيق غرفهم وشققهم.</p>
                
                <div className="mt-6 border-t border-border pt-6 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>نزول المعاينة الميدانية وتصوير 360° مجاناً</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>نشر العقار لآلاف الطلاب والجامعات</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>التحقق الرقمي من هوية الطالب وجامعته</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>عقد إيجار إلكتروني موثق</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>٠٪ عمولة سماسرة</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border">
                <SignInButton mode="modal">
                  <button className="w-full rounded-xl border border-primary bg-primary/10 py-3 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    سجّل وابدأ بالباقة الأساسية
                  </button>
                </SignInButton>
              </div>
            </div>

            {/* باقة الإشغال المميز */}
            <div className="relative rounded-3xl border-2 border-primary bg-card p-6 sm:p-8 flex flex-col justify-between shadow-xl">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground shadow">
                الأكثر طلباً بين الملاك
              </span>
              <div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">الباقة المتقدمة</span>
                <h3 className="mt-4 text-2xl font-bold">الظهور المميز</h3>
                <p className="mt-2 text-xs text-muted-foreground">لتحقيق حجز كامل قبل بدء الدراسة بأسابيع.</p>

                <div className="mt-6 border-t border-border pt-6 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>كل مميزات الباقة الأساسية</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>ظهور في صدارة نتائج البحث (+300% مشاهدات)</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>شارة "سكن موثق ومميز" تلفت انتباه الطلاب</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>تقرير أسبوعي مفصل بمعدلات المشاهدة والاهتمام</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>دعم فني واستشاري مخصص للمالك 24/7</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border">
                <SignInButton mode="modal">
                  <button className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5">
                    اختر باقة الظهور المميز
                  </button>
                </SignInButton>
              </div>
            </div>

            {/* باقة الإدارة الكاملة */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold text-muted-foreground">للمستثمرين والمباني الكاملة</span>
                <h3 className="mt-4 text-2xl font-bold">الإدارة والتشغيل</h3>
                <p className="mt-2 text-xs text-muted-foreground">نتولى إدارة السكن والتحصيل والصيانة بالكامل بالنيابة عنك.</p>

                <div className="mt-6 border-t border-border pt-6 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>تحصيل الإيجارات الشهرية وإيداعها في حسابك</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>خدمات نظافة دورية للشقق والممرات</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>فريق صيانة سريع للسباكة والكهرباء والواي فاي</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                    <span>متابعة التزام الطلاب بلوائح السكن الجامعي</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-border">
                <button 
                  onClick={() => onOpenToast("تواصل مع إدارة مكاني عبر 01055332242 لمناقشة إدارة العقار الكامل")}
                  className="w-full rounded-xl border border-border bg-background py-3 text-sm font-bold hover:bg-muted transition-colors"
                >
                  استفسر عن باقة الإدارة الكاملة
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* أسئلة شائعة للملاك */}
      <section className="border-t border-border bg-card/30 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">الأسئلة الشائعة لأصحاب العقارات</h2>
            <p className="mt-2 text-xs text-muted-foreground">كل ما تحتاج لمعرفته قبل إدراج عقارك على منصة مكاني.</p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border bg-background p-5">
              <h4 className="font-bold text-foreground">هل تكلفة المعاينة والتصوير الـ 360° مجانية؟</h4>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                نعم، ينزل فريق مكاني لمعاينة العقار وتوثيق أمانه وتصوير الجولة الافتراضية 360° مجاناً تماماً كجزء من شراكتنا لتوفير سكن موثوق للطلاب.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <h4 className="font-bold text-foreground">كيف يتم دفع الإيجار، وهل تحصل مكاني على عمولة من الإيجار؟</h4>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                مكاني لا تأخذ أي نسبة عمولة سمسرة من الإيجار الشهري (عمولة 0%). الإيجار يُدفع مباشرة من الطالب للمالك في المواعيد المحددة بالعقد الإلكتروني.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <h4 className="font-bold text-foreground">متى يمكنني الوصول للوحة التحكم وإضافة وحداتي؟</h4>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                بمجرد تسجيل الدخول بحساب مالك، ستتمكن فوراً من الدخول للوحة التحكم، والضغط على "إضافة وحدة جديدة" لرفع بيانات وصور عقارك وإرسال طلب المعاينة.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* شريط الختام والدعوة للانضمام */}
      <section className="border-t border-border bg-primary/5 py-14">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black sm:text-3xl">جاهز لتأجير عقارك الطلابي بأمان؟</h2>
          <p className="mt-2 text-sm text-muted-foreground">انضم لمئات الملاك المعتمدين في كفر الشيخ، المنصورة، طنطا، ومحافظات مصر.</p>
          
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <SignInButton mode="modal">
              <button 
                className="rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
                data-testid="button-owner-cta-login"
              >
                تسجيل الدخول كمالك الآن
              </button>
            </SignInButton>

            <button 
              onClick={onGoToStudentListings}
              className="rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              استعراض وحدات الطلاب المعروضة
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
