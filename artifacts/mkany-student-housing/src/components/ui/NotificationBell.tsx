import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, BellOff, ExternalLink } from "lucide-react";
import { useUser } from "@/components/auth/clerk-auth";
import { 
  Notification, 
  getNotificationsApi, 
  markAllReadApi, 
  markReadApi 
} from "@/lib/notifications-client";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isLoaded, isSignedIn } = useUser();

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isLoaded || !isSignedIn) return;
    try {
      const data = await getNotificationsApi();
      setNotifications(data);
    } catch (err) {
      // Suppress when unauthenticated
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchNotifications();
    // Auto-refresh every 30 seconds to keep live notifications updated
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    const success = await markAllReadApi();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
    setLoading(false);
  };

  const handleMarkRead = async (id: string) => {
    const success = await markReadApi(id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "الآن";
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      return `منذ ${diffDays} يوم`;
    } catch {
      return "";
    }
  };

  return (
    <div className="relative" ref={dropdownRef} id="notification-bell-container">
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center h-10 w-10 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors focus:outline-none"
        aria-label="الإشعارات"
        data-testid="notification-bell-btn"
      >
        <Bell size={18} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-background animate-pulse" data-testid="notification-unread-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-xl z-50 overflow-hidden text-right" data-testid="notification-dropdown">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-bold text-primary hover:underline transition-all disabled:opacity-50"
                data-testid="notification-read-all-btn"
              >
                قراءة الكل
              </button>
            )}
            <h3 className="text-sm font-black flex items-center gap-1.5 text-foreground">
              <span>الإشعارات</span>
              <span className="text-[11px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{notifications.length}</span>
            </h3>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <BellOff size={28} className="text-muted-foreground/45 mb-2" />
                <p className="text-xs font-bold">لا توجد إشعارات حالياً</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">سنخطرك بأحدث تحديثات الحجز وحالة السكن هنا.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 transition-colors hover:bg-muted/30 flex gap-3 text-right ${!item.read ? "bg-primary/5 border-r-2 border-primary" : ""}`}
                  data-testid={`notification-item-${item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground/85 flex items-center gap-1">
                        {formatTime(item.createdAt)}
                      </span>
                      <h4 className="text-xs font-black text-foreground">{item.title}</h4>
                    </div>
                    <p className="text-[11px] leading-normal text-muted-foreground/90 font-medium whitespace-pre-line">{item.body}</p>
                    
                    {!item.read && (
                      <div className="flex justify-start mt-2">
                        <button
                          onClick={() => handleMarkRead(item.id)}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                          data-testid={`notification-mark-read-${item.id}`}
                        >
                          <Check size={12} />
                          تعليم كمقروء
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
