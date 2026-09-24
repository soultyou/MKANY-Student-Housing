import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ar" | "en";

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation & Header
  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.explore": { ar: "استكشف السكن", en: "Explore" },
  "nav.owners": { ar: "للملاك", en: "For Owners" },
  "nav.how": { ar: "كيف تعمل مكاني؟", en: "How Mkany Works" },
  "nav.dashboard": { ar: "لوحة التحكم", en: "Dashboard" },
  "nav.bookings": { ar: "حجوزاتي", en: "My Bookings" },
  "nav.favorites": { ar: "المفضلة", en: "Favorites" },
  "nav.more": { ar: "المزيد", en: "More" },
  "nav.profile": { ar: "حسابي", en: "My Profile" },
  "nav.verification": { ar: "التحقق الجامعي", en: "University Verification" },
  "nav.support": { ar: "الدعم والمساعدة", en: "Support Center" },
  "nav.admin": { ar: "لوحة الإدارة", en: "Admin Portal" },
  "nav.owner": { ar: "لوحة المالك", en: "Owner Dashboard" },
  "nav.login": { ar: "تسجيل الدخول", en: "Sign In" },
  "nav.signup": { ar: "حساب جديد", en: "Sign Up" },
  "nav.logout": { ar: "تسجيل الخروج", en: "Log Out" },

  // Hero & Search
  "hero.badge": { ar: "سكن طلابي موثّق بالذكاء الاصطناعي", en: "AI-Verified Student Housing" },
  "hero.title": { ar: "ابحث عن السكن الطلابي المثالي في مصر", en: "Find Your Ideal Student Housing in Egypt" },
  "hero.subtitle": { ar: "آلاف الوحدات السكنية المعتمدة بالقرب من الجامعات مع حجز آمن وموثّق", en: "Thousands of verified student residences near universities with secure booking" },
  "hero.tagline": { ar: "مش بس سكن... ده حد يفهمك", en: "Not just housing... someone who understands you" },
  "hero.description": { 
    ar: "مكاني هي المنصة الذكية الأولى المتخصصة في تأمين وسكن الطلاب بجامعات مصر، تقدم وحدات موثقة، مطابقة ذكية، وعقود إلكترونية آمنة تضمن حقوق الطرفين.", 
    en: "Mkany is the premier smart platform specializing in student housing security near Egyptian universities, offering verified properties, smart matching, and secure electronic contracts." 
  },
  "hero.joinPrompt": { ar: "انضم لـ +١٢,٠٠٠ طالب مصري ·", en: "Join +12,000 Egyptian students ·" },
  "hero.signupBtn": { ar: "سجّل كطالب الآن مجاناً 🚀", en: "Register as Student Free 🚀" },
  "hero.feat1": { ar: "وحدات متحقق منها", en: "Verified Properties" },
  "hero.feat2": { ar: "مطابقة ذكية", en: "Smart Matching" },
  "hero.feat3": { ar: "عقود إلكترونية آمنة", en: "Secure Digital Contracts" },
  "hero.aiMatchBtn": { ar: "جرّب المطابقة مجاناً", en: "Try Free AI Matching" },

  "search.placeholder": { ar: "ابحث باسم العقار، الجامعة، المدينة، أو اسم الشارع...", en: "Search by property name, university, city, or street..." },
  "search.cityUniv": { ar: "المدينة / الجامعة", en: "City / University" },
  "search.type": { ar: "نوع السكن", en: "Housing Type" },
  "search.budget": { ar: "الميزانية الشهرية", en: "Monthly Budget" },
  "search.all": { ar: "الكل", en: "All" },
  "search.availableOnly": { ar: "أماكن شاغرة فقط (متاح الآن)", en: "Vacant Places Only (Available Now)" },
  "search.sort": { ar: "الترتيب:", en: "Sort by:" },
  "search.sortNewest": { ar: "أحدث العقارات", en: "Newest Properties" },
  "search.sortPriceAsc": { ar: "السعر: من الأقل للأعلى", en: "Price: Low to High" },
  "search.sortPriceDesc": { ar: "السعر: من الأعلى للأقل", en: "Price: High to Low" },
  "search.sortLivability": { ar: "الأعلى في مؤشر جودة الحياة", en: "Highest Livability Index" },
  "search.reset": { ar: "إعادة ضبط الفلاتر ↺", en: "Reset Filters ↺" },
  "search.quick": { ar: "اختيارات سريعة", en: "Quick Filters" },

  // Stats & How it works
  "stats.unitsVal": { ar: "٢,٤٠٠+", en: "2,400+" },
  "stats.unitsLabel": { ar: "وحدة سكنية مُتحقق منها", en: "Verified Residences" },
  "stats.studentsVal": { ar: "١٢,٠٠٠+", en: "12,000+" },
  "stats.studentsLabel": { ar: "طالب مسجّل", en: "Registered Students" },
  "stats.satVal": { ar: "٩٨٪", en: "98%" },
  "stats.satLabel": { ar: "نسبة رضا الطلاب", en: "Student Satisfaction" },
  "stats.commVal": { ar: "٠٪", en: "0%" },
  "stats.commLabel": { ar: "عمولة سماسرة", en: "Broker Commission" },

  "how.badge": { ar: "من البحث إلى المفتاح", en: "From Search to Keys" },
  "how.title": { ar: "ثلاث خطوات، وبيت أقرب", en: "Three Steps to a Closer Home" },
  "how.subtitle": { ar: "صممنا كل خطوة لتكون مفهومة، موثّقة، ومن غير مفاجآت في الطريق.", en: "We designed every step to be clear, verified, and free of surprises." },
  "how.step1.num": { ar: "٠١", en: "01" },
  "how.step1.title": { ar: "أنشئ حسابك مجاناً", en: "Create Free Account" },
  "how.step1.desc": { ar: "سجّل في دقيقة واحدة، واكتب تفضيلاتك لتجربة أدق.", en: "Register in 1 minute and set your preferences for accurate matching." },
  "how.step2.num": { ar: "٠٢", en: "02" },
  "how.step2.title": { ar: "اكتشف وحدات موثّقة", en: "Explore Verified Units" },
  "how.step2.desc": { ar: "فلتر حسب الجامعة، الميزانية، والمواصفات التي تهمك.", en: "Filter by university, budget, and specs that matter to you." },
  "how.step3.num": { ar: "٠٣", en: "03" },
  "how.step3.title": { ar: "احجز بأمان بدون عمولة", en: "Book Securely with Zero Commission" },
  "how.step3.desc": { ar: "وقّع العقد إلكترونياً وادفع بثقة، والإيجار للمالك مباشرة.", en: "Sign digitally, pay with confidence, and rent directly from the owner." },

  // Property Card & Details
  "property.perMonth": { ar: "جنيه / شهر", en: "EGP / month" },
  "property.verified": { ar: "موثّق ومعتمد", en: "Verified & Certified" },
  "property.available": { ar: "متاح", en: "Available" },
  "property.fullyBooked": { ar: "مكتمل الحجز", en: "Fully Booked" },
  "property.bookNow": { ar: "احجز الآن", en: "Book Now" },
  "property.saveToFavorites": { ar: "حفظ بالمفضلة", en: "Save to Favorites" },
  "property.saved": { ar: "محفوظ في المفضلة", en: "Saved in Favorites" },
  "property.share": { ar: "مشاركة", en: "Share" },
  "property.tour360": { ar: "جولة 360°", en: "360° Tour" },
  "property.model3d": { ar: "نموذج 3D", en: "3D Model" },
  "property.specifications": { ar: "أهم مواصفات السكن", en: "Key Specifications" },
  "property.description": { ar: "وصف العقار التفصيلي", en: "Detailed Description" },
  "property.amenities": { ar: "المرافق والخدمات", en: "Amenities & Services" },
  "property.rules": { ar: "قواعد السكن والسياسات", en: "Housing Rules & Policies" },
  "property.location": { ar: "الموقع على الخريطة", en: "Location on Map" },
  "property.universities": { ar: "الجامعات والمعاهد القريبة", en: "Nearby Universities & Institutes" },
  "property.nearbyServices": { ar: "الخدمات المحيطة", en: "Nearby Services" },
  "property.availabilityStatus": { ar: "حالة التوفر والسعة السكنية الشاغرة", en: "Availability & Vacancy Status" },
  "property.availableBeds": { ar: "الأماكن المتاحة", en: "Available Beds" },
  "property.occupiedBeds": { ar: "المقاعد المشغولة", en: "Occupied Beds" },
  "property.availableFrom": { ar: "متاح من تاريخ", en: "Available From" },
  "property.unitStatus": { ar: "حالة الوحدة", en: "Unit Status" },
  "property.area": { ar: "المساحة", en: "Area" },
  "property.rooms": { ar: "عدد الغرف", en: "Rooms" },
  "property.bathrooms": { ar: "الحمامات", en: "Bathrooms" },
  "property.floor": { ar: "الدور", en: "Floor" },
  "property.furnishing": { ar: "نوع الفرش", en: "Furnishing" },
  "property.reviews": { ar: "تقييمات الطلاب", en: "Student Reviews" },
  "property.noImages": { ar: "لا توجد صور متاحة", en: "No Images Available" },
  "property.noImagesDesc": { ar: "لم يتم رفع صور لهذا العقار حتى الآن", en: "No photos have been uploaded for this property yet" },
  "property.viewDetails": { ar: "عرض التفاصيل", en: "View Details" },

  // Booking
  "booking.title": { ar: "تأكيد طلب الحجز", en: "Confirm Booking Request" },
  "booking.subtitle": { ar: "اختر موعد بدء الإيجار والمدة المفضلة", en: "Choose your preferred start date and duration" },
  "booking.selectedDate": { ar: "تاريخ البدء المختار", en: "Selected Start Date" },
  "booking.duration": { ar: "مدة الإيجار", en: "Rental Duration" },
  "booking.months": { ar: "أشهر", en: "Months" },
  "booking.month": { ar: "شهر", en: "Month" },
  "booking.total": { ar: "الإجمالي المستحق", en: "Total Due" },
  "booking.confirmBtn": { ar: "تأكيد وإرسال طلب الحجز", en: "Confirm & Send Booking Request" },
  "booking.success": { ar: "تم إرسال طلب الحجز بنجاح!", en: "Booking request sent successfully!" },

  // Dashboards & Portals
  "dashboard.student": { ar: "لوحة تحكم الطالب", en: "Student Dashboard" },
  "dashboard.student.welcome": { ar: "مرحباً،", en: "Welcome," },
  "dashboard.student.verified": { ar: "طالب جامعي موثّق", en: "Verified Student" },
  "dashboard.student.university": { ar: "جامعة", en: "University" },
  "dashboard.student.nationalId": { ar: "الرقم القومي:", en: "National ID:" },
  "dashboard.student.exploreBtn": { ar: "استكشاف سكن جديد", en: "Explore New Housing" },
  "dashboard.student.aboutMkany": { ar: "نبذة عن منصة مكاني:", en: "About Mkany Platform:" },
  "dashboard.student.bookingsTab": { ar: "تفاصيل وحالة حجز السكن", en: "Housing Booking Details & Status" },
  "dashboard.student.favoritesTab": { ar: "قائمة المفضلة", en: "Favorites List" },
  "dashboard.student.profileTab": { ar: "إدارة الملف الشخصي والتوثيق", en: "Manage Profile & Verification" },
  "dashboard.student.supportTab": { ar: "الدعم والمساعدة", en: "Support & Help" },
  "dashboard.student.bookings.title": { ar: "سجل حجوزاتك السكنية", en: "Your Housing Booking History" },
  "dashboard.student.bookings.subtitle": { ar: "تتبع حالة مراجعة الإيصال وتأكيد السكن والتواصل المباشر مع إدارة مكاني", en: "Track receipt review, booking confirmation, and contact Mkany management directly" },
  "dashboard.student.bookings.whatsapp": { ar: "واتساب المراجعة:", en: "Review WhatsApp:" },
  "dashboard.student.bookings.noBookings": { ar: "لا توجد حجوزات نشطة حالياً", en: "No active bookings currently" },
  "dashboard.student.bookings.noBookingsDesc": { ar: "اختر غرفتك أو شقتك الطلابية الآن، وقم برفع إيصال الدفع اليدوي لتأكيد الحجز فوراً عبر الواتساب.", en: "Choose your room or apartment now, and upload your manual payment receipt to confirm booking immediately via WhatsApp." },
  "dashboard.student.bookings.browse": { ar: "تصفح الوحدات المتاحة", en: "Browse Available Units" },
  "dashboard.student.bookings.code": { ar: "كود الحجز", en: "Booking Code" },
  "dashboard.student.bookings.confirmed": { ar: "تم تأكيد الحجز واعتماد الإيصال", en: "Booking confirmed and receipt accepted" },
  "dashboard.student.bookings.rejected": { ar: "إيصال غير مكتمل / مرفوض", en: "Receipt incomplete / rejected" },
  "dashboard.student.bookings.pending": { ar: "قيد مراجعة الإيصال", en: "Receipt under review" },
  "dashboard.student.bookings.rent": { ar: "قيمة الإيجار", en: "Rent Value" },
  "dashboard.student.bookings.paymentMethod": { ar: "طريقة التحويل", en: "Payment Method" },
  "dashboard.student.bookings.sender": { ar: "المحول منه", en: "Sender" },
  "dashboard.student.bookings.date": { ar: "تاريخ الحجز", en: "Booking Date" },
  "dashboard.student.bookings.adminNotes": { ar: "ملاحظة الإدارة:", en: "Admin Note:" },
  "dashboard.student.bookings.viewReceipt": { ar: "معاينة إيصال الدفع", en: "View Payment Receipt" },
  "dashboard.student.bookings.ledgerOpen": { ar: "عرض الدفتر المالي وعقد الإيجار", en: "View Financial Ledger & Lease Agreement" },
  "dashboard.student.bookings.ledgerClose": { ar: "إغلاق الدفتر المالي وعقد الإيجار", en: "Close Financial Ledger & Lease Agreement" },
  "dashboard.student.bookings.whatsappContact": { ar: "تواصل مع إدارة مكاني على واتساب", en: "Contact Mkany management on WhatsApp" },
  "dashboard.student.favorites.title": { ar: "سكنك المحفوظ بالمفضلة", en: "Your Saved Favorite Housing" },
  "dashboard.student.favorites.subtitle": { ar: "العقارات المعتمدة التي قمت بحفظها للمقارنة والوصول السريع إليها أو الحجز الفوري", en: "Verified properties you've saved for comparison, quick access, or immediate booking" },
  "dashboard.student.favorites.explore": { ar: "استكشاف المزيد من الوحدات", en: "Explore More Units" },
  "dashboard.student.favorites.loading": { ar: "جاري تحميل المفضلة من السيرفر...", en: "Loading favorites from server..." },
  "dashboard.student.favorites.empty": { ar: "قائمة المفضلة فارغة حالياً", en: "Favorites list is empty" },
  "dashboard.student.favorites.emptyDesc": { ar: "لم تقم بحفظ أي وحدة سكنية بعد. أثناء تصفحك للسكن الجامعي المعتمد، اضغط على علامة القلب ❤️ لحفظ أي وحدة والرجوع إليها في أي وقت.", en: "You haven't saved any property yet. While browsing verified student housing, click the heart ❤️ icon to save any unit and return to it anytime." },
  "dashboard.student.favorites.remove": { ar: "إزالة من المفضلة", en: "Remove from favorites" },
  "dashboard.student.favorites.verified": { ar: "موثق", en: "Verified" },
  "dashboard.student.favorites.available": { ar: "متاح للحجز", en: "Available for booking" },
  "dashboard.student.favorites.perMonth": { ar: "ج.م / شهر", en: "EGP / month" },
  "dashboard.student.favorites.rooms": { ar: "غرف", en: "Rooms" },
  "dashboard.student.favorites.livability": { ar: "جودة المعيشة", en: "Livability Score" },
  "dashboard.student.favorites.viewDetails": { ar: "عرض تفاصيل العقار", en: "View Property Details" },
  "dashboard.student.profile.title": { ar: "بيانات الطالب الجامعي", en: "Student Data" },
  "dashboard.student.profile.subtitle": { ar: "البيانات المطلوبة لتوثيق عقود السكن وضمان الحقوق القانونية", en: "Data required to certify housing contracts and ensure legal rights" },
  "dashboard.student.profile.savedSuccess": { ar: "تم حفظ التعديلات بنجاح ومزامنتها في جدول users!", en: "Changes saved successfully and synced to users table!" },
  "dashboard.student.profile.fullName": { ar: "الاسم الرباعي الكامل", en: "Full Name" },
  "dashboard.student.profile.nationalId": { ar: "الرقم القومي (14 رقماً)", en: "National ID (14 digits)" },
  "dashboard.student.profile.nationalIdNote": { ar: "مطابق لبطاقة الرقم القومي لتوثيق العقد الإلكتروني وحفظ حقوقك", en: "Matches national ID card to certify electronic contract and protect your rights" },
  "dashboard.student.profile.phone": { ar: "رقم التليفون / واتساب", en: "Phone Number / WhatsApp" },
  "dashboard.student.profile.university": { ar: "الجامعة المقيد بها", en: "Enrolled University" },
  "dashboard.student.profile.faculty": { ar: "الكلية / التخصص", en: "Faculty / Major" },
  "dashboard.student.profile.facultyPlaceholder": { ar: "مثال: كلية الطب البشري", en: "Example: Faculty of Medicine" },
  "dashboard.student.profile.academicYear": { ar: "الفرقة الدراسية", en: "Academic Year" },
  "dashboard.student.profile.email": { ar: "البريد الإلكتروني", en: "Email Address" },
  "dashboard.student.profile.emailNote": { ar: "البريد الإلكتروني المعتمد لتسجيل الدخول وإشعارات الحجز", en: "Verified email for sign-in and booking notifications" },
  "dashboard.student.profile.saveBtn": { ar: "حفظ ومزامنة بيانات الطالب", en: "Save and Sync Student Data" },
  "dashboard.student.profile.status": { ar: "حالة الحساب", en: "Account Status" },
  "dashboard.student.profile.verified": { ar: "موثق", en: "Verified" },
  "dashboard.student.profile.verifiedDesc": { ar: "حساب طالب موثق ومعتمد رسمياً ✓", en: "Officially verified and certified student account ✓" },
  "dashboard.student.profile.pending": { ar: "قيد التحقق", en: "Under Verification" },
  "dashboard.student.profile.pendingDesc": { ar: "بياناتك قيد التدقيق والمراجعة بواسطة إدارة مكاني", en: "Your data is under audit and review by Mkany management" },
  "dashboard.student.profile.actionNeeded": { ar: "يحتاج إجراء", en: "Action Needed" },
  "dashboard.student.profile.actionNeededDesc": { ar: "يرجى إدخال الرقم القومي المكون من ١٤ رقماً لطلب التوثيق", en: "Please enter the 14-digit national ID to request verification" },
  "dashboard.student.profile.about": { ar: "توثيق حسابك الجامعي يمنحك الأولوية في حجز الشقق المميزة، والاستفادة من ضمان عقود مكاني الموثقة بدون أي عمولة سماسرة.", en: "Verifying your university account gives you priority in booking premium apartments and benefiting from Mkany certified contract guarantees with zero broker commission." },
  "dashboard.student.profile.nationalIdLabel": { ar: "الرقم القومي (١٤ رقماً):", en: "National ID (14 digits):" },

  // Footer & General
  "footer.platform": { ar: "المنصة", en: "Platform" },
  "footer.ownersPortal": { ar: "بوابة الملاك", en: "Owners Portal" },
  "footer.supportCompany": { ar: "الدعم والشركة", en: "Support & Company" },
  "footer.rights": { ar: "جميع الحقوق محفوظة منصة مكاني للسكن الطلابي © 2026", en: "All rights reserved Mkany Student Housing Platform © 2026" },
  "footer.tagline": { ar: "المنصة الأولى الموثوقة لتسكين الطلاب بالقرب من الجامعات المصرية", en: "The #1 trusted platform for student housing near Egyptian universities" },

  // Testimonials
  "testimonials.badge": { ar: "من مجتمع مكاني", en: "From Mkany Community" },
  "testimonials.title": { ar: "السكن الصح يغيّر يومك", en: "The right housing changes your day" },

  // Discover & Search
  "discover.badge": { ar: "مختارات تناسب يومك", en: "Selected for your day" },
  "discover.title": { ar: "وحدات موثّقة للطلاب", en: "Verified Student Units" },
  "discover.subtitle.prefix": { ar: "", en: "" },
  "discover.subtitle.suffix": { ar: " وحدات متاحة حول جامعات مصر", en: " units available around Egyptian universities" },
  "filter.all": { ar: "الكل", en: "All" },
  "filter.available": { ar: "متاح الآن", en: "Available Now" },
  "filter.top": { ar: "الأكثر تقييماً", en: "Top Rated" },
  "search.noUnits": { ar: "لم نجد وحدات بهذه المواصفات", en: "No units found matching these criteria" },
  "search.tryChange": { ar: "جرّب تغيير المدينة أو الميزانية", en: "Try changing city or budget" },
  "booking.success.title": { ar: "تم الدفع بنجاح!", en: "Payment successful!" },
  "booking.success.date": { ar: "عضويتك سارية حتى:", en: "Your membership is valid until:" },
  "booking.txNumber": { ar: "رقم العملية", en: "Transaction Number" },
  "booking.deliveryDate": { ar: "موعد استلام الوحدة المتوقع:", en: "Expected property handover date:" },
  "booking.deliveryNote": { ar: "سيتم تسليم المفاتيح ودفع الإيجار الشهري مباشرة للمالك في هذا الموعد.", en: "Keys will be handed over and monthly rent paid directly to the owner on this date." },
  "booking.downloadContract": { ar: "تحميل العقد الإلكتروني", en: "Download Electronic Contract" },
  "booking.viewSavedUnits": { ar: "استعرض وحداتك المحفوظة", en: "View your saved units" },
  "toast.unauthorizedOwner": { ar: "غير مصرح لطلاب الجامعات بزيارة لوحة المالك", en: "Students are not authorized to visit the owner dashboard" },
  "toast.loginForFavorites": { ar: "يرجى تسجيل الدخول بحساب طالب لحفظ العقارات في المفضلة", en: "Please log in with a student account to save properties to favorites" },
  "toast.favoritesStudentOnly": { ar: "قائمة المفضلة مخصصة لحسابات الطلاب فقط", en: "Favorites list is for student accounts only" },
  "toast.removedFavorite": { ar: "تمت إزالة الوحدة من المفضلة", en: "Unit removed from favorites" },
  "toast.failedRemoveFavorite": { ar: "فشل في إزالة العقار من المفضلة", en: "Failed to remove property from favorites" },
  "toast.addedFavorite": { ar: "تمت إضافة الوحدة إلى المفضلة بنجاح ❤️", en: "Unit added to favorites successfully ❤️" },
  "toast.failedAddFavorite": { ar: "فشل في إضافة العقار للمفضلة", en: "Failed to add property to favorites" },
  "search.unitsAvailable": { ar: "وحدات متاحة حول جامعات مصر", en: "units available around Egyptian universities" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "ar",
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("mkany_lang");
    return (saved === "en" || saved === "ar") ? saved : "ar";
  });

  useEffect(() => {
    localStorage.setItem("mkany_lang", language);
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
