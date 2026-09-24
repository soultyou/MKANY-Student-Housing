import React, { useState, useEffect } from "react";
import {
  ClerkAuthProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  useAuth,
} from "./components/auth/clerk-auth";
import { AdminInspectionPortal } from "./components/admin/AdminInspectionPortal";
import { CheckCircle2, ShieldCheck, Lock, LogOut, ExternalLink, ArrowLeft } from "lucide-react";

function AdminAppContent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    document.title = "لوحة التحكم والإدارة المركزية | مكاني Admin Panel";
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const mainAppUrl = (import.meta as any).env?.VITE_MAIN_APP_URL || "/";

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-bold text-sm">
        جاري التحقق من بيانات الدخول والمصادقة...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="standalone-admin-panel">
      <SignedOut>
        <div
          className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-12 text-right relative overflow-hidden"
          dir="rtl"
        >
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-md">
            <div className="mb-6 flex items-center justify-between">
              <a
                href={mainAppUrl}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} />
                العودة للتطبيق الرئيسي
              </a>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-[11px] font-bold text-purple-400">
                تطبيق الإدارة المستقل (Admin Panel)
              </span>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg">
                <Lock size={30} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                لوحة التحكم والإدارة المركزية — مكاني
              </h1>
              <p className="text-xs text-slate-400 mb-6 leading-5">
                تطبيق إدارة مستقل للآدمن والمشرفين. سجل الدخول بحساب المشرف المصرح له.
              </p>

              <SignInButton mode="modal">
                <button
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-purple-500 transition-all"
                  data-testid="admin-panel-signin-btn"
                >
                  <ShieldCheck size={18} />
                  تسجيل الدخول بصفتك مشرف
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {!isAdmin ? (
          <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-950 text-white" dir="rtl">
            <h1 className="text-2xl font-black text-rose-500 mb-4">عفواً، غير مصرح لك بالدخول إلى تطبيق الإدارة</h1>
            <p className="mb-6 text-slate-400 text-sm max-w-md">
              حسابك الحالي لا يملك صلاحية (Admin / Super Admin). تطبيق الإدارة مخصص حصرياً لفريق المشرفين والإدارة المركزية.
            </p>
            <a
              href={mainAppUrl}
              className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500 transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              العودة للتطبيق الرئيسي للطلاب والملاك
            </a>
          </div>
        ) : (
          <>
            <div className="border-b border-purple-500/20 bg-purple-950/40 px-4 py-2 text-right" dir="rtl">
              <div className="mx-auto flex max-w-7xl items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-purple-200">
                    تطبيق الإدارة المستقل • جلسة مشفرة ({user?.fullName})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={mainAppUrl}
                    className="flex items-center gap-1 font-bold text-purple-300 hover:text-white transition-colors"
                  >
                    <ExternalLink size={13} />
                    الانتقال للتطبيق الرئيسي
                  </a>
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
              onClose={() => {
                window.location.href = mainAppUrl;
              }}
              onViewStudentListings={() => {
                window.location.href = mainAppUrl;
              }}
              openToast={(msg) => setToast(msg)}
            />

            {toast && (
              <div
                className="toast-in fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/40 bg-card px-5 py-3 text-xs font-bold text-foreground shadow-2xl"
                role="status"
                data-testid="admin-toast-message"
              >
                <CheckCircle2 size={16} className="text-primary" />
                {toast}
              </div>
            )}
          </>
        )}
      </SignedIn>
    </div>
  );
}

export default function App() {
  return (
    <ClerkAuthProvider>
      <AdminAppContent />
    </ClerkAuthProvider>
  );
}
