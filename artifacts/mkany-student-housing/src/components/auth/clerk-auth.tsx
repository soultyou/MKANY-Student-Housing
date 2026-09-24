import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser, SignInButton as ClerkSignInButton, SignUpButton as ClerkSignUpButton, SignOutButton as ClerkSignOutButton, useClerk } from "@clerk/clerk-react";
import { updateProfile, getProfile, setAuthTokenGetter } from "@workspace/api-client-react";
import { apiFetch } from "@/lib/api-client";

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
  subscriptionStatus?: "unpaid" | "pending_review" | "approved" | "rejected";
  subscriptionAmount?: number;
  subscriptionReceiptUrl?: string;
  subscriptionApprovedAt?: string;
}

export function isOnboardingRequired(user: StudentUser | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return false;
  
  if (user.role === "student") {
    if (
      !user.fullName ||
      user.nationalId === "00000000000000" ||
      user.phoneNumber === "01000000000" ||
      !user.nationalId ||
      !user.phoneNumber
    ) {
      return true;
    }
  } else if (user.role === "owner") {
    if (
      !user.fullName ||
      user.fullName === "مستخدم مكاني" ||
      !user.phoneNumber ||
      user.phoneNumber === "01000000000" ||
      !user.phoneNumber
    ) {
      return true;
    }
  }
  return false;
}

interface AuthContextType {
  clerkLoaded: boolean;
  clerkError: Error | null;
  user: StudentUser | null | undefined;
  isSignedIn: boolean | undefined;
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
  signupIntent: "student" | "owner";
  setSignupIntent: (intent: "student" | "owner") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function ClerkAuthProvider({ children, onToast }: { children: ReactNode; onToast?: (msg: string) => void }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const clerk = useClerk();
  
  const [sessionUser, setSessionUser] = useState<StudentUser | null>(null);
  const [signupIntent, setSignupIntentState] = useState<"student" | "owner">(() => {
    return (sessionStorage.getItem("mkany_signup_intent") as "student" | "owner") || "student";
  });

  const setSignupIntent = (intent: "student" | "owner") => {
    setSignupIntentState(intent);
    try {
      sessionStorage.setItem("mkany_signup_intent", intent);
    } catch {}
  };

  // Sync token getter for api-client
  useEffect(() => {
    if (isSignedIn && getToken) {
      setAuthTokenGetter(async () => await getToken());
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  // Sync sessionUser from DB
  useEffect(() => {
    const syncUser = async () => {
      if (!isLoaded || !isSignedIn || !clerkUser) {
        setSessionUser(null);
        return;
      }

      try {
        const profile = await getProfile();
        const dbRole = (profile?.role as "student" | "owner" | "admin" | "super_admin") || "student";
        
        setSessionUser({
          id: profile?.id || clerkUser.id,
          fullName: profile?.fullName || clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || "",
          email: profile?.email || clerkUser.primaryEmailAddress?.emailAddress || "",
          avatarUrl: profile?.avatarUrl || clerkUser.imageUrl,
          role: dbRole,
          university: profile?.university || (clerkUser.publicMetadata?.university as string) || EGYPTIAN_UNIVERSITIES[0],
          city: (clerkUser.publicMetadata?.city as string) || EGYPTIAN_CITIES[0],
          nationalId: profile?.nationalId || (clerkUser.unsafeMetadata?.nationalId as string) || "",
          phoneNumber: profile?.phoneNumber || (clerkUser.unsafeMetadata?.phoneNumber as string) || "",
          unitsCount: (clerkUser.unsafeMetadata?.unitsCount as string) || "1",
          propertyTypes: (clerkUser.unsafeMetadata?.propertyTypes as string) || "شقة كاملة",
          isVerified: profile?.isVerified ?? false,
        });
      } catch (e: any) {
        // Fallback...
      }
    };
    syncUser();
  }, [isLoaded, isSignedIn, clerkUser]);
  
  const completeUserOnboarding = async (onboardingData: any) => {
      const token = await getToken();
      if (!token) throw new Error("No session token");
      
      const updated: any = await apiFetch("/api/profile/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(onboardingData),
      });

      setSignupIntent("student");
      try {
        sessionStorage.removeItem("mkany_signup_intent");
      } catch {}

      return updated;
  };

  const switchRole = (_role: "student" | "owner" | "admin" | "super_admin") => {
    console.warn("switchRole disabled: DB role is the authoritative source of truth.");
    onToast?.("دور الحساب مسجل ومحمي من قاعدة البيانات ولا يمكن تعديله محلياً");
  };

  const updateUserProfile = async (data: Partial<StudentUser>) => {
    if (sessionUser) {
      // Do NOT allow local modification of 'role' in sessionUser
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

  return (
      <AuthContext.Provider value={{
        clerkLoaded: isLoaded,
        clerkError: null,
        user: sessionUser,
        isSignedIn,
        isLoaded,
        updateUserProfile,
        completeUserOnboarding,
        switchRole,
        openSignIn: () => clerk.openSignIn(),
        openSignUp: (props?: any) => {
          const intent = props?.intent || signupIntent;
          clerk.openSignUp({
            ...props,
            ...(intent === "owner" ? { unsafeMetadata: { role: "owner", ...(props?.unsafeMetadata || {}) } } : {})
          });
        },
        signOut: () => clerk.signOut(),
        localRoleOverride: null,
        signupIntent,
        setSignupIntent
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

export function SignUpButton({ children, mode, intent, ...props }: any) {
  const { openSignUp, setSignupIntent } = useAuth();
  const child = React.Children.only(children) as React.ReactElement<any>;
  
  return React.cloneElement(child, {
    onClick: (e: any) => {
      if (child.props && child.props.onClick) {
        child.props.onClick(e);
      }
      if (intent) {
        setSignupIntent(intent);
      }
      openSignUp({
        ...props,
        intent
      });
    }
  });
}

export function UserButton() {
  const clerk = useClerk();
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clerk && containerRef.current) {
      clerk.mountUserButton(containerRef.current);
    }
    return () => {
      if (clerk && containerRef.current) {
        clerk.unmountUserButton(containerRef.current);
      }
    }
  }, [clerk]);

  return <div ref={containerRef} className="h-8 w-8 min-w-[32px] rounded-full overflow-hidden bg-muted" />;
}
