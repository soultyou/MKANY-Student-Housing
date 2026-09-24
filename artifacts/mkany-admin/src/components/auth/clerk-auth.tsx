import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { Clerk } from "@clerk/clerk-js";
import { updateProfile, getProfile, setAuthTokenGetter } from "@workspace/api-client-react";

export const EGYPTIAN_UNIVERSITIES = [
  "جامعة كفر الشيخ", "جامعة المنصورة", "جامعة طنطا", "جامعة الإسكندرية", "جامعة القاهرة",
  "جامعة عين شمس", "جامعة الزقازيق", "جامعة دمياط", "جامعة حلوان", "جامعة بنها",
  "جامعة أسيوط", "جامعة قناة السويس", "الجامعة المصرية اليابانية (E-JUST)", "جامعة زويل للعلوم والتكنولوجيا", "جامعة أخرى"
];

export const EGYPTIAN_CITIES = [
  "كفر الشيخ", "المنصورة (الدقهلية)", "طنطا (الغربية)", "الإسكندرية", "القاهرة", "الجيزة",
  "الزقازيق (الشرقية)", "دمياط", "شبين الكوم (المنوفية)", "بنها (القليوبية)", "أسيوط",
  "الإسماعيلية", "السويس", "بورسعيد", "محافظة / مدينة أخرى"
];

export interface StudentUser {
  id: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  email: string;
  university: string;
  city: string;
  unitsCount: string;
  propertyTypes: string;
  avatarUrl?: string;
  role: "student" | "owner" | "admin" | "super_admin";
  isVerified: boolean;
}

export function isOnboardingRequired(user: StudentUser | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin" || user.role === "owner") return false;
  if (
    !user.fullName ||
    user.nationalId === "00000000000000" ||
    user.phoneNumber === "01000000000" ||
    !user.nationalId ||
    !user.phoneNumber
  ) {
    return true;
  }
  return false;
}

