import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ExternalLink,
  LogOut,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { AdminInspectionPortal } from "./AdminInspectionPortal";
import { SignedIn, SignedOut, SignInButton, useUser, useAuth } from "@/components/auth/clerk-auth";

export function AdminSecurePortalPage() {
  const [, setLocation] = useLocation();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [portalToast, setPortalToast] = useState("");

  useEffect(() => {
    const adminPanelUrl = (import.meta as any).env?.VITE_ADMIN_PANEL_URL;
    if (adminPanelUrl) {
      window.location.href = adminPanelUrl;
    }
  }, []);

  useEffect(() => {
    if (!portalToast) return;
    const t = window.setTimeout(() => setPortalToast(""), 2800);
    return () => clearTimeout(t);
  }, [portalToast]);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "بوابة الوصول الآمن | غرفة تحكم مكاني";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="authenticated-admin-portal">
      <SignedOut>
        <div
          className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-12 text-right relative overflow-hidden"
          dir="rtl"
        >
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-md">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => setLocation("/")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                العودة للموقع العام للطلاب
              </button>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-[11px] font-bold text-purple-400">
                مسار إداري مستقل
              </span>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg">
                <Lock size={30} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                بوابة الوصول الآمن لغرفة تحكم مكاني
              </h1>
              <p className="text-xs text-slate-400 mb-6 leading-5">
                مخصصة فقط لفريق المعاينة والتوثيق. يرجى تسجيل الدخول بحساب المشرف.
              </p>
              
              <SignInButton mode="modal">
                <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-purple-500 transition-all">
                  <ShieldCheck size={18} />
                  تسجيل الدخول عبر نظام مكاني
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {!isAdmin ? (
          <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-950 text-white" dir="rtl">
             <h1 className="text-2xl font-black text-rose-500 mb-4">عفواً، غير مصرح لك بالدخول</h1>
             <p className="mb-6 text-slate-400">هذه البوابة مخصصة للإدارة المركزية وفريق التوثيق فقط.</p>
             <button onClick={() => setLocation("/")} className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500 transition-colors">
               العودة للموقع العام
             </button>
          </div>
        ) : (
          <>
            <div className="border-b border-purple-500/20 bg-purple-950/40 px-4 py-2 text-right">
              <div className="mx-auto flex max-w-7xl items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-purple-200">
                    جلسة إدارية مشفرة نشطة
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLocation("/")}
                    className="flex items-center gap-1 font-bold text-purple-300 hover:text-white transition-colors"
                  >
                    <ExternalLink size={13} />
                    الانتقال للواجهة العامة
                  </button>
                  <span className="text-purple-400/40">|</span>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1 font-bold text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <LogOut size={13} />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </div>

            <AdminInspectionPortal
              onClose={() => setLocation("/")}
              onViewStudentListings={() => setLocation("/")}
              openToast={(msg) => setPortalToast(msg)}
            />

            {portalToast && (
              <div className="toast-in fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/40 bg-card px-5 py-3 text-xs font-bold text-foreground shadow-2xl">
                <CheckCircle2 size={16} className="text-primary" />
                {portalToast}
              </div>
            )}
          </>
        )}
      </SignedIn>
    </div>
  );
}
