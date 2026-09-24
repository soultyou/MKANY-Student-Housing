import React, { useState, useEffect } from "react";
import { X, Play, Pause, ChevronRight, ChevronLeft, ShieldCheck, MapPin, Building2, Users, BarChart3, LifeBuoy, Zap, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { StandardModal } from "@/components/ui/StandardModal";

export type InvestorDemoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenToast: (msg: string) => void;
};

const scenes = [
  {
    id: 1,
    title: "المشكلة: أزمة السكن الطلابي",
    tag: "PROBLEM",
    icon: Users,
    voiceover: "تخيل طالب بينتقل من مدينة لمدينة، وأول مشكلة بيواجهها مش الدراسة... السكن. إعلانات متفرقة، معلومات غير موثوقة، وسطاء، وأسعار غير واضحة.",
    bulletPoints: [
      "إعلانات سكن متفرقة وغير موثوقة",
      "معلومات مضللة وأسعار غير واضحة",
      "صعوبة معرفة حالة السكن الحقيقية وقربه من الجامعة",
      "غياب الشفافية والأمان للطلاب وأولياء الأمور"
    ],
    highlight: "السوق التقليدي يعاني من الفوضى وغياب البيانات الموثقة."
  },
  {
    id: 2,
    title: "الحل: منصة مكاني (MKANY)",
    tag: "SOLUTION & INTRODUCTION",
    icon: Sparkles,
    voiceover: "هنا بييجي مكاني — منصة PropTech للـ student housing، بتجمع السكن، البيانات، والتحقق في تجربة واحدة متكاملة.",
    bulletPoints: [
      "منصة متخصصة حصرياً في سكن الطلاب (Student Housing)",
      "ربط رقمي ذكي بين الطلاب والملاك المعتمدين",
      "توفير بيئة بحث آمنة وسريعة تعتمد على الموقع الجغرافي",
      "تجربة مستخدم مصممة خصيصاً للجامعات المصرية والعربية"
    ],
    highlight: "منصة PropTech رائدة تربط العرض بالطلب بثقة تامة."
  },
  {
    id: 3,
    title: "تجربة الطالب: رحلة بحث ذكية",
    tag: "STUDENT EXPERIENCE",
    icon: Building2,
    voiceover: "الطالب مش بيشوف مجرد إعلان. بيشوف المكان، السعر، التوفر، المواصفات، الصور، المعاينة الافتراضية، وموقع العقار بالنسبة للجامعة والخدمات.",
    bulletPoints: [
      "تصفح وحدات سكنية معتمدة مع فلترة حسب الجامعة والميزانية",
      "معاينة تفصيلية: الصور، جولات 360°، والمواصفات الكاملة",
      "عرض فوري للأماكن الشاغرة والأسعار الشاملة",
      "حفظ في المفضلة وحجز مباشر بخطوات واضحة"
    ],
    highlight: "تجربة رقمية بالكامل توفر الوقت والجهد على الطالب."
  },
  {
    id: 4,
    title: "ذكاء الموقع والجغرافيا (GIS)",
    tag: "LOCATION INTELLIGENCE",
    icon: MapPin,
    voiceover: "ومكاني مش مجرد marketplace. الموقع جزء أساسي من تجربة البحث. الطالب يقدر يفهم العقار موجود فين، قريب من جامعته قد إيه، وإيه الخدمات الموجودة حواليه.",
    bulletPoints: [
      "خرائط تفاعلية دقيقة توضح موقع السكن والجامعات",
      "حساب المسافات وقرب السكن من الكليات والمواصلات",
      "استكشاف المرافق المحيطة (صيدليات، سوبرماركت، مستشفيات)",
      "تحليل جغرافي يدعم قرار السكن بحكمة"
    ],
    highlight: "خرائط وخدمات جغرافية تضع الطالب في قلب الحدث."
  },
  {
    id: 5,
    title: "الثقة والتحقق (Trust & Verification)",
    tag: "VERIFICATION WORKFLOW",
    icon: ShieldCheck,
    voiceover: "الثقة هنا مش مجرد badge على الشاشة. العقار بيمر من خلال workflow للتحقق والمراجعة قبل ما يظهر بشكل مؤهل للطلاب.",
    bulletPoints: [
      "دورة مراجعة شاملة للعقار من قبل فريق المنصة",
      "معاينة ميدانية وتوثيق رسمي للوحدات",
      "شارة 'موثّق ومعتمد' تضمن المصداقية المطلقة",
      "حماية كاملة لأولياء الأمور من أي إعلانات وهمية"
    ],
    highlight: "منظومة تحقق صارمة تضمن الأمان التام."
  },
  {
    id: 6,
    title: "تجربة المالك (Owner Dashboard)",
    tag: "OWNER EXPERIENCE",
    icon: Zap,
    voiceover: "ومن ناحية المالك، مكاني بيساعده يدير العقار ويتابع حالة المراجعة والحجوزات من مكان واحد بكل سهولة واحترافية.",
    bulletPoints: [
      "لوحة تحكم خاصة لإضافة وإدارة الوحدات السكنية",
      "متابعة حالة المراجعة والموافقة فريباً بلحظة بلحظة",
      "إدارة السعة السكنية المتاحة والأماكن الشاغرة",
      "تلقي طلبات الحجز وتنظيم مواعيد المعاينة والاستلام"
    ],
    highlight: "تمكين الملاك من إدارة عقارهم الاستثماري بكفاءة رقمية."
  },
  {
    id: 7,
    title: "تحكم الإدارة (Admin Control & Ops)",
    tag: "ADMIN CONTROL",
    icon: BarChart3,
    voiceover: "وفي الخلفية، الإدارة عندها طبقة تحكم كاملة لإدارة المستخدمين والعقارات والمراجعات والحجوزات والدعم.",
    bulletPoints: [
      "بوابة إدارية مركزية للتحكم الشامل بالمنصة",
      "إدارة طلبات اعتماد الوحدات وإجراءات المعاينة (Inspections)",
      "متابعة الحجوزات النشطة والتقارير المالية والتشغيلية",
      "إدارة المستخدمين والصلاحيات وحل النزاعات"
    ],
    highlight: "رؤية تشغيلية كاملة وتحكم تشغيلي لا يقبل الفراغ."
  },
  {
    id: 8,
    title: "الحجز الفعلي الشفاف",
    tag: "TRANSPARENT BOOKING",
    icon: CheckCircle2,
    voiceover: "والحجز نفسه مبني على بيانات التوفر الفعلية الموجودة في المنصة، مع جدول مواعيد الاستلام ودورة إيصالات واضحة.",
    bulletPoints: [
      "تقويم تفاعلي يوضح الأيام المتاحة والمحجوزة بدقة",
      "تأكيد فوري للحجوزات المرتبطة بالسعة الحية",
      "عرض تفاصيل الدفع والرسوم والودائع بكل شفافية",
      "ربط مباشر بتأكيد الاستلام دون وسطاء"
    ],
    highlight: "شفافية مطلقة في دورة الحجز والتوفر."
  },
  {
    id: 9,
    title: "مركز الدعم الموحد الآمن",
    tag: "UNIFIED SUPPORT",
    icon: LifeBuoy,
    voiceover: "وأي مشكلة أو استفسار بيمر من خلال قنوات مكاني الرسمية، بدل ما نحول المنصة إلى direct communication بين الطالب والمالك.",
    bulletPoints: [
      "قنوات دعم فني مخصصة للطلاب والملاك",
      "فصل كامل للاتصالات لضمان الخصوصية والأمان",
      "إشراف إداري كامل على الشكاوي والاستفسارات",
      "استجابة سريعة لحل أي عقبة أثناء الإقامة"
    ],
    highlight: "أمان واستقرار عبر قنوات إشرافية مركزية."
  },
  {
    id: 10,
    title: "القيمة الاستثمارية (Business Value)",
    tag: "MARKET OPPORTUNITY",
    icon: BarChart3,
    voiceover: "القيمة هنا مش بس في حجز سرير. القيمة في بناء طبقة بيانات وثقة حول student housing في مصر والمنطقة.",
    bulletPoints: [
      "سوق ضخم ونامٍ (ملايين الطلاب المغتربين سنوياً)",
      "نموذج أعمال مستدام يربط العرض العالي بالطلب الدائم",
      "موانع دخول قوية (Network Effects + Verified Data Layer)",
      "فرصة توسع إقليمي واسعة في أسواق الشرق الأوسط وشمال إفريقيا"
    ],
    highlight: "فرصة استثمارية واعدة في قطاع PropTech الصاعد."
  },
  {
    id: 11,
    title: "الرؤية المستقبلية للمنصة",
    tag: "FUTURE VISION",
    icon: Sparkles,
    voiceover: "هدف مكاني مش مجرد موقع للإيجار. الهدف إننا نبني ecosystem موثوق للسكن والخدمات المرتبطة بحياة الطالب. مكاني — مش بس سكن... ده حد يفهمك.",
    bulletPoints: [
      "تطوير الخدمات المصاحبة لحياة الطالب المغترب",
      "توسيع شبكة الجامعات والشراكات الاستراتيجية",
      "إدخال تقنيات الذكاء الاصطناعي للتوصية بالسكن الذكي",
      "الريادة الإقليمية في قطاع تكنولوجيا السكن الطلابي"
    ],
    highlight: "مكاني — مش بس سكن... ده حد يفهمك."
  }
];