interface AuthContextType {
  clerk: Clerk | null;
  clerkLoaded: boolean;
  clerkError: Error | null;
  user: StudentUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  updateUserProfile: (data: Partial<StudentUser>) => void;
  completeUserOnboarding: (onboardingData: {
    accountType: "student" | "owner";
    fullName: string;
    phoneNumber: string;
    nationalId?: string;
    university?: string;
    avatarUrl?: string;
  }) => Promise<any>;
  switchRole: (role: "student" | "owner" | "admin" | "super_admin") => void;
  openSignIn: (props?: any) => void;
  openSignUp: (props?: any) => void;
  signOut: () => Promise<void>;
  localRoleOverride: "student" | "owner" | "admin" | "super_admin" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  (typeof window !== "undefined" ? (window as any).__CLERK_PUBLISHABLE_KEY__ : "");

let clerkInstance: Clerk | null = null;

export function ClerkAuthProvider({ children, onToast }: { children: ReactNode; onToast?: (msg: string) => void }) {
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [clerkError, setClerkError] = useState<Error | null>(null);
  const [localRole] = useState<"student" | "owner" | "admin" | "super_admin" | null>(null);
  const [sessionUser, setSessionUser] = useState<StudentUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const handleAuthUpdate = async (clerk: Clerk) => {
    const session = clerk.session;
    const user = clerk.user;
    const signedIn = Boolean(session);

    setIsSignedIn(signedIn);

    if (session) {
      setAuthTokenGetter(async () => await session.getToken());
    } else {
      setAuthTokenGetter(null);
    }

    if (user && session) {
      try {
        const profile = await getProfile();
        const dbRole = (profile?.role as "student" | "owner" | "admin" | "super_admin") || "student";
        
        setSessionUser({
          id: profile?.id || user.id,
          fullName: profile?.fullName || user.fullName || user.primaryEmailAddress?.emailAddress || "",
          email: profile?.email || user.primaryEmailAddress?.emailAddress || "",
          avatarUrl: profile?.avatarUrl || user.imageUrl,
          role: dbRole,
          university: profile?.university || (user.publicMetadata?.university as string) || EGYPTIAN_UNIVERSITIES[0],
          city: (user.publicMetadata?.city as string) || EGYPTIAN_CITIES[0],
          nationalId: profile?.nationalId || (user.unsafeMetadata?.nationalId as string) || "",
          phoneNumber: profile?.phoneNumber || (user.unsafeMetadata?.phoneNumber as string) || "",
          unitsCount: (user.unsafeMetadata?.unitsCount as string) || "1",
          propertyTypes: (user.unsafeMetadata?.propertyTypes as string) || "شقة كاملة",
          isVerified: profile?.isVerified ?? false,
        });
      } catch (e) {
        console.error("Failed to fetch profile from DB", e);
        setSessionUser({
          id: user.id,
          fullName: user.fullName || user.primaryEmailAddress?.emailAddress || "",
          email: user.primaryEmailAddress?.emailAddress || "",
          avatarUrl: user.imageUrl,
          role: (user.publicMetadata?.role as "student" | "owner" | "admin" | "super_admin") || "student",
          university: (user.publicMetadata?.university as string) || EGYPTIAN_UNIVERSITIES[0],
          city: (user.publicMetadata?.city as string) || EGYPTIAN_CITIES[0],
          nationalId: (user.unsafeMetadata?.nationalId as string) || "",
          phoneNumber: (user.unsafeMetadata?.phoneNumber as string) || "",
          unitsCount: (user.unsafeMetadata?.unitsCount as string) || "1",
          propertyTypes: (user.unsafeMetadata?.propertyTypes as string) || "شقة كاملة",
          isVerified: (user.publicMetadata?.isVerified as boolean) || false,
        });
      }
    } else {
      setSessionUser(null);
    }
    setIsHydrated(true);
  };

  useEffect(() => {
    if (!publishableKey || !publishableKey.startsWith("pk_")) {
      console.warn("VITE_CLERK_PUBLISHABLE_KEY is not set or invalid.");
      setClerkLoaded(true);
      setIsHydrated(true);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const initClerk = async () => {
      if (!clerkInstance) {
        clerkInstance = new Clerk(publishableKey);
      }
      try {
        if (!clerkLoaded) {
          await clerkInstance.load({});
        }

        await handleAuthUpdate(clerkInstance);

        unsubscribe = clerkInstance.addListener(async () => {
          if (clerkInstance) {
            await handleAuthUpdate(clerkInstance);
          }
        });

        setClerkLoaded(true);
      } catch (error) {
        console.error("Clerk initialization failed", error);
        setClerkError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initClerk();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const switchRole = (_role: "student" | "owner" | "admin" | "super_admin") => {
    console.warn("switchRole disabled: DB role is the authoritative source of truth.");
    onToast?.("دور الحساب مسجل ومحمي من قاعدة البيانات ولا يمكن تعديله محلياً");
  };

  const updateUserProfile = async (data: Partial<StudentUser>) => {
    if (sessionUser) {
      const { role: _ignoredRole, ...safeData } = data;
      setSessionUser({ ...sessionUser, ...safeData });
    }
    
    const backendData: any = {};
    if (data.fullName !== undefined) backendData.fullName = data.fullName;
    if (data.nationalId !== undefined) backendData.nationalId = data.nationalId;
    if (data.phoneNumber !== undefined) backendData.phoneNumber = data.phoneNumber;
    if (data.university !== undefined) backendData.university = data.university;
    if (data.avatarUrl !== undefined) backendData.avatarUrl = data.avatarUrl;
    
    if (Object.keys(backendData).length > 0 && isSignedIn) {
       try {
           const updated = await updateProfile(backendData);
           if (updated) {
             setSessionUser((prev) =>
               prev
                 ? {
                     ...prev,
                     fullName: updated.fullName || prev.fullName,
                     nationalId: updated.nationalId || prev.nationalId,
                     phoneNumber: updated.phoneNumber || prev.phoneNumber,
                     university: updated.university || prev.university,
                     avatarUrl: updated.avatarUrl || prev.avatarUrl,
                     isVerified: updated.isVerified ?? prev.isVerified,
                   }
                 : null
             );
           }
           onToast?.("تم تحديث بيانات الحساب.");
       } catch (error) {
           console.error("Failed to update profile to backend", error);
           onToast?.("حدث خطأ في مزامنة البيانات مع الخادم");
       }
    } else {
       onToast?.("تم تحديث بيانات الحساب.");
    }
  };

  const completeUserOnboarding = async (onboardingData: {
    accountType: "student" | "owner";
    fullName: string;
    phoneNumber: string;
    nationalId?: string;
    university?: string;
    avatarUrl?: string;
  }) => {
    try {
      const response = await fetch("/api/profile/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(clerkInstance?.session ? { Authorization: `Bearer ${await clerkInstance.session.getToken()}` } : {}),
        },
        body: JSON.stringify(onboardingData),
      });

      if (!response.ok) {
        const errorRes = await response.json().catch(() => ({}));
        const message = errorRes?.error || "حدث خطأ أثناء حفظ بيانات التسجيل.";
        onToast?.(message);
        throw new Error(message);
      }

      const updated = await response.json();
      if (updated) {
        setSessionUser({
          id: updated.id,
          fullName: updated.fullName || "",
          email: updated.email || "",
          avatarUrl: updated.avatarUrl || "",
          role: updated.role || "student",
          university: updated.university || EGYPTIAN_UNIVERSITIES[0],
          city: EGYPTIAN_CITIES[0],
          nationalId: updated.nationalId || "",
          phoneNumber: updated.phoneNumber || "",
          unitsCount: "1",
          propertyTypes: "شقة كاملة",
          isVerified: updated.isVerified ?? false,
        });
        onToast?.("تم إكمال وإنشاء الحساب بنجاح!");
        return updated;
      }
    } catch (error: any) {
      console.error("Failed to complete onboarding", error);
      throw error;
    }
  };

  if (clerkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-rose-500 mb-2">تعذر تحميل خدمة تسجيل الدخول</h1>
        <p className="text-slate-400 mb-4">{clerkError.message}</p>
      </div>
    );
  }

  const isFullyLoaded = clerkLoaded && isHydrated;

  if (!isFullyLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-4 text-center" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <h1 className="text-lg font-bold text-slate-300">جاري التحقق من هوية الحساب وصلاحيات الإدارة...</h1>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      clerk: clerkInstance,
      clerkLoaded,
      clerkError,
      user: sessionUser,
      isSignedIn,
      isLoaded: isFullyLoaded,
      updateUserProfile,
      completeUserOnboarding,
      switchRole,
      openSignIn: (props?: any) => {
        if (!clerkInstance) {
          onToast?.("يرجى ضبط مفتاح VITE_CLERK_PUBLISHABLE_KEY لتسجيل الدخول الفعلي");
          return;
        }
        try {
          clerkInstance.openSignIn(props);
        } catch (err) {
          console.error("Failed to open Clerk sign-in modal:", err);
        }
      },
      openSignUp: (props?: any) => {
        if (!clerkInstance) {
          onToast?.("يرجى ضبط مفتاح VITE_CLERK_PUBLISHABLE_KEY لإنشاء حساب فعلي");
          return;
        }
        try {
          clerkInstance.openSignUp(props);
        } catch (err) {
          console.error("Failed to open Clerk sign-up modal:", err);
        }
      },
      signOut: async () => {
        if (clerkInstance) {
          await clerkInstance.signOut();
          await handleAuthUpdate(clerkInstance);
        }
      },
      localRoleOverride: localRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a ClerkAuthProvider");
  }
  return context;
}

export function useUser() {
  const context = useAuth();
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user
  };
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  return !isSignedIn ? <>{children}</> : null;
}

export function SignInButton({ children, mode, ...props }: any) {
  const { openSignIn } = useAuth();
  const child = React.Children.only(children) as React.ReactElement<any>;
  
  return React.cloneElement(child, {
    onClick: (e: any) => {
      if (child.props && child.props.onClick) {
        child.props.onClick(e);
      }
      openSignIn(props);
    }
  });
}

export function UserButton() {
  const { clerkLoaded, clerk } = useAuth();
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clerkLoaded && clerk && containerRef.current) {
      clerk.mountUserButton(containerRef.current);
    }
    return () => {
      if (clerkLoaded && clerk && containerRef.current) {
        clerk.unmountUserButton(containerRef.current);
      }
    }
  }, [clerkLoaded, clerk]);

  return <div ref={containerRef} className="h-8 w-8 min-w-[32px] rounded-full overflow-hidden bg-muted" />;
}
