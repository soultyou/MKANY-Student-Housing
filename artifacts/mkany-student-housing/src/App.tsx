import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Heart, Search, Menu, X, Moon, Sun, ShieldCheck, ChevronDown, MapPin, GraduationCap, Sparkles, ArrowLeft, Ruler, BedDouble, Bath, Users, Building2, CalendarDays, Wifi, Sofa, Star, Check, LockKeyhole, Plus, BarChart3, Eye, Clock3, SlidersHorizontal, MessageCircle, FileText, Send, RefreshCw, Copy, Download, Home as HomeIcon, UserRound, Zap, Instagram, Linkedin, Facebook, Sparkle, CircleDollarSign, Crown, LifeBuoy, Share2, Maximize2, Box, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Router as WouterRouter, Route, Switch, useLocation } from "wouter";
import { 
  ClerkAuthProvider, 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  SignedIn, 
  SignedOut, 
  useUser,
  useAuth,
  isOnboardingRequired
} from "@/components/auth/clerk-auth";
import { OnboardingModal } from "@/components/auth/OnboardingModal";
import { OwnerPublicView } from "@/components/owner/OwnerPublicView";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";
import { AdminSecurePortalPage } from "@/components/admin/AdminSecurePortalPage";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { BookingReceiptFlow } from "@/components/booking/BookingReceiptFlow";
import { 
  getAllPlatformProperties, 
  PlatformProperty,
  getEffectiveAmenities,
  getAmenitiesDisplayList,
  NearbyAmenities,
  syncPlatformPropertiesFromApi
} from "@/lib/inspections-store";
import { getStudentFavoritesApi, addFavoriteApi, removeFavoriteApi } from "@/lib/favorites-store";
import { getServiceRatingsApi } from "@/lib/api-client";
import { InteractiveLeafletMap } from "@/components/map/InteractiveLeafletMap";
import { calcHaversineDistanceMeters } from "@/lib/geo-utils";
const logo = "/mkany-logo.png";

type ActiveViewType = "listings" | "studentDashboard" | "ownerPublic" | "ownerDashboard";

type Property = {
  id: number; title: string; address: string; city: string; university: string; pricePerMonth: number;
  roomType: string; areaSqm: number; bedrooms: number; bathrooms: number; floor: string; furnishing: string;
  availableFrom: string; currentRoommates: number; images: string[]; video360Url: string | null;
  verified: boolean; premium: boolean; livabilityScore: number; status: "متاح" | "مشغول" | "قيد المراجعة" | "مرفوض";
  model3dUrl?: string | null;
  rules?: string | null;
  smoking?: string | null;
  pets?: string | null;
  visitorPolicy?: string | null;
  utilities?: string | null;
  deposit?: string | null;
  fees?: string | null;
};

const reviews = [
  { name: "سارة محمود", university: "جامعة كفر الشيخ", initials: "سم", color: "bg-teal-700", quote: "المكان مطابق للصور جداً، والأهم إن كل تفاصيل العقد كانت واضحة من البداية." },
  { name: "يوسف خالد", university: "جامعة المنصورة", initials: "يك", color: "bg-amber-700", quote: "قرب السكن من البوابة وفر عليّ وقت ومواصلات كل يوم. تجربة مريحة فعلاً." },
  { name: "نورهان علي", university: "جامعة طنطا", initials: "نع", color: "bg-indigo-700", quote: "حجزت عبر فريق دعم مكاني بكل سلاسة وأمان ودون أي عمولة سمسار." },
];

const formatPrice = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

function ImageWithFallback({ src, alt, className, testId }: { src: string; alt: string; className?: string; testId?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`image-fallback flex items-center justify-center text-white/75 ${className || ""}`} data-testid={testId}><Building2 size={34} /><span className="sr-only">الصورة غير متاحة</span></div>;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} data-testid={testId} />;
}

import { StandardModal } from "@/components/ui/StandardModal";

export function Modal({ children, onClose, wide = false, label }: { children: ReactNode; onClose: () => void; wide?: boolean; label: string }) {
  return (
    <StandardModal
      isOpen={true}
      onClose={onClose}
      maxWidthClassName={wide ? "max-w-5xl" : "max-w-xl"}
      hideHeader={true}
      testId="modal-overlay"
      closeButtonAriaLabel={`إغلاق نافذة ${label || ""}`}
    >
      <div className="text-right">
        {children}
      </div>
    </StandardModal>
  );
}

import { NotificationBell } from "@/components/ui/NotificationBell";