export function InvestorDemoModal({ isOpen, onClose, onOpenToast }: InvestorDemoModalProps) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && isOpen) {
      timer = setInterval(() => {
        setCurrentScene((prev) => {
          if (prev < scenes.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 9000); // 9 seconds per scene
    }
    return () => clearInterval(timer);
  }, [isPlaying, isOpen]);

  const scene = scenes[currentScene];
  const IconComponent = scene.icon;

  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(scene.voiceover);
      utterance.lang = "ar-EG";
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      onOpenToast("جاري تشغيل التعليق الصوتي للعرض...");
    } else {
      onOpenToast("متصفحك لا يدعم التشغيل الصوتي المباشر");
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClassName="max-w-5xl"
      hideHeader={true}
      testId="modal-investor-demo"
    >
      <div className="bg-slate-950 text-slate-100 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-6 sm:p-10 relative text-right" dir="rtl">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary border border-primary/30">
              <Zap size={22} />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">MKANY — عرض للمستثمرين (Product Demo)</h2>
              <p className="text-xs text-slate-400">جولة تفاعلية سينمائية في المنصة والبنية الاستثمارية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-900 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
            aria-label="إغلاق العرض"
            data-testid="button-close-investor-demo"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="grid grid-cols-11 gap-1.5 mb-8">
          {scenes.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => { setCurrentScene(idx); setIsPlaying(false); }}
              className={`h-2 rounded-full transition-all ${
                idx === currentScene
                  ? "bg-primary shadow-lg shadow-primary/50"
                  : idx < currentScene
                  ? "bg-primary/40"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
              title={`المشهد ${s.id}: ${s.title}`}
            />
          ))}
        </div>

        {/* Main Scene Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl min-h-[420px]">
          {/* Left Column: Details & Bullets */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary tracking-wider">
                المشهد {scene.id} / {scenes.length} • {scene.tag}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-primary border border-slate-700">
                <IconComponent size={20} />
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {scene.title}
            </h3>

            {/* Voiceover speech bubble */}
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 sm:p-5 text-sm sm:text-base text-slate-200 leading-relaxed shadow-inner">
              <span className="block text-[11px] font-bold text-primary mb-1">التعليق الصوتي للمستثمر (Voice-over):</span>
              "{scene.voiceover}"
              <div className="mt-3 flex items-center justify-end">
                <button
                  onClick={handleSpeak}
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  <Play size={13} /> الاستماع للتعليق الصوتي
                </button>
              </div>
            </div>

            {/* Bullet points */}
            <div className="space-y-2.5">
              {scene.bulletPoints.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary mt-0.5">
                    ✓
                  </span>
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs font-bold text-amber-400">
              <Sparkles size={15} />
              <span>ميزة تنافسية: {scene.highlight}</span>
            </div>
          </div>

          {/* Right Column: Visual Preview / Cinematic Badge */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 text-center space-y-4 min-h-[300px]">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/20 text-primary border border-primary/40 shadow-2xl animate-pulse">
              <IconComponent size={38} />
              <div className="absolute -inset-1 rounded-3xl bg-primary/10 blur-md -z-10" />
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 tracking-wider block">MKANY PRODUCT PILLAR</span>
              <h4 className="text-lg font-black text-white">{scene.title}</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                منصة حقيقية تعمل بكامل قدراتها التشغيلية والتقنية لتوفير أفضل تجربة سكن طلابي.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold text-emerald-400">نظام حي ومختبر بالكامل (Live System)</span>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setCurrentScene(0); setIsPlaying(false); }}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              البدء من جديد
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/30"
            >
              {isPlaying ? <><Pause size={15} /> إيقاف مؤقت</> : <><Play size={15} /> تشغيل العرض التلقائي</>}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCurrentScene((prev) => Math.max(0, prev - 1)); setIsPlaying(false); }}
              disabled={currentScene === 0}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              <ChevronRight size={16} /> المشهد السابق
            </button>
            
            <span className="text-xs font-bold text-slate-400 px-2">
              {currentScene + 1} / {scenes.length}
            </span>

            <button
              onClick={() => { setCurrentScene((prev) => Math.min(scenes.length - 1, prev + 1)); setIsPlaying(false); }}
              disabled={currentScene === scenes.length - 1}
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
            >
              المشهد التالي <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      </div>
    </StandardModal>
  );
}