function Header({ 
  light, 
  onTheme, 
  activeView, 
  setView, 
  openToast,
  savedCount = 0,
  studentTab,
  setStudentTab,
  ownerTab,
  setOwnerTab
}: { 
  light: boolean; 
  onTheme: () => void; 
  activeView: ActiveViewType; 
  setView: (v: ActiveViewType) => void; 
  openToast: (t: string) => void;
  savedCount?: number;
  studentTab?: "bookings" | "favorites" | "profile" | "support";
  setStudentTab?: (t: "bookings" | "favorites" | "profile" | "support") => void;
  ownerTab?: "units" | "inspections" | "bookings" | "support";
  setOwnerTab?: (t: "units" | "inspections" | "bookings" | "support") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { user } = useUser();
  const { language, setLanguage, t } = useLanguage();
  const go = (id: string) => { setMenuOpen(false); setMoreOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  const handleLogoClick = () => {
    setView("listings");
    go("home");
  };

  const navToStudentTab = (tab: "bookings" | "favorites" | "profile" | "support") => {
    if (setStudentTab) setStudentTab(tab);
    setView("studentDashboard");
    setMenuOpen(false);
    setMoreOpen(false);
  };

  const navToOwnerTab = (tab: "units" | "inspections" | "bookings" | "support") => {
    if (setOwnerTab) setOwnerTab(tab);
    setView("ownerDashboard");
    setMenuOpen(false);
    setMoreOpen(false);
  };

  const isOwner = user?.role === "owner";
  const isStudent = user?.role === "student" || (user && user.role !== "owner" && user.role !== "admin" && user.role !== "super_admin");

  return <>
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button className="md:hidden rounded-lg border border-border p-2 text-muted-foreground" onClick={() => setMenuOpen(true)} aria-label={t("nav.openMenu")} data-testid="button-open-menu"><Menu size={21} /></button>
        <button onClick={handleLogoClick} className="flex items-center gap-3 py-1 group text-right" aria-label={t("nav.backHome")} data-testid="button-logo">
          <img src={logo} alt="مكاني" className="logo-mark h-11 w-11 sm:h-12 sm:w-12 object-contain shrink-0 group-hover:scale-105 transition-transform" />
          <span className="hidden text-right leading-tight sm:block"><strong className="block text-base sm:text-lg font-black tracking-wide">MKANY</strong><small className="text-[10px] text-muted-foreground block font-medium">{t("nav.tagline")}</small></span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          {isOwner ? (
            <>
              <button onClick={() => { setView("listings"); go("home"); }} className={`hover:text-primary transition-colors ${activeView === "listings" ? "text-primary font-bold" : ""}`} data-testid="link-home">{t("nav.home")}</button>
              <button onClick={() => navToOwnerTab("units")} className={`hover:text-primary transition-colors ${activeView === "ownerDashboard" && ownerTab === "units" ? "text-primary font-bold" : ""}`} data-testid="link-owner-units">{t("nav.properties")}</button>
              <button onClick={() => navToOwnerTab("inspections")} className={`hover:text-primary transition-colors ${activeView === "ownerDashboard" && ownerTab === "inspections" ? "text-primary font-bold" : ""}`} data-testid="link-owner-inspections">{t("nav.inspections")}</button>
              <button onClick={() => navToOwnerTab("bookings")} className={`hover:text-primary transition-colors ${activeView === "ownerDashboard" && ownerTab === "bookings" ? "text-primary font-bold" : ""}`} data-testid="link-owner-bookings">{t("nav.bookings")}</button>
              <div className="relative">
                <button onClick={() => setMoreOpen(!moreOpen)} className="flex items-center gap-1 hover:text-primary transition-colors" data-testid="link-owner-more">
                  <span>{t("nav.more")}</span>
                  <ChevronDown size={14} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-xl z-50 flex flex-col gap-1 text-right">
                    <button onClick={() => navToOwnerTab("units")} className="rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted text-right">{t("nav.account")}</button>
                    <button onClick={() => navToOwnerTab("support")} className="rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted text-right">{t("nav.support")}</button>
                    <button onClick={() => { setView("ownerPublic"); setMoreOpen(false); }} className="rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted text-right">{t("nav.ownerServices")}</button>
                  </div>
                )}
              </div>
            </>
          ) : isStudent ? (
            <>
              <button onClick={() => { setView("listings"); go("home"); }} className={`hover:text-primary transition-colors ${activeView === "listings" ? "text-primary font-bold" : ""}`} data-testid="link-home">{t("nav.home")}</button>
              <button onClick={() => { setView("listings"); go("discover"); }} className={`hover:text-primary transition-colors ${activeView === "listings" ? "text-primary" : ""}`} data-testid="link-discover">{t("nav.explore")}</button>
              <button onClick={() => navToStudentTab("favorites")} className={`flex items-center gap-1 hover:text-primary transition-colors ${activeView === "studentDashboard" && studentTab === "favorites" ? "text-primary font-bold" : ""}`} data-testid="link-favorites">
                <span>{t("nav.favorites")}</span>
                {savedCount > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">{savedCount}</span>}
              </button>
              <button onClick={() => navToStudentTab("bookings")} className={`hover:text-primary transition-colors ${activeView === "studentDashboard" && studentTab === "bookings" ? "text-primary font-bold" : ""}`} data-testid="link-bookings">{t("nav.bookings")}</button>
              <div className="relative">
                <button onClick={() => setMoreOpen(!moreOpen)} className="flex items-center gap-1 hover:text-primary transition-colors" data-testid="link-student-more">
                  <span>{t("nav.more")}</span>
                  <ChevronDown size={14} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-xl z-50 flex flex-col gap-1 text-right">
                    <button onClick={() => navToStudentTab("profile")} className="rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted text-right">{t("nav.profile")}</button>
                    <button onClick={() => navToStudentTab("profile")} className="rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted text-right">{t("nav.verification")}</button>
                    <button onClick={() => navToStudentTab("support")} className="rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted text-right">{t("nav.support")}</button>
                    <button onClick={() => { setView("listings"); go("how"); setMoreOpen(false); }} className="rounded-lg px-3 py-2 text-xs font-bold text-foreground hover:bg-muted text-right">{t("nav.how")}</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setView("listings"); go("home"); }} className="hover:text-primary transition-colors" data-testid="link-home">{t("nav.home")}</button>
              <button onClick={() => { setView("listings"); go("discover"); }} className="hover:text-primary transition-colors" data-testid="link-discover">{t("nav.explore")}</button>
              <button onClick={() => setView("ownerPublic")} className="hover:text-primary transition-colors" data-testid="link-owners">{t("nav.owners")}</button>
              <button onClick={() => { setView("listings"); go("how"); }} className="hover:text-primary transition-colors" data-testid="link-about">{t("nav.how")}</button>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5"
            data-testid="language-switcher-btn"
            aria-label="تغيير اللغة / Change Language"
          >
            <Globe size={15} />
            <span>{language === "ar" ? "English" : "العربية"}</span>
          </button>
          <button onClick={onTheme} className="rounded-full border border-border p-2.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label={light ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"} data-testid="button-theme-toggle">{light ? <Moon size={18} /> : <Sun size={18} />}</button>

          <SignedIn>
            {isOwner && (
              <button
                onClick={() => navToOwnerTab("units")}
                className="hidden lg:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-primary text-primary-foreground shadow"
                data-testid="header-button-owner-dashboard"
              >
                <Building2 size={15} />
                {t("dashboard.owner")}
              </button>
            )}
            {isStudent && (
              <button
                onClick={() => navToStudentTab("bookings")}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-primary text-primary-foreground shadow"
                data-testid="header-button-student-dashboard"
              >
                <FileText size={15} />
                {t("nav.bookings")}
              </button>
            )}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <a
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all shadow-sm"
                data-testid="header-button-admin-portal"
              >
                <ShieldCheck size={15} />
                <span>{t("nav.admin")}</span>
              </a>
            )}
          </SignedIn>
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className="hidden rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors sm:block" data-testid="button-login">
                {t("nav.login")}
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-primary px-3.5 py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg sm:px-5 transition-all" data-testid="button-signup">
                {t("nav.signup")}
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>

    <div className="border-b border-border bg-card/60">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-5 overflow-x-auto whitespace-nowrap px-4 py-2 text-[11px] font-semibold text-muted-foreground sm:gap-9 sm:text-xs">
        <span className="flex items-center gap-1.5"><Building2 size={13} className="text-primary" />+٢,٤٠٠ وحدة سكنية</span><span className="flex items-center gap-1.5"><GraduationCap size={14} className="text-primary" />١٥ جامعة</span><span className="flex items-center gap-1.5"><Star size={13} className="text-amber-400" />٤٫٨/٥ تقييم الطلاب</span><span className="flex items-center gap-1.5"><LockKeyhole size={13} className="text-primary" />دفع آمن ١٠٠٪</span>
      </div>
    </div>

    {menuOpen && <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
      <aside className="mr-auto h-full w-[82%] max-w-sm border-l border-border bg-background p-6 shadow-2xl flex flex-col justify-between overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="mb-6 flex items-center justify-between">
            <img src={logo} alt="مكاني" className="logo-mark h-12 w-12 object-contain" />
            <button onClick={() => setMenuOpen(false)} className="rounded-full border border-border p-2" aria-label="إغلاق القائمة" data-testid="button-close-menu"><X size={18} /></button>
          </div>

          <SignedIn>
            <div className="mb-5 rounded-2xl border border-border bg-card p-3.5 flex items-center justify-between">
              <div className="text-right">
                <strong className="block text-sm font-bold text-foreground">{user?.fullName}</strong>
                <span className="text-xs text-muted-foreground">{isOwner ? "مالك عقارات موثق" : user?.university || "طالب مكاني"}</span>
              </div>
              <UserButton />
            </div>
          </SignedIn>

          <nav className="flex flex-col gap-3 text-base font-bold">
            <button onClick={() => { setView("listings"); go("home"); }} className="text-right hover:text-primary py-2" data-testid="mobile-link-home">{t("nav.home")}</button>

            {isOwner ? (
              <>
                <button onClick={() => navToOwnerTab("units")} className="text-right text-primary flex items-center gap-2 py-2" data-testid="mobile-link-owner-units">
                  <Building2 size={18} /> {t("nav.properties")}
                </button>
                <button onClick={() => navToOwnerTab("inspections")} className="text-right hover:text-primary flex items-center gap-2 py-2" data-testid="mobile-link-owner-inspections">
                  <Eye size={18} /> {t("nav.inspections")}
                </button>
                <button onClick={() => navToOwnerTab("bookings")} className="text-right hover:text-primary flex items-center gap-2 py-2" data-testid="mobile-link-owner-bookings">
                  <FileText size={18} /> {t("nav.bookings")}
                </button>
                <div className="border-t border-border my-2 pt-2">
                  <span className="text-xs text-muted-foreground block mb-2 font-normal">{t("nav.more")}</span>
                  <button onClick={() => navToOwnerTab("support")} className="text-right hover:text-primary flex items-center gap-2 py-2 text-sm" data-testid="mobile-link-owner-support">
                    <LifeBuoy size={16} /> {t("nav.support")}
                  </button>
                  <button onClick={() => { setView("ownerPublic"); setMenuOpen(false); }} className="text-right hover:text-primary flex items-center gap-2 py-2 text-sm" data-testid="mobile-link-owner-public">
                    <Crown size={16} /> {t("nav.ownerServices")}
                  </button>
                </div>
              </>
            ) : isStudent ? (
              <>
                <button onClick={() => { setView("listings"); go("discover"); }} className="text-right hover:text-primary flex items-center gap-2 py-2" data-testid="mobile-link-discover">
                  <Search size={18} /> {t("nav.discover")}
                </button>
                <button onClick={() => navToStudentTab("favorites")} className="text-right hover:text-primary flex items-center justify-between py-2" data-testid="mobile-link-favorites">
                  <span className="flex items-center gap-2"><Heart size={18} className="text-rose-500 fill-rose-500/20" /> {t("nav.favorites")}</span>
                  {savedCount > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{savedCount}</span>}
                </button>
                <button onClick={() => navToStudentTab("bookings")} className="text-right text-primary flex items-center gap-2 py-2" data-testid="mobile-link-bookings">
                  <FileText size={18} /> {t("nav.bookingsMy")}
                </button>
                <div className="border-t border-border my-2 pt-2">
                  <span className="text-xs text-muted-foreground block mb-2 font-normal">{t("nav.more")}</span>
                  <button onClick={() => navToStudentTab("profile")} className="text-right hover:text-primary flex items-center gap-2 py-2 text-sm" data-testid="mobile-link-profile">
                    <UserRound size={16} /> {t("nav.accountVerification")}
                  </button>
                  <button onClick={() => navToStudentTab("support")} className="text-right hover:text-primary flex items-center gap-2 py-2 text-sm" data-testid="mobile-link-support">
                    <LifeBuoy size={16} /> {t("nav.support")}
                  </button>
                  <button onClick={() => { setView("listings"); go("how"); setMenuOpen(false); }} className="text-right hover:text-primary flex items-center gap-2 py-2 text-sm" data-testid="mobile-link-about">
                    <Sparkles size={16} /> {t("nav.how")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={() => { setView("listings"); go("discover"); }} className="text-right hover:text-primary flex items-center gap-2 py-2" data-testid="mobile-link-discover">
                  <Search size={18} /> {t("nav.discover")}
                </button>
                <button onClick={() => { setView("ownerPublic"); setMenuOpen(false); }} className="text-right hover:text-primary py-2" data-testid="mobile-link-owners">{t("nav.owners")}</button>
                <button onClick={() => { setView("listings"); go("how"); }} className="text-right hover:text-primary py-2" data-testid="mobile-link-how">{t("nav.how")}</button>
              </>
            )}
          </nav>
        </div>

        <SignedOut>
          <div className="mt-4 flex flex-col gap-2.5 pt-4 border-t border-border">
            <SignInButton mode="modal">
              <button onClick={() => setMenuOpen(false)} className="w-full rounded-xl border border-border py-3 text-sm font-bold text-foreground hover:bg-muted transition-colors" data-testid="mobile-button-login">
                تسجيل الدخول
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button onClick={() => setMenuOpen(false)} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5" data-testid="mobile-button-signup">
                انضم مجاناً
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </aside>
    </div>}
  </>;
}

function SearchBox({ onSearch }: { onSearch: (city: string, type: string, budget: string, text?: string, availableOnly?: boolean, sort?: string) => void }) {
  const { t } = useLanguage();
  const [city, setCity] = useState(""); 
  const [type, setType] = useState(""); 
  const [budget, setBudget] = useState(""); 
  const [text, setText] = useState(""); 
  const [availableOnly, setAvailableOnly] = useState(false); 
  const [sort, setSort] = useState("newest"); 
  const [quick, setQuick] = useState("");

  const submit = () => onSearch(city, type, budget, text, availableOnly, sort);

  const resetAll = () => {
    setCity("");
    setType("");
    setBudget("");
    setText("");
    setAvailableOnly(false);
    setSort("newest");
    setQuick("");
    onSearch("", "", "", "", false, "newest");
  };

  const hasActiveFilters = Boolean(city || type || budget || text || availableOnly || sort !== "newest" || quick);

  const field = (label: string, value: string, set: (v: string) => void, options: string[]) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-right text-xs font-semibold text-muted-foreground">
      <span>{label}</span>
      <div className="relative">
        <select 
          value={value} 
          onChange={(e) => set(e.target.value)} 
          className="w-full appearance-none rounded-lg border border-border bg-background/80 px-3 py-3 pl-8 text-sm font-semibold text-foreground outline-none focus:border-primary" 
          data-testid={`select-${label}`}
        >
          <option value="">الكل</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" />
      </div>
    </label>
  );

  return (
    <div className="hero-ring mx-auto mt-8 max-w-5xl rounded-2xl bg-card/80 p-3 backdrop-blur-md sm:p-5" data-testid="search-panel">
      {/* السطر الأول: نص البحث المباشر */}
      <div className="mb-3 relative">
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("search.placeholder")}
          className="w-full rounded-xl border border-border bg-background/90 py-3 pr-10 pl-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold text-foreground"
          data-testid="input-search-text"
        />
        <Search size={18} className="absolute right-3.5 top-3.5 text-muted-foreground pointer-events-none" />
      </div>

      <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end">
        {field(t("search.cityUniv"), city, setCity, ["جامعة كفر الشيخ", "جامعة طنطا", "جامعة المنصورة", "جامعة الإسكندرية", "جامعة دمياط"])}
        {field(t("search.type"), type, setType, ["غرفة فردية", "غرفة مزدوجة", "استوديو", "شقة مشتركة"])}
        {field(t("search.budget"), budget, setBudget, ["أقل من ٨٠٠ جنيه", "٨٠٠-١٥٠٠ جنيه", "١٥٠٠-٣٠٠٠ جنيه", "أكثر من ٣٠٠٠ جنيه"])}
        <button 
          onClick={submit} 
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 font-bold text-primary-foreground hover:-translate-y-0.5 shadow-sm" 
          data-testid="button-search"
        >
          <Search size={18} />
          {t("search.searchBtn")}
        </button>
      </div>

      {/* خيارات الفلترة والتجميع الإضافية */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={availableOnly} 
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-[hsl(var(--primary))]" 
              data-testid="checkbox-available-only"
            />
            <span>{t("search.availableOnly")}</span>
          </label>

          <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span>{t("search.sort")}</span>
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground outline-none focus:border-primary"
              data-testid="select-sort-order"
            >
              <option value="newest">{t("search.sortNewest")}</option>
              <option value="price_asc">{t("search.sortPriceAsc")}</option>
              <option value="price_desc">{t("search.sortPriceDesc")}</option>
              <option value="livability">{t("search.sortLivability")}</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button 
            onClick={resetAll}
            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            data-testid="button-reset-all-filters"
          >
            {t("search.reset")}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2.5">
        <span className="ml-1 text-xs text-muted-foreground">اختيارات سريعة</span>
        {["قريب من الجامعة", "واي فاي مجاني", "مفروش بالكامل", "بنات فقط", "0% عمولة"].map((chip) => (
          <button 
            key={chip} 
            onClick={() => { 
              const nextQuick = quick === chip ? "" : chip;
              setQuick(nextQuick); 
              onSearch(city, type, budget, nextQuick ? chip : text, availableOnly, sort); 
            }} 
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              quick === chip 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`} 
            data-testid={`filter-chip-${chip}`}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function PropertyCard({ property, saved, onSave, onOpen }: { property: Property; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const { t } = useLanguage();
  const cardAmenities = getEffectiveAmenities(property as any);

    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:-translate-y-1 hover:shadow-xl" data-testid={`card-property-${property.id}`}>
    <div className="relative h-52 overflow-hidden"><ImageWithFallback src={property.images[0]} alt={property.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" testId={`img-property-${property.id}`} /><div className="absolute inset-x-3 top-3 flex items-start justify-between"><div className="flex gap-1.5">{property.verified && <span className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-primary"><ShieldCheck size={12} />{t("property.verified")}</span>}{property.premium && <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-amber-950"><Crown size={12} />{t("property.premium")}</span>}</div><button onClick={onSave} className={`rounded-full p-2 backdrop-blur-sm ${saved ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground"}`} aria-label={saved ? t("property.unsave") : t("property.save")} data-testid={`button-save-${property.id}`}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button></div></div>
    <div className="p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13} className="text-primary" />{property.address}</p><h3 className="font-bold">{property.title}</h3></div>
        <div className="shrink-0 text-left"><strong className="text-lg text-primary">{formatPrice(property.pricePerMonth)}</strong><span className="block text-[10px] text-muted-foreground">{t("property.perMonth")}</span></div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{property.roomType} · {property.university}</p>

      {/* شريط الخدمات والمسافات الحية للمنطقة المحيطة */}
      {cardAmenities.universityGate?.distance && cardAmenities.universityGate.distance !== "لا توجد بيانات متاحة" ? (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1.5 text-[11px]" data-testid={`card-amenities-${property.id}`}>
          <span className="flex items-center gap-1 font-semibold text-foreground truncate">
            <GraduationCap size={13} className="text-primary shrink-0" />
            {t("property.universityGate")} {cardAmenities.universityGate.distance} {cardAmenities.universityGate.time && cardAmenities.universityGate.time !== "لا توجد بيانات متاحة" ? `(${cardAmenities.universityGate.time})` : ""}
          </span>
          {cardAmenities.transportation?.distance && cardAmenities.transportation.distance !== "لا توجد بيانات متاحة" && (
            <span className="text-[10px] font-bold text-primary shrink-0">
              {t("property.transportation")} {cardAmenities.transportation.distance}
            </span>
          )}
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1.5 text-[11px]" data-testid={`card-amenities-${property.id}`}>
          <span className="flex items-center gap-1 text-muted-foreground">
            <GraduationCap size={13} className="text-primary shrink-0" />
            {t("property.nearbyServices")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            OpenStreetMap
          </span>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Ruler size={13} />{property.areaSqm}{t("property.area")}</span><span className="flex items-center gap-1"><BedDouble size={13} />{property.bedrooms} {t("property.rooms")}</span><span className="flex items-center gap-1"><Bath size={13} />{property.bathrooms} {t("property.bathrooms")}</span><span className="flex items-center gap-1"><Users size={13} />{property.currentRoommates} {t("property.roommates")}</span></div>
      <div className="mb-3"><div className="mb-1 flex justify-between text-[11px]"><span className="text-muted-foreground">{t("property.livability")}</span><span className="font-bold text-primary">{property.livabilityScore}/100</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${property.livabilityScore}%` }} /></div></div>
      <div className="mb-3 flex items-center gap-1 text-[11px] font-semibold text-primary"><ShieldCheck size={13} />{t("property.brokerCommission")}</div>
      <button onClick={onOpen} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/50 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground" data-testid={`button-details-${property.id}`}>{t("property.viewDetails")}<ArrowLeft size={16} /></button>
    </div>
  </article>;
}

function PropertyDetail({ 
  property, 
  onClose, 
  onAI, 
  onBook,
  saved,
  onSave
}: { 
  property: Property; 
  onClose: () => void; 
  onAI: () => void; 
  onBook: (selectedDate?: string) => void;
  saved?: boolean;
  onSave?: () => void;
}) {
  const { t } = useLanguage();
  const [media, setMedia] = useState<"photos" | "video">("photos"); 
  const [photo, setPhoto] = useState(0);
  const [isFullScreenMedia, setIsFullScreenMedia] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [selectedAmenityKey, setSelectedAmenityKey] = useState<string | null>(null);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);

  const [servicesAccordionOpen, setServicesAccordionOpen] = useState(true);
  const [isUnifiedAmenitiesExpanded, setIsUnifiedAmenitiesExpanded] = useState(false);
  const [isAllAmenitiesOpen, setIsAllAmenitiesOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);

  const [categoryOpenState, setCategoryOpenState] = useState<Record<string, boolean>>({
    universityGate: true,
    hospital: true,
    transportation: true,
    supermarket: true,
    cafeRestaurant: true
  });

  const [dynamicAmenitiesData, setDynamicAmenitiesData] = useState<NearbyAmenities | null>(null);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false);

  useEffect(() => {
    const lat = (property as any).lat;
    const lng = (property as any).lng;
    if (!lat || !lng) {
      setDynamicAmenitiesData(null);
      return;
    }

    let active = true;
    setIsLoadingAmenities(true);

    async function fetchFreshAmenities() {
      try {
        const res = await fetch(`/api/geo/amenities?lat=${lat}&lng=${lng}&propertyId=${property.id}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.amenities) {
            const amenities = { ...data.amenities };

            const fetchAndAttachRating = async (amenity: any, category: string) => {
              if (amenity && amenity.osmType && amenity.osmId && !amenity.rating) {
                try {
                  const ratingRes = await getServiceRatingsApi({ osmType: String(amenity.osmType), osmId: String(amenity.osmId), category });
                  if (ratingRes && ratingRes.rating && ratingRes.rating.rating) {
                    amenity.rating = String(ratingRes.rating.rating);
                  }
                } catch (e) { console.error("Error fetching rating:", e); }
              }
              return amenity;
            };

            const keys = Object.keys(amenities) as Array<keyof NearbyAmenities>;
            for (const key of keys) {
              const amenity = amenities[key];
              if (key.endsWith('List') && Array.isArray(amenity)) {
                await Promise.all(amenity.map(am => fetchAndAttachRating(am, key.replace('List', ''))));
              } else if (amenity) {
                await fetchAndAttachRating(amenity, key);
              }
            }

            setDynamicAmenitiesData(amenities);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch dynamic amenities:", err);
      } finally {
        if (active) {
          setIsLoadingAmenities(false);
        }
      }

      if (active && (property as any).nearbyAmenities) {
        setDynamicAmenitiesData((property as any).nearbyAmenities);
      }
    }

    fetchFreshAmenities();

    return () => {
      active = false;
    };
  }, [property.id, (property as any).lat, (property as any).lng]);

  const getCalendarMonthName = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  };

  const getCalendarDays = (offset: number) => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: ({ date: Date; day: number; isToday: boolean; formatted: string } | null)[] = [];
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= totalDays; i++) {
      const dateObj = new Date(year, month, i);
      const isDayToday = dateObj.getDate() === today.getDate() && 
                         dateObj.getMonth() === today.getMonth() && 
                         dateObj.getFullYear() === today.getFullYear();
                          
      days.push({
        date: dateObj,
        day: i,
        isToday: isDayToday,
        formatted: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`
      });
    }
    
    return days;
  };

  const getDayStatus = (date: Date, property: any, availablePlaces: number) => {
    if (availablePlaces <= 0) {
      return "unavailable";
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(date);
    d.setHours(0,0,0,0);
    if (d < today) {
      return "unavailable";
    }

    const activeBookings = property.activeBookings || [];
    const hasMatchingBooking = activeBookings.some((b: any) => {
      if (!b.appointmentDate) return false;
      
      const bDate = new Date(b.appointmentDate);
      if (!isNaN(bDate.getTime())) {
        return bDate.getDate() === date.getDate() && 
               bDate.getMonth() === date.getMonth() && 
               bDate.getFullYear() === date.getFullYear();
      }
      
      const normalizedBookingStr = b.appointmentDate.replace(/[٠-٩]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 1632));
      const dayNum = date.getDate();
      const monthNum = date.getMonth() + 1;
      return normalizedBookingStr.includes(String(dayNum)) && (normalizedBookingStr.includes(String(monthNum)) || normalizedBookingStr.includes(getCalendarMonthName(calendarMonthOffset)));
    });

    if (hasMatchingBooking) {
      return "reserved";
    }

    return "available";
  };

  const capacity = property.bedrooms || 0;
  const currentRoommates = property.currentRoommates || 0;
  const activeBookingsCount = (property as any).activeBookings?.length || 0;
  const availablePlaces = (property as any).availablePlaces !== undefined 
    ? (property as any).availablePlaces 
    : Math.max(0, capacity - (currentRoommates + activeBookingsCount));

  const propertyImages = Array.isArray(property.images) ? property.images : [];
  const hasImages = propertyImages.length > 0;
  const safePhotoIndex = photo < propertyImages.length ? photo : 0;

  const facts: Array<[ComponentType<{ size?: number; className?: string }>, string, string]> = [
    [Ruler, "المساحة", `${property.areaSqm} م²`], 
    [BedDouble, "عدد الغرف", `${property.bedrooms}`], 
    [Bath, "الحمامات", `${property.bathrooms}`], 
    [Building2, "الدور", property.floor], 
    [Sofa, "نوع الفرش", property.furnishing], 
    [CalendarDays, "تاريخ التوفر", property.availableFrom], 
    [Users, "الشاغر الحالي", availablePlaces > 0 ? `${availablePlaces} أماكن` : "مكتمل الحجز"]
  ];
  
  const effectiveAmenities = useMemo(() => {
    if (dynamicAmenitiesData) {
      return dynamicAmenitiesData;
    }
    return getEffectiveAmenities(property as any);
  }, [dynamicAmenitiesData, property]);

  const baseAmenitiesList = useMemo(() => {
    return getAmenitiesDisplayList(effectiveAmenities, (property as any).lat, (property as any).lng);
  }, [effectiveAmenities, property]);

  useEffect(() => {
    if (baseAmenitiesList.length > 0) {
      const firstUniv = baseAmenitiesList.find(a => a.key.toString().startsWith("universityGate"));
      if (firstUniv) {
        setSelectedAmenityKey(firstUniv.key);
      } else {
        setSelectedAmenityKey(baseAmenitiesList[0].key);
      }
    } else {
      setSelectedAmenityKey(null);
    }
  }, [baseAmenitiesList]);

  const dynamicAmenities = useMemo(() => {
    const propLat = (property as any).lat;
    const propLng = (property as any).lng;
    
    if (!propLat || !propLng) {
      return baseAmenitiesList;
    }

    return [...baseAmenitiesList].sort((a, b) => {
      const aIsUniv = a.iconType === "universityGate" ? 1 : 0;
      const bIsUniv = b.iconType === "universityGate" ? 1 : 0;
      if (aIsUniv !== bIsUniv) {
        return bIsUniv - aIsUniv;
      }

      const distA = calcHaversineDistanceMeters(propLat, propLng, a.lat || 0, a.lng || 0);
      const distB = calcHaversineDistanceMeters(propLat, propLng, b.lat || 0, b.lng || 0);
      return distA - distB;
    });
  }, [baseAmenitiesList, property]);

  const rules = property.rules || "";
  const smoking = property.smoking || "";
  const pets = property.pets || "";
  const visitorPolicy = property.visitorPolicy || "";
  const utilities = property.utilities || "";
  const deposit = property.deposit || "";
  const fees = property.fees || "";
  const hasAnyCustomPolicy = rules || smoking || pets || visitorPolicy || utilities || deposit || fees;

  const owner = (property as any).owner || { fullName: "مالك معتمد في مكاني", avatarUrl: null, isVerified: true };

  return (
    <Modal onClose={onClose} wide label={`تفاصيل ${property.title}`}>
      <div className="relative p-4 pt-14 sm:p-8 sm:pt-14 space-y-8 pb-24 sm:pb-12">
        
        {/* Full-Screen Lightbox Media Viewer */}
        {isFullScreenMedia && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md p-4 text-white" data-testid="fullscreen-media-viewer">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
                  {safePhotoIndex + 1} / {propertyImages.length || 1}
                </span>
                <h3 className="text-sm font-bold truncate max-w-xs sm:max-w-md">{property.title}</h3>
              </div>
              <button 
                onClick={() => setIsFullScreenMedia(false)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                aria-label="إغلاق العرض الكامل"
                data-testid="btn-close-fullscreen-media"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              {hasImages && (
                <img 
                  src={propertyImages[safePhotoIndex]} 
                  alt={property.title} 
                  className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
                />
              )}
              {propertyImages.length > 1 && (
                <>
                  <button 
                    onClick={() => setPhoto((prev) => (prev > 0 ? prev - 1 : propertyImages.length - 1))}
                    className="absolute right-4 rounded-full bg-black/60 p-3 text-white hover:bg-primary transition-colors shadow-lg"
                    aria-label="الصورة السابقة"
                  >
                    &#8594;
                  </button>
                  <button 
                    onClick={() => setPhoto((prev) => (prev < propertyImages.length - 1 ? prev + 1 : 0))}
                    className="absolute left-4 rounded-full bg-black/60 p-3 text-white hover:bg-primary transition-colors shadow-lg"
                    aria-label="الصورة التالية"
                  >
                    &#8592;
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 border-t border-white/10 pt-3 justify-center">
              {propertyImages.map((img, i) => (
                <button
                  key={`fs-${img}`}
                  onClick={() => setPhoto(i)}
                  className={`h-16 w-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    safePhotoIndex === i ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. Top Metadata / Compact Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
            <MapPin size={13} />
            {property.city} · {property.university}
          </span>
          {property.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600">
              <ShieldCheck size={13} />
              موثّق ومعتمد
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
            availablePlaces > 0 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
          }`}>
            {availablePlaces > 0 ? "متاح" : "مكتمل الحجز"}
          </span>
          {reviews.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600">
              ★ {reviews.length} تقييمات الطلاب
            </span>
          )}
        </div>

        {/* 2. Property Title & Address */}
        <div>
          <h2 className="text-2xl font-extrabold sm:text-3xl text-foreground">{property.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{property.address}</p>
        </div>

        {/* 3. Favorite Action */}
        {onSave && (
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all shadow-2xs ${
                saved ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50 text-foreground"
              }`}
              data-testid={`button-detail-save-${property.id}`}
            >
              <Heart size={15} fill={saved ? "currentColor" : "none"} />
              {saved ? "محفوظ في المفضلة" : "حفظ بالمفضلة"}
            </button>
          </div>
        )}

        {/* 4. Price Presentation */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <strong className="text-2xl sm:text-3xl font-black text-primary">
              {formatPrice(property.pricePerMonth)} جنيه / شهر
            </strong>
          </div>
          <span className="text-xs text-muted-foreground font-medium">شامل الرسوم الأساسية للإيجار والمرافق الأساسية</span>
        </div>

        {/* 5. Main Property Image / Gallery */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div 
            className="relative h-72 sm:h-[420px] w-full bg-slate-950 group"
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              const touchEndX = e.changedTouches[0].clientX;
              const diff = touchStartX - touchEndX;
              if (Math.abs(diff) > 50) {
                if (diff > 0) setPhoto((prev) => Math.min(prev + 1, propertyImages.length - 1));
                else setPhoto((prev) => Math.max(prev - 1, 0));
              }
            }}
          >
            {media === "photos" ? (
              hasImages ? (
                <div 
                  className="relative h-full w-full cursor-pointer"
                  onClick={() => setIsFullScreenMedia(true)}
                >
                  <ImageWithFallback 
                    src={propertyImages[safePhotoIndex]} 
                    alt={property.title} 
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.01]" 
                    testId="img-detail-main" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/80 text-center p-4">
                  <Building2 size={48} className="mb-3 text-white/55" />
                  <strong className="text-base">لا توجد صور متاحة</strong>
                  <span className="text-xs text-white/60">لم يتم رفع صور لهذا العقار حتى الآن</span>
                </div>
              )
            ) : property.video360Url ? (
              <div className="relative h-full w-full">
                <video src={property.video360Url} className="h-full w-full object-cover" controls autoPlay muted data-testid="video-tour" />
                <div className="absolute bottom-3 right-3 bg-slate-950/70 text-white text-[11px] px-3 py-1.5 rounded-lg border border-white/10">
                  فيديو جولة 360° للعقار
                </div>
              </div>
            ) : (
              <div className="hero-wash flex h-full flex-col items-center justify-center gap-3 text-center text-white p-4">
                <Sparkles className="text-primary" size={35} />
                <strong>فيديو توضيحي</strong>
                <span className="text-xs text-white/60">هذه الوحدة لا تحتوي على فيديو توضيحي متاح حالياً</span>
              </div>
            )}

            {/* Floating Top Bar on Media */}
            <div className="absolute inset-x-4 top-4 flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-2">
                {hasImages && media === "photos" && (
                  <span className="rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20 shadow">
                    صور الوحدة {safePhotoIndex + 1} / {propertyImages.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {property.video360Url && (
                  <button 
                    onClick={() => setMedia(media === "video" ? "photos" : "video")}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold backdrop-blur-md border shadow transition-all ${
                      media === "video" ? "bg-primary text-primary-foreground border-primary" : "bg-black/75 text-white border-white/20 hover:bg-primary"
                    }`}
                    data-testid="button-toggle-360-media"
                  >
                    <Sparkle size={13} /> فيديو المعاينة 360°
                  </button>
                )}
                <button
                  onClick={() => setIsFullScreenMedia(true)}
                  className="rounded-full bg-black/75 backdrop-blur-md p-2.5 text-white border border-white/20 hover:bg-primary transition-colors shadow"
                  aria-label="تكبير الصور"
                  data-testid="button-expand-media"
                >
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop & Mobile Thumbnail Bar */}
          {hasImages && media === "photos" && (
            <div className="flex gap-2.5 overflow-x-auto p-3.5 border-t border-border bg-card/70 scrollbar-none" data-testid="gallery-thumbnails">
              {propertyImages.map((img, i) => (
                <button 
                  key={img} 
                  onClick={() => { setPhoto(i); setMedia("photos"); }} 
                  className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    safePhotoIndex === i ? "border-primary scale-95 shadow-md ring-2 ring-primary/30" : "border-transparent opacity-75 hover:opacity-100"
                  }`} 
                  data-testid={`button-thumbnail-${i}`}
                >
                  <ImageWithFallback src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 6. 360 / Inspection Media Card */}
        {property.video360Url && (
          <div className="rounded-2xl border border-primary/30 bg-card p-4 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles size={20} />
              </span>
              <div>
                <strong className="block text-sm font-bold">جولة افتراضية 360°</strong>
                <span className="text-xs text-muted-foreground">معاينة تفصيلية لجميع زوايا الغرفة والسكن</span>
              </div>
            </div>
            <button
              onClick={() => setMedia("video")}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              تشغيل المعاينة
            </button>
          </div>
        )}

        {/* 7. Availability Card ("حالة التوفر والسعة السكنية الشاغرة") */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs space-y-4" data-testid="section-availability-card">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground">حالة التوفر والسعة السكنية الشاغرة</h3>
            <span className="text-xs text-muted-foreground">تحديث مباشر لحالة الأماكن الشاغرة في الوحدة</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <span className="text-xs text-muted-foreground font-medium">حالة الحجز</span>
              <span className={`font-bold text-xs px-2.5 py-1 rounded-full ${
                availablePlaces > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
              }`}>
                {availablePlaces > 0 ? "متاح للحجز الفوري" : "مكتمل"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <span className="text-xs text-muted-foreground font-medium">الأماكن المتاحة</span>
              <strong className="text-xs font-bold text-foreground">{availablePlaces} أسرة</strong>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <span className="text-xs text-muted-foreground font-medium">المقاعد المشغولة</span>
              <strong className="text-xs font-bold text-foreground">{Math.max(0, ((property as any).capacity || 1) - availablePlaces)} من {(property as any).capacity || 1} أسرة</strong>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <span className="text-xs text-muted-foreground font-medium">متاح من تاريخ</span>
              <strong className="text-xs font-bold text-emerald-600">متاح الآن فوراً</strong>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3 sm:col-span-2">
              <span className="text-xs text-muted-foreground font-medium">حالة الوحدة</span>
              <strong className="text-xs font-bold text-foreground">جاهزة للاستلام والمعاينة</strong>
            </div>
          </div>
        </section>

        {/* 8. Specifications ("مواصفات وتفاصيل السكن") */}
        <section data-testid="section-key-facts" className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">مواصفات وتفاصيل السكن</h3>
            <span className="text-xs text-muted-foreground">أهم مواصفات السكن والخدمات المقدمة</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map(([Icon, label, value]) => (
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs hover:border-primary/40 transition-colors" key={label}>
                <Icon size={18} className="mb-2 text-primary" />
                <span className="block text-[11px] text-muted-foreground">{label}</span>
                <strong className="text-xs sm:text-sm font-extrabold text-foreground">{value}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* 9. Description UX */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs" data-testid="section-description">
          <h3 className="mb-2 text-base font-bold text-foreground">وصف العقار التفصيلي</h3>
          <div className="text-sm leading-7 text-muted-foreground">
            {isDescriptionExpanded ? (
              <p>{property.rules || property.title + " - وحدة سكنية طلابية مجهزة بالكامل لتوفير بيئة مريحة وآمنة للطلاب بالقرب من الجامعات والمعاهد المصرية، مع توفير كافة المرافق والخدمات الأساسية."}</p>
            ) : (
              <p className="line-clamp-2">{property.rules || property.title + " - وحدة سكنية طلابية مجهزة بالكامل لتوفير بيئة مريحة وآمنة للطلاب بالقرب من الجامعات والمعاهد المصرية، مع توفير كافة المرافق والخدمات الأساسية."}</p>
            )}
          </div>
          <button
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className="mt-2 text-xs font-bold text-primary hover:underline"
            data-testid="button-toggle-description"
          >
            {isDescriptionExpanded ? "عرض أقل ▲" : "عرض المزيد ▼"}
          </button>
        </section>

        {/* 9. Unified Nearby Amenities Experience */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6" data-testid="section-unified-amenities">
          <button
            onClick={() => setIsUnifiedAmenitiesExpanded(!isUnifiedAmenitiesExpanded)}
            className="w-full flex items-center justify-between text-right font-bold text-foreground"
            data-testid="button-toggle-unified-amenities"
          >
            <div>
              <h3 className="text-lg font-bold">الخدمات المحيطة</h3>
              <p className="text-xs text-muted-foreground mt-1">كل ما تحتاجه حول السكن من مرافق، خدمات وأماكن قريبة</p>
            </div>
            <span className="text-sm font-bold text-primary">{isUnifiedAmenitiesExpanded ? "عرض أقل ▲" : "عرض المزيد ▼"}</span>
          </button>

          {isUnifiedAmenitiesExpanded && (
            <div className="space-y-6 pt-4 border-t border-border">
              {/* Part A: المرافق والخدمات */}
              <div data-testid="part-amenities">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold">المرافق في السكن</h4>
                  <button
                    onClick={() => setIsAllAmenitiesOpen(true)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                    data-testid="button-view-all-amenities"
                  >
                    عرض جميع المرافق ({baseAmenitiesList.length})
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {baseAmenitiesList.slice(0, 8).map((am) => (
                    <div key={am.key} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3.5 shadow-2xs">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        ✓
                      </span>
                      <div>
                        <strong className="block text-xs font-bold text-foreground">{am.name}</strong>
                        <span className="text-[10px] text-muted-foreground">{am.distance || "داخل الوحدة"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part B: الموقع وما حوله */}
              <div data-testid="part-location">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold">الموقع</h4>
                  {reviews.length > 0 && (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-600">
                      ★ {(reviews.reduce((a, b) => a + 5, 0) / reviews.length).toFixed(1)} · {reviews.length} تقييم
                    </span>
                  )}
                </div>

                <InteractiveLeafletMap
                  propertyTitle={property.title}
                  propertyAddress={property.address}
                  city={property.city}
                  university={property.university}
                  propertyLat={(property as any).lat}
                  propertyLng={(property as any).lng}
                  amenities={effectiveAmenities}
                  selectedAmenityKey={selectedAmenityKey}
                  onSelectAmenity={(item) => setSelectedAmenityKey(item.key)}
                  className="rounded-2xl overflow-hidden border border-border shadow-xs"
                />

                {/* Selected Place Card Below Map */}
                {selectedAmenityKey && dynamicAmenities.find(a => a.key === selectedAmenityKey) && (
                  (() => {
                    const item = dynamicAmenities.find(a => a.key === selectedAmenityKey)!;
                    const propLat = (property as any).lat;
                    const propLng = (property as any).lng;
                    const geoMeters = propLat && propLng && item.lat && item.lng
                      ? calcHaversineDistanceMeters(propLat, propLng, item.lat, item.lng)
                      : null;
                    const geoDistanceFormatted = geoMeters !== null
                      ? (geoMeters < 1000 ? `${Math.round(geoMeters)} م` : `${(geoMeters / 1000).toFixed(1).replace(".", "٫")} كم`)
                      : item.distance || "غير محدد";
                    return (
                      <div className="rounded-2xl border border-primary bg-primary/5 p-4 mt-4 flex justify-between items-center">
                        <div>
                          <strong className="block font-bold">{item.name}</strong>
                          <span className="text-xs text-muted-foreground">{item.iconType} • {geoDistanceFormatted}</span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Part C: أماكن قريبة */}
              <div data-testid="part-nearby">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold">أماكن قريبة</h4>
                  <button
                    onClick={() => setServicesAccordionOpen(!servicesAccordionOpen)}
                    className="text-xs font-bold text-primary"
                  >
                    {servicesAccordionOpen ? "عرض أقل" : "عرض جميع الأماكن القريبة"}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {dynamicAmenities.slice(0, servicesAccordionOpen ? undefined : 4).map((item) => {
                    const isSelected = selectedAmenityKey === item.key;
                    return (
                      <div
                        key={item.key}
                        onClick={() => setSelectedAmenityKey(item.key)}
                        className={`flex items-center justify-between gap-2 rounded-2xl border p-3.5 cursor-pointer ${
                          isSelected ? "border-primary bg-primary/10" : "border-border bg-card"
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold">{item.name}</span>
                          {(item as any).rating && (
                            <span className="text-[10px] font-bold text-amber-600">★ {(item as any).rating}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{item.iconType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 5. Booking Calendar & CTA Box */}
        <section className="rounded-3xl border border-primary/40 bg-card p-6 shadow-sm space-y-6" data-testid="section-booking-calendar">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">جدول الحجوزات ومواعيد الاستلام</h3>
              <p className="text-xs text-muted-foreground">اختر تاريخ الحجز المفضل من التقويم أدناه</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCalendarMonthOffset(prev => Math.max(0, prev - 1))}
                disabled={calendarMonthOffset === 0}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 text-xs w-7 h-7 flex items-center justify-center font-bold"
                data-testid="btn-calendar-prev"
              >
                &larr;
              </button>
              <span className="text-xs font-bold px-3 py-1.5 bg-muted rounded-lg select-none">
                {getCalendarMonthName(calendarMonthOffset)}
              </span>
              <button 
                onClick={() => setCalendarMonthOffset(prev => Math.min(3, prev + 1))}
                disabled={calendarMonthOffset === 3}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 text-xs w-7 h-7 flex items-center justify-center font-bold"
                data-testid="btn-calendar-next"
              >
                &rarr;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground mb-2">
            {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {getCalendarDays(calendarMonthOffset).map((dayObj, idx) => {
              if (!dayObj) return <div key={`empty-${idx}`} className="aspect-square" />;
              const status = getDayStatus(dayObj.date, property, availablePlaces);
              let statusClass = "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/25 border border-emerald-500/25 cursor-pointer";
              let statusLabel = "متاح";
              if (status === "reserved") {
                statusClass = "bg-amber-500/20 text-amber-700 border border-amber-500/30";
                statusLabel = "محجوز";
              } else if (status === "unavailable") {
                statusClass = "bg-red-500/10 text-red-500 opacity-50 cursor-not-allowed";
                statusLabel = "غير متاح";
              }
              const isSelectable = status === "available" && availablePlaces > 0;
              return (
                <div 
                  key={dayObj.formatted}
                  onClick={() => { if (isSelectable) onBook(dayObj.formatted); }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all p-1 shadow-2xs ${statusClass}`}
                  data-testid={`calendar-day-${dayObj.formatted}`}
                >
                  <span className="font-extrabold">{dayObj.day}</span>
                  <span className="text-[8px] opacity-80">{statusLabel}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <button onClick={onAI} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-primary bg-card px-5 py-3.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors" data-testid="button-open-ai">
              <Sparkles size={16} /> شريك بالذكاء الاصطناعي 🤖
            </button>
            <button 
              onClick={() => { if (availablePlaces > 0) onBook(); }}
              disabled={availablePlaces <= 0}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-xs font-bold shadow-lg transition-transform hover:-translate-y-0.5 ${
                availablePlaces > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              data-testid="button-open-booking"
            >
              <CalendarDays size={16} />
              {availablePlaces > 0 ? "احجز الآن وتوقيع العقد الإلكتروني" : "مكتمل الحجز بالكامل"}
            </button>
          </div>
        </section>

        {/* Owner Info & Student Reviews */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold">معلومات المالك المعتمد</h3>
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-lg border border-primary/20 shrink-0">
                {owner.fullName ? owner.fullName.charAt(0) : "م"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-bold text-foreground">{owner.fullName || "مالك معتمد في مكاني"}</strong>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    <ShieldCheck size={12} /> موثق
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">عضو معتمد في شبكة ملاك مكاني الموثقين</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold">تقييمات الطلاب السابقين</h3>
            <div className="space-y-3">
              {reviews.slice(0, 1).map((review) => (
                <div key={review.name} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="font-bold text-foreground">{review.name} ({review.university})</strong>
                    <span className="text-amber-500 font-bold">★★★★★</span>
                  </div>
                  <p className="text-muted-foreground">“{review.quote}”</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Mobile Bottom Booking Bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-4 pb-7 sm:hidden flex items-center justify-between shadow-2xl" data-testid="sticky-mobile-booking-bar">
          <div>
            <strong className="text-lg font-black text-primary block">{formatPrice(property.pricePerMonth)} <small className="text-xs font-bold">جنيه / شهر</small></strong>
            <span className="text-[10px] text-emerald-600 font-bold">{availablePlaces > 0 ? `متاح (${availablePlaces} أماكن)` : "مكتمل الحجز"}</span>
          </div>
          <button
            onClick={() => { if (availablePlaces > 0) onBook(); }}
            disabled={availablePlaces <= 0}
            className="rounded-2xl bg-primary px-7 py-3 text-xs font-bold text-primary-foreground shadow-lg disabled:opacity-50"
            data-testid="sticky-btn-book-now"
          >
            {availablePlaces > 0 ? "احجز الآن 🏠" : "مكتمل"}
          </button>
        </div>

      </div>
    </Modal>
  );
}

function CoffeeIcon() { return <span className="text-sm font-bold">ق</span>; }

function AIFlow({ onClose, openToast }: { onClose: () => void; openToast: (t: string) => void }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1); const [sleep, setSleep] = useState("مرن"); const [clean, setClean] = useState(4); const [study, setStudy] = useState("هادئ جداً"); const [smoke, setSmoke] = useState("لا"); const [pets, setPets] = useState("غير مقبول"); const [budget, setBudget] = useState("١٥٠٠ جنيه");
  const [message, setMessage] = useState("تحليل أنماط السلوك...");
  useEffect(() => { if (step !== 2) return; const messages = ["تحليل أنماط السلوك...", "معالجة بيانات ١٢,٠٠٠ طالب...", "إيجاد أفضل تطابق...", "حساب نسبة التوافق..."]; let i = 0; const interval = window.setInterval(() => { i = (i + 1) % messages.length; setMessage(messages[i]); }, 500); const timeout = window.setTimeout(() => setStep(3), 2200); return () => { clearInterval(interval); clearTimeout(timeout); }; }, [step]);
  const choices = (label: string, values: string[], value: string, set: (v: string) => void) => <div><p className="mb-2 text-sm font-bold">{label}</p><div className="flex flex-wrap gap-2">{values.map((v) => <button key={v} onClick={() => set(v)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${value === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`} data-testid={`ai-choice-${label}-${v}`}>{v}</button>)}</div></div>;
  return <Modal onClose={onClose} label="مطابقة شريك السكن"><div className="p-5 pt-14 sm:p-8 sm:pt-14">
    <div className="mb-7 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Sparkles size={25} /></div><h2 className="text-2xl font-extrabold">شريك سكن يشبهك</h2><p className="mt-1 text-sm text-muted-foreground">أخبرنا عن يومك، ونجد لك التوافق الأقرب</p></div>
    {step === 1 && <div className="space-y-6">{choices("مواعيد النوم", ["نهاري", "ليلي", "مرن"], sleep, setSleep)}<div><div className="mb-2 flex justify-between text-sm font-bold"><span>مستوى النظافة</span><span className="text-primary">{clean} / ٥</span></div><input type="range" min="1" max="5" value={clean} onChange={(e) => setClean(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" data-testid="input-cleanliness" /><div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>مرن</span><span>دقيق جداً</span></div></div>{choices("بيئة المذاكرة", ["هادئ جداً", "موسيقى هادئة", "مرن"], study, setStudy)}{choices("التدخين", ["نعم", "لا"], smoke, setSmoke)}{choices("الحيوانات الأليفة", ["مقبول", "غير مقبول"], pets, setPets)}<label className="block text-sm font-bold">الميزانية القصوى<select value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm font-normal" data-testid="select-ai-budget"><option>٨٠٠ جنيه</option><option>١٥٠٠ جنيه</option><option>٣٠٠٠ جنيه</option><option>أكثر من ٣٠٠٠ جنيه</option></select></label><button onClick={() => setStep(2)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-bold text-primary-foreground" data-testid="button-ai-analyze"><Sparkles size={17} />تحليل بالذكاء الاصطناعي</button></div>}
    {step === 2 && <div className="flex min-h-[330px] flex-col items-center justify-center text-center"><div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" /><h3 className="text-xl font-bold">{message}</h3><p className="mt-2 text-sm text-muted-foreground">نقارن تفضيلاتك مع مجتمع مكاني</p></div>}
    {step === 3 && <div><div className="mb-6 flex flex-col items-center text-center"><div className="score-ring flex h-36 w-36 items-center justify-center rounded-full [--score:94%]" style={{ "--score": "94%" } as CSSProperties}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-background"><strong className="text-3xl text-primary">٩٤٪</strong><span className="text-[11px] text-muted-foreground">توافق</span></div></div><span className="mt-4 rounded-full bg-primary/15 px-4 py-2 text-sm font-bold text-primary">توافق ممتاز</span></div><div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-700 font-bold text-white">م أ</span><div><strong className="block">مريم أحمد</strong><span className="text-xs text-muted-foreground">جامعة كفر الشيخ · طب بشري</span></div><ShieldCheck className="mr-auto text-primary" size={19} /></div><div className="space-y-3">{[["مستوى النظافة", "٨٥٪", "٩٠٪"], ["مواعيد النوم", "٧٠٪", "٧٥٪"], ["بيئة المذاكرة", "٩٥٪", "٨٨٪"], ["الالتزام المالي", "١٠٠٪", "٩٥٪"]].map(([label, you, match]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="text-muted-foreground">أنت {you} · مريم {match}</span></div><div className="flex gap-1"><div className="h-2 rounded-full bg-primary" style={{ width: you }} /><div className="h-2 rounded-full bg-accent/50" style={{ width: match }} /></div></div>)}</div><div className="mt-7 flex gap-2"><button onClick={() => { openToast("تم إرسال طلب السكن المشترك إلى مريم"); onClose(); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-primary-foreground" data-testid="button-send-roommate"><Send size={16} />إرسال طلب سكن مشترك</button><button onClick={() => setStep(1)} className="rounded-lg border border-border px-4 text-muted-foreground" aria-label="البحث مجدداً" data-testid="button-retry-ai"><RefreshCw size={17} /></button></div></div>}
  </div></Modal>;
}

function BookingFlow({ property, onClose, openToast }: { property: Property; onClose: () => void; openToast: (t: string) => void }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1); const [payment, setPayment] = useState<"paymob" | "fawry">("paymob"); const [processing, setProcessing] = useState(false);
  const pay = () => { setProcessing(true); window.setTimeout(() => { setProcessing(false); setStep(3); }, 2100); };
  return <Modal onClose={onClose} label="حجز الوحدة"><div className="p-5 pt-14 sm:p-8 sm:pt-14">
    <div className="mb-7"><div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground"><span className={step >= 1 ? "text-primary" : ""}>١ الباقة</span><div className="mx-2 h-px flex-1 bg-border" /><span className={step >= 2 ? "text-primary" : ""}>٢ الدفع</span><div className="mx-2 h-px flex-1 bg-border" /><span className={step >= 3 ? "text-primary" : ""}>٣ التأكيد</span></div></div>
    {step === 1 && <div><div className="mb-5 rounded-xl border-2 border-primary bg-primary/5 p-5"><div className="flex items-start justify-between"><div><span className="flex items-center gap-1 text-sm font-bold text-primary"><Crown size={16} />باقة مكاني السنوية</span><p className="mt-3 text-sm text-muted-foreground line-through">١,٢٠٠ جنيه</p><strong className="text-3xl">٥٠٠ <small className="text-sm font-semibold">جنيه / سنة</small></strong></div><span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">وفّر ٥٨٪</span></div><div className="mt-4 rounded-lg bg-background/70 p-3 text-xs leading-6"><strong>إيجار الوحدة المختارة: {formatPrice(property.pricePerMonth)} جنيه / شهر</strong><span className="block text-muted-foreground">يُدفع لاحقاً للمالك، منفصل عن رسوم الباقة.</span></div></div><div className="mb-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{["0% عمولة سماسرة طوال العام", "مطابقة ذكية غير محدودة لشركاء السكن", "التحقق الموثق من الوحدات السكنية", "خصم 20% على خدمات النظافة الشهرية", "إدارة مالية وعقود إلكترونية آمنة", "أولوية الحجز للوحدات الجديدة", "دعم عملاء 24/7"].map((x) => <span className="flex items-center gap-2" key={x}><Check size={15} className="shrink-0 text-primary" />{x}</span>)}</div><div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">ملاحظة مهمة:</strong> المبلغ المدفوع الآن هو رسوم باقة مكاني فقط. بعد الدفع سيتم توقيع العقد الإلكتروني فوراً، ويُدفع إيجار الوحدة مباشرة عند استلامها في موعد التسليم المتفق عليه.</div><button onClick={() => setStep(2)} className="w-full rounded-lg bg-primary py-3.5 font-bold text-primary-foreground" data-testid="button-booking-next">المتابعة للدفع<ArrowLeft className="mr-2 inline" size={17} /></button></div>}
    {step === 2 && <div><div className="mb-5 rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between text-sm"><span>باقة مكاني السنوية</span><strong>٥٠٠ جنيه</strong></div><div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground"><span>إيجار الوحدة الشهري</span><span>{formatPrice(property.pricePerMonth)} جنيه <small>(يُستحق لاحقاً)</small></span></div></div><div className="mb-4 grid gap-3 sm:grid-cols-2"><button onClick={() => setPayment("paymob")} className={`rounded-xl border p-4 text-right ${payment === "paymob" ? "border-primary bg-primary/5" : "border-border"}`} data-testid="button-payment-paymob"><div className="mb-3 flex items-center justify-between"><span className="font-extrabold text-sky-600">Paymob</span><span className={`h-4 w-4 rounded-full border-4 ${payment === "paymob" ? "border-primary" : "border-border"}`} /></div><p className="text-xs text-muted-foreground">بطاقة بنكية / محفظة إلكترونية</p></button><button onClick={() => setPayment("fawry")} className={`rounded-xl border p-4 text-right ${payment === "fawry" ? "border-primary bg-primary/5" : "border-border"}`} data-testid="button-payment-fawry"><div className="mb-3 flex items-center justify-between"><span className="font-extrabold text-amber-600">Fawry</span><span className={`h-4 w-4 rounded-full border-4 ${payment === "fawry" ? "border-primary" : "border-border"}`} /></div><p className="text-xs text-muted-foreground">ادفع في أي منفذ فوري</p></button></div>{payment === "paymob" ? <div className="space-y-3"><input inputMode="numeric" placeholder="رقم البطاقة" className="w-full rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-card-number" /><div className="grid grid-cols-2 gap-3"><input placeholder="تاريخ الانتهاء" className="rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-card-expiry" /><input placeholder="CVV" className="rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-card-cvv" /></div></div> : <div className="rounded-xl bg-muted p-4 text-sm"><p className="mb-2 text-muted-foreground">اذهب لأقرب منفذ فوري وادفع الكود خلال ٢٤ ساعة</p><div className="flex items-center justify-between rounded-lg bg-background px-3 py-3"><strong className="tracking-widest">FWR-847291</strong><button onClick={() => { navigator.clipboard?.writeText("FWR-847291"); openToast("تم نسخ كود فوري"); }} className="text-primary" aria-label="نسخ كود فوري" data-testid="button-copy-fawry"><Copy size={16} /></button></div></div>}<button onClick={pay} disabled={processing} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-70" data-testid="button-complete-payment">{processing ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />جاري معالجة الدفع بأمان...</> : <><LockKeyhole size={17} />إتمام الدفع</>}</button></div>}
    {step === 3 && <div className="py-3 text-center"><div className="mx-auto mb-5 flex h-20 w-20 animate-[toast-in_.5s_ease_both] items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"><Check size={43} /></div><h2 className="text-2xl font-extrabold">{t("booking.success.title")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("booking.success.date")} ديسمبر ٢٠٢٥</p><div className="mx-auto mt-6 max-w-sm rounded-xl bg-card p-4 text-right text-sm"><div className="mb-3 flex justify-between"><span className="text-muted-foreground">{t("booking.txNumber")}</span><strong>TXN-MKN-20241201-00847</strong></div><div className="border-t border-border pt-3 leading-6"><strong>{t("booking.deliveryDate")} {property.availableFrom}</strong><span className="mt-1 block text-xs text-muted-foreground">{t("booking.deliveryNote")}</span></div></div><div className="mt-6 flex flex-col gap-2 sm:flex-row"><button onClick={() => openToast("تم تجهيز العقد الإلكتروني للتحميل")} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-bold" data-testid="button-download-contract"><Download size={16} />{t("booking.downloadContract")}</button><button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground" data-testid="button-view-saved"><HomeIcon size={16} />{t("booking.viewSavedUnits")}</button></div></div>}
  </div></Modal>;
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) { return <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><span className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</span><div><strong className="block text-xl">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div></div>; }

function Hero({ onSearch, onAI }: { onSearch: (c: string, t: string, b: string) => void; onAI: () => void }) {
  const { user } = useUser();
  const { t } = useLanguage();
  return <section id="home" className="hero-wash mkany-grid relative overflow-hidden border-b border-border">
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
      <div className="max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-bold text-primary">
          <Sparkles size={14} />{t("hero.badge")}
        </div>
        
        <h1 className="max-w-2xl tracking-tight">
          <span className="block text-6xl sm:text-8xl font-black text-primary mb-3 sm:mb-4 tracking-tight">MKANY</span>
          <span className="block text-lg sm:text-xl font-normal text-muted-foreground/90 tracking-wide mt-2 sm:mt-3">{t("hero.tagline")}</span>
        </h1>

        {/* النبذة التعريفية الرسمية لـ MKANY */}
        <div className="mt-5 max-w-2xl rounded-2xl border border-primary/20 bg-card/70 p-4 backdrop-blur-sm shadow-sm text-right">
          <p className="text-sm font-semibold leading-7 text-foreground">
            <span className="font-extrabold text-primary">MKANY</span> {t("hero.description")}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2 space-x-reverse">
            {["س", "م", "ن", "ع", "ي"].map((x, i) => (
              <span key={x} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white ${["bg-teal-700", "bg-rose-700", "bg-amber-700", "bg-indigo-700", "bg-cyan-700"][i]}`}>{x}</span>
            ))}
          </div>
          <SignedOut>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{t("hero.joinPrompt")}</span>
              <SignUpButton mode="modal">
                <button className="text-xs font-bold text-primary hover:underline" data-testid="hero-signup-trigger">{t("hero.signupBtn")}</button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <ShieldCheck size={15} />{user?.fullName?.split(" ")[0]} ({user?.university || "Student"})
            </span>
          </SignedIn>
        </div>
      </div>
      <SearchBox onSearch={onSearch} />
      <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-primary" />{t("hero.feat1")}</span>
        <span className="flex items-center gap-2"><Sparkles size={15} className="text-primary" />{t("hero.feat2")}</span>
        <span className="flex items-center gap-2"><LockKeyhole size={15} className="text-primary" />{t("hero.feat3")}</span>
        <button onClick={onAI} className="flex items-center gap-2 text-primary hover:underline" data-testid="button-hero-ai"><Sparkles size={15} />{t("hero.aiMatchBtn")}</button>
      </div>
    </div>
  </section>;
}

function Stats() { 
  const { t } = useLanguage();
  return <section className="mx-auto grid max-w-7xl gap-3 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
    <Stat icon={<Building2 />} value={t("stats.unitsVal")} label={t("stats.unitsLabel")} />
    <Stat icon={<GraduationCap />} value={t("stats.studentsVal")} label={t("stats.studentsLabel")} />
    <Stat icon={<Heart />} value={t("stats.satVal")} label={t("stats.satLabel")} />
    <Stat icon={<CircleDollarSign />} value={t("stats.commVal")} label={t("stats.commLabel")} />
  </section>; 
}

function HowItWorks() { 
  const { t } = useLanguage();
  const steps: Array<[string, string, string, ComponentType<{ size?: number }>]> = [
    [t("how.step1.num"), t("how.step1.title"), t("how.step1.desc"), UserRound], 
    [t("how.step2.num"), t("how.step2.title"), t("how.step2.desc"), SlidersHorizontal], 
    [t("how.step3.num"), t("how.step3.title"), t("how.step3.desc"), FileText]
  ]; 
  return <section id="how" className="border-y border-border bg-card/40"><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="mb-10 max-w-lg"><p className="mb-2 text-sm font-bold text-primary">{t("how.badge")}</p><h2 className="text-3xl font-extrabold sm:text-4xl">{t("how.title")}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("how.subtitle")}</p></div><div className="grid gap-4 md:grid-cols-3">{steps.map(([num, title, text, Icon]) => <div key={num} className="relative rounded-2xl border border-border bg-background p-6 flex flex-col justify-between"><span className="text-xs font-bold text-primary">{num}</span><div><div className="my-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={21} /></div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p></div>{num === "٠١" && <SignedOut><SignUpButton mode="modal"><button className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline text-right" data-testid="button-howitworks-signup">Register Now ←</button></SignUpButton></SignedOut>}</div>)}</div></div></section>; 
}

function Testimonials({ index, setIndex }: { index: number; setIndex: (n: number) => void }) { 
  const data = [{ name: "ملك إبراهيم", university: "جامعة كفر الشيخ", initials: "م إ", quote: "وفّرت ٨٠٠ جنيه في السنة وعشت قريب من الكلية بدون ضغط", color: "bg-rose-700" }, { name: "عبد الرحمن حسن", university: "جامعة المنصورة", initials: "ع ح", quote: "الذكاء الاصطناعي طابقني مع صاحبي المثالي، زي ما اخترت بيدي", color: "bg-teal-700" }, { name: "سلمى ياسر", university: "جامعة طنطا", initials: "س ي", quote: "أول مرة أحجز غرفة بعقد حقيقي من غير سمسار", color: "bg-indigo-700" }]; 
  const item = data[index]; 
  const { t } = useLanguage();
  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="rounded-3xl border border-border bg-card p-6 sm:p-10"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-bold text-primary">{t("testimonials.badge")}</p><h2 className="text-3xl font-extrabold">{t("testimonials.title")}</h2></div><div className="flex gap-2">{data.map((_, i) => <button key={i} onClick={() => setIndex(i)} className={`h-2 rounded-full ${index === i ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40"}`} aria-label={`التقييم ${i + 1}`} data-testid={`button-testimonial-${i}`} />)}</div></div><div className="mt-10 flex max-w-3xl items-start gap-4"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${item.color}`}>{item.initials}</span><div><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><strong className="text-lg">{item.name}</strong><span className="text-xs text-muted-foreground">{item.university}</span><span className="text-sm tracking-widest text-amber-500">★★★★★</span></div><blockquote className="mt-5 text-xl font-semibold leading-9 sm:text-2xl">“{item.quote}”</blockquote></div></div></div></section>; 
}

function Footer({ 
  openToast, 
  onGoOwnersPublic, 
  onGoOwnerDashboard, 
  onGoStudentDashboard,
  onGoStudentSupport,
}: { 
  openToast: (t: string) => void;
  onGoOwnersPublic: () => void;
  onGoOwnerDashboard: () => void;
  onGoStudentDashboard: () => void;
  onGoStudentSupport: () => void;
}) { 
  const { user } = useUser();
  const { t } = useLanguage();
  const isStudent = user?.role === "student";
  const isOwner = user?.role === "owner";

  return <footer className="border-t border-border bg-card/50"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"><div><img src={logo} alt="MKANY" className="logo-mark mb-3 h-16 w-16 object-contain" /><p className="text-sm font-semibold">MKANY — {t("hero.tagline")}</p><p className="mt-3 max-w-xs text-xs leading-6 text-muted-foreground">{t("hero.description")}</p><div className="mt-5 flex items-center gap-3 text-muted-foreground"><button onClick={() => openToast("Instagram")} aria-label="Instagram" data-testid="button-instagram" className="hover:text-primary transition-colors p-1"><Instagram size={18} /></button><button onClick={() => openToast("LinkedIn")} aria-label="LinkedIn" data-testid="button-linkedin" className="hover:text-primary transition-colors p-1"><Linkedin size={18} /></button><a href="https://www.facebook.com/profile.php?id=61587153651455" target="_blank" rel="noopener noreferrer" aria-label="Facebook" data-testid="button-facebook" className="hover:text-primary transition-colors p-1"><Facebook size={18} /></a><a href="https://wa.me/201055332242" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" data-testid="button-whatsapp" className="hover:text-primary transition-colors p-1"><MessageCircle size={18} /></a></div></div>
  <div><h3 className="mb-4 text-sm font-bold">{t("footer.platform")}</h3><div className="space-y-3 text-xs text-muted-foreground"><button onClick={() => openToast("Browse properties")} className="block text-right hover:text-primary">{t("nav.explore")}</button><button onClick={() => openToast("AI Match")} className="block text-right hover:text-primary">{t("nav.aiMatch")}</button>
  {!isOwner && (
    <button onClick={onGoStudentDashboard} className="block text-right text-primary font-bold hover:underline" data-testid="footer-link-student-dashboard">{t("nav.bookings")}</button>
  )}
  </div></div>
  {!isStudent && (
    <div><h3 className="mb-4 text-sm font-bold">{t("footer.ownersPortal")}</h3><div className="space-y-3 text-xs text-muted-foreground">
      <button onClick={onGoOwnersPublic} className="block text-right text-primary font-bold hover:underline" data-testid="footer-link-owners-public">{t("nav.owners")}</button>
      <button onClick={onGoOwnerDashboard} className="block text-right hover:text-primary" data-testid="footer-link-owner-dashboard">{t("dashboard.owner")}</button>
      <button onClick={() => openToast("Listing fees")} className="block text-right hover:text-primary">Listing Fees & Packages</button>
    </div></div>
  )}
  <div><h3 className="mb-4 text-sm font-bold">{t("footer.supportCompany")}</h3><div className="space-y-3 text-xs text-muted-foreground"><button onClick={onGoStudentSupport} className="block text-right hover:text-primary transition-colors" data-testid="footer-link-support">{t("nav.support")}</button><a href="https://wa.me/201055332242" target="_blank" rel="noopener noreferrer" className="block text-right hover:text-primary transition-colors" data-testid="footer-link-contact">Contact Us</a><button onClick={() => openToast("Market report")} className="block text-right hover:text-primary">Market Report <LockKeyhole className="inline" size={11} /></button></div></div>
  </div><div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6 text-[11px] font-semibold text-muted-foreground"><span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><LockKeyhole size={13} className="text-primary" />Secure SSL</span></div><div className="mt-6 flex flex-col justify-between gap-2 text-xs text-muted-foreground sm:flex-row"><span>{t("footer.rights")}</span><span>{t("footer.tagline")}</span></div></div></footer>; 
}

function AppContent() {
  const { t } = useLanguage();
  const { user, isSignedIn, signupIntent } = useAuth();
  const showOnboarding = Boolean(isSignedIn && user && isOnboardingRequired(user));
  const [light, setLight] = useState(false); 
  const [activeView, setActiveView] = useState<ActiveViewType>("listings"); 
  const [location, setLocation] = useLocation();

  const onboardingMode: "student" | "owner" =
    signupIntent === "owner" || activeView === "ownerPublic" || activeView === "ownerDashboard" || location.startsWith("/owner") || location.startsWith("/owners")
      ? "owner"
      : "student";

  // مزامنة مسار URL مع العرض النشط عند التحميل أو الانتقال المباشر
  useEffect(() => {
    if (location === "/student" || location === "/student/dashboard") {
      setActiveView("studentDashboard");
    } else if (location === "/owner" || location === "/owner/dashboard") {
      setActiveView("ownerDashboard");
    } else if (location === "/owners") {
      setActiveView("ownerPublic");
    } else if (location === "/" || location === "/apartments") {
      setActiveView("listings");
    }
  }, [location]);

  // حماية المسارات الصارمة بناءً على دور المستخدم المعتمد من قاعدة البيانات
  useEffect(() => {
    if (!isSignedIn || !user) return;

    if (user.role === "student" && activeView === "ownerDashboard") {
      setActiveView("studentDashboard");
      setLocation("/student/dashboard");
      setToast("غير مصرح لطلاب الجامعات بزيارة لوحة المالك");
    } else if (user.role === "owner" && activeView === "studentDashboard") {
      setActiveView("ownerDashboard");
      setLocation("/owner/dashboard");
    }
  }, [user?.role, activeView, isSignedIn]);
  const [platformProperties, setPlatformProperties] = useState<PlatformProperty[]>(() => getAllPlatformProperties());
  const [selected, setSelected] = useState<Property | null>(null); 
  const [saved, setSaved] = useState<number[]>([]); 
  const [aiOpen, setAiOpen] = useState(false); 
  const [bookingOpen, setBookingOpen] = useState(false); 
  const [bookingSelectedDate, setBookingSelectedDate] = useState<string | undefined>(undefined);
  const [filterTab, setFilterTab] = useState<"all" | "available" | "top">("all"); 
  const [query, setQuery] = useState({ 
    city: "", 
    type: "", 
    budget: "", 
    text: "", 
    availableOnly: false, 
    sort: "newest" 
  }); 
  const [toast, setToast] = useState(""); 
  const [testimonial, setTestimonial] = useState(0);
  const [studentTab, setStudentTab] = useState<"bookings" | "favorites" | "profile" | "support">("bookings");
  const [ownerTab, setOwnerTab] = useState<"units" | "inspections" | "bookings" | "support">("units");

  const refreshProperties = () => {
    setPlatformProperties(getAllPlatformProperties());
  };

  useEffect(() => { 
    document.documentElement.classList.toggle("light", light); 
  }, [light]);

  useEffect(() => { 
    const timer = window.setInterval(() => setTestimonial((n) => (n + 1) % 3), 3000); 
    return () => clearInterval(timer); 
  }, []);

  useEffect(() => { 
    if (!toast) return; 
    const t = window.setTimeout(() => setToast(""), 2800); 
    return () => clearTimeout(t); 
  }, [toast]);

  // مزامنة العقارات من الخادم عند بدء تشغيل التطبيق لتحديث الأماكن الشاغرة والحجوزات الحية
  useEffect(() => {
    syncPlatformPropertiesFromApi();
  }, []);

  // مستمع تحديث بيانات العقارات ومسافات المنطقة المحيطة فوراً
  useEffect(() => {
    const handlePropsUpdated = () => {
      setPlatformProperties(getAllPlatformProperties());
    };
    window.addEventListener("mkany_properties_updated", handlePropsUpdated);
    return () => window.removeEventListener("mkany_properties_updated", handlePropsUpdated);
  }, []);

  // تحديث نافذة التفاصيل المفتوحة تلقائياً إذا عُدلت بياناتها من الآدمن
  useEffect(() => {
    if (selected) {
      const updated = platformProperties.find((p) => p.id === selected.id);
      if (updated) {
        setSelected(updated as any);
      }
    }
  }, [platformProperties]);

  const shown = useMemo(() => {
    let list = platformProperties.filter((p) => { 
      // CRITICAL SECURITY RULE: Students and public users MUST ONLY see "متاح" (approved & available) properties.
      if (p.status !== "متاح") return false;

      // Text search query matching
      const qText = (query.text || "").trim().toLowerCase();
      if (qText) {
        const matches = 
          p.title.toLowerCase().includes(qText) || 
          p.city.toLowerCase().includes(qText) || 
          p.university.toLowerCase().includes(qText) || 
          p.address.toLowerCase().includes(qText) || 
          (p.description && p.description.toLowerCase().includes(qText));
        if (!matches) return false;
      }

      // City / University filter
      if (query.city && !(p.university === query.city || p.city === query.city)) return false; 

      // Room Type filter
      if (query.type) {
        const cleanType = query.type.replace("شقة مشتركة", "شقة");
        if (!p.roomType.includes(cleanType)) return false;
      }

      // Budget filter
      if (query.budget) {
        if (query.budget.includes("٨٠٠")) {
          if (p.pricePerMonth >= 800) return false;
        } else if (query.budget.includes("١٥٠٠")) {
          if (p.pricePerMonth < 800 || p.pricePerMonth > 1500) return false;
        } else if (query.budget.includes("أكثر")) {
          if (p.pricePerMonth <= 3000) return false;
        } else {
          if (p.pricePerMonth <= 1500) return false;
        }
      }

      // Filter tabs
      const avail = p.availablePlaces ?? Math.max(0, p.bedrooms - p.currentRoommates);
      if (filterTab === "available" && avail <= 0) return false;
      if (filterTab === "top" && p.livabilityScore < 87) return false;

      // Available places only toggle
      if (query.availableOnly && avail <= 0) return false;

      return true; 
    });

    // Sorting order logic
    if (query.sort === "price_asc") {
      list.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
    } else if (query.sort === "price_desc") {
      list.sort((a, b) => b.pricePerMonth - a.pricePerMonth);
    } else if (query.sort === "livability") {
      list.sort((a, b) => b.livabilityScore - a.livabilityScore);
    } else {
      list.sort((a, b) => b.id - a.id);
    }

    return list;
  }, [platformProperties, query, filterTab]);

  // جلب وتحديث مفضلة الطالب من قاعدة بيانات PostgreSQL
  useEffect(() => {
    if (isSignedIn && user?.role === "student") {
      getStudentFavoritesApi().then((res) => {
        setSaved(res.propertyIds);
      });
    } else {
      setSaved([]);
    }
  }, [isSignedIn, user?.role]);

  // مستمع تحديث المفضلة عبر النوافذ أو الإجراءات المختلفة
  useEffect(() => {
    const handleFavUpdated = () => {
      if (isSignedIn && user?.role === "student") {
        getStudentFavoritesApi().then((res) => {
          setSaved(res.propertyIds);
        });
      }
    };
    window.addEventListener("mkany_favorites_updated", handleFavUpdated);
    return () => window.removeEventListener("mkany_favorites_updated", handleFavUpdated);
  }, [isSignedIn, user?.role]);

  const search = (city: string, type: string, budget: string, text?: string, availableOnly?: boolean, sort?: string) => { 
    setActiveView("listings"); 
    setQuery({ 
      city, 
      type, 
      budget, 
      text: text || "", 
      availableOnly: Boolean(availableOnly), 
      sort: sort || "newest" 
    }); 
    window.setTimeout(() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }), 20); 
  };

  const toggleSave = async (id: number) => {
    if (!isSignedIn) {
      setToast("يرجى تسجيل الدخول بحساب طالب لحفظ العقارات في المفضلة");
      return;
    }

    if (user?.role === "owner") {
      setToast("قائمة المفضلة مخصصة لحسابات الطلاب فقط");
      return;
    }

    const isCurrentlySaved = saved.includes(id);

    // تحديث تفاؤلي سريع للواجهة (Optimistic UI)
    setSaved((prev) => (isCurrentlySaved ? prev.filter((item) => item !== id) : [...prev, id]));

    if (isCurrentlySaved) {
      const res = await removeFavoriteApi(id);
      if (res.success) {
        setToast("تمت إزالة الوحدة من المفضلة");
        window.dispatchEvent(new CustomEvent("mkany_favorites_updated"));
      } else {
        // التراجع في حال حدوث خطأ
        setSaved((prev) => [...prev, id]);
        setToast(res.message || "فشل في إزالة العقار من المفضلة");
      }
    } else {
      const res = await addFavoriteApi(id);
      if (res.success) {
        setToast("تمت إضافة الوحدة إلى المفضلة بنجاح ❤️");
        window.dispatchEvent(new CustomEvent("mkany_favorites_updated"));
      } else {
        // التراجع في حال حدوث خطأ
        setSaved((prev) => prev.filter((item) => item !== id));
        setToast(res.message || "فشل في إضافة العقار للمفضلة");
      }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Header 
        light={light} 
        onTheme={() => setLight((x) => !x)} 
        activeView={activeView} 
        setView={setActiveView} 
        openToast={setToast}
        savedCount={saved.length}
        studentTab={studentTab}
        setStudentTab={setStudentTab}
        ownerTab={ownerTab}
        setOwnerTab={setOwnerTab}
      />

      {activeView === "listings" && (
        <>
          <Hero onSearch={search} onAI={() => setAiOpen(true)} />
          <Stats />
          <main id="discover" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-bold text-primary">{t("discover.badge")}</p>
                <h2 className="text-3xl font-extrabold">{t("discover.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{shown.length} وحدات متاحة حول جامعات مصر</p>
              </div>
              <div className="flex rounded-lg border border-border bg-card p-1 text-xs font-bold">
                <button onClick={() => setFilterTab("all")} className={`rounded-md px-3 py-2 ${filterTab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} data-testid="tab-all">{t("filter.all")}</button>
                <button onClick={() => setFilterTab("available")} className={`rounded-md px-3 py-2 ${filterTab === "available" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} data-testid="tab-available">{t("filter.available")}</button>
                <button onClick={() => setFilterTab("top")} className={`rounded-md px-3 py-2 ${filterTab === "top" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} data-testid="tab-top-rated">{t("filter.top")}</button>
              </div>
            </div>

            {shown.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((p) => (
                  <PropertyCard key={p.id} property={p} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => setSelected(p)} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                <Search className="mx-auto mb-4 text-muted-foreground" size={30} />
                <h3 className="font-bold">{t("search.noUnits")}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("search.tryChange")}</p>
                <button onClick={() => setQuery({ city: "", type: "", budget: "", text: "", availableOnly: false, sort: "newest" })} className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground" data-testid="button-reset-search">{t("search.resetBtn")}</button>
              </div>
            )}
          </main>
          <HowItWorks />
          <Testimonials index={testimonial} setIndex={setTestimonial} />
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="hero-wash rounded-3xl border border-primary/20 p-7 sm:p-12">
              <div className="max-w-2xl">
                <span className="mb-3 flex items-center gap-2 text-sm font-bold text-primary"><Zap size={16} />{t("hero.cta.easy")}</span>
                <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">{t("hero.cta.title1")}<br />{t("hero.cta.title2")}</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{t("hero.cta.desc")}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-cta-discover">{t("hero.cta.btn")}</button>
                  <SignedOut>
                    <SignUpButton mode="modal">
                      <button className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-bold text-foreground hover:bg-muted" data-testid="button-cta-signup">{t("hero.cta.signup")}</button>
                    </SignUpButton>
                  </SignedOut>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeView === "studentDashboard" && (
        <StudentDashboard 
          openToast={setToast}
          onExploreProperties={() => setActiveView("listings")}
          onViewPropertyModal={(p: unknown) => setSelected(p as Property)}
          initialTab={studentTab}
        />
      )}

      {activeView === "ownerPublic" && (
        <OwnerPublicView 
          onGoToDashboard={() => setActiveView("ownerDashboard")} 
          onOpenToast={setToast}
          onGoToStudentListings={() => setActiveView("listings")}
        />
      )}

      {activeView === "ownerDashboard" && (
        <OwnerDashboard 
          openToast={setToast} 
          onViewPublicServices={() => setActiveView("ownerPublic")}
          onViewPropertyModal={(p) => setSelected(p as Property)}
          initialTab={ownerTab}
        />
      )}

      <Footer 
        openToast={setToast} 
        onGoOwnersPublic={() => setActiveView("ownerPublic")}
        onGoOwnerDashboard={() => setActiveView("ownerDashboard")}
        onGoStudentDashboard={() => setActiveView("studentDashboard")}
        onGoStudentSupport={() => { setActiveView("studentDashboard"); setStudentTab("support"); }}
      />

      {selected && (
        <PropertyDetail 
          property={selected} 
          onClose={() => setSelected(null)} 
          onAI={() => setAiOpen(true)} 
          onBook={(date?: string) => {
            setBookingSelectedDate(date);
            setBookingOpen(true);
          }} 
          saved={saved.includes(selected.id)}
          onSave={() => toggleSave(selected.id)}
        />
      )}
      {aiOpen && <AIFlow onClose={() => setAiOpen(false)} openToast={setToast} />}
      
      {/* تدفق رفع الإيصال والربط الفوري بالواتساب بدلاً من نافذة الدفع التقليدية */}
      {bookingOpen && selected && (
        <BookingReceiptFlow 
          property={selected} 
          initialAppointmentDate={bookingSelectedDate}
          onClose={() => setBookingOpen(false)} 
          openToast={setToast}
          onGoToStudentDashboard={() => {
            setBookingOpen(false);
            setActiveView("studentDashboard");
          }}
          onSuccess={() => {
            syncPlatformPropertiesFromApi();
          }}
        />
      )}

      <OnboardingModal isOpen={showOnboarding} mode={onboardingMode} onToast={setToast} />



      {toast && <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 py-3 text-xs font-bold shadow-xl" role="status" data-testid="toast-message"><Check size={16} className="text-primary" />{toast}</div>}
    </div>
  );
}

function RootRouter() {
  const [location] = useLocation();

  // مسار الآدمن المستقل والمشفر
  const isAdminPath =
    location === "/admin" ||
    location.startsWith("/admin/") ||
    location === "/admin-secure-portal" ||
    location.startsWith("/admin-secure-portal");

  if (isAdminPath) {
    return <AdminSecurePortalPage />;
  }

  // الواجهة العامة الرئيسية للموقع (الطلاب والملاك وتصفح الوحدات)
  return <AppContent />;
}

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ErrorBoundary resetKey="/">
              <RootRouter />
            </ErrorBoundary>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ClerkAuthProvider>
    </QueryClientProvider>
  );
}

export default App;