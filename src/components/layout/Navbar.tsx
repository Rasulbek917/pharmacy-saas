"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Building2, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Menu,
  Trash2,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Lock
} from "lucide-react";
import { AuthUser } from "@/types";
import { getRoleLabel } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errorMessage";

interface NavbarProps {
  user: AuthUser;
  onToggleSidebar?: () => void;
}

export default function Navbar({ user, onToggleSidebar }: NavbarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  useEffect(() => {
    if (user.role !== "SUPER_ADMIN" && user.pharmacyId) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // silently ignore
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      // ignore
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingIds.includes(id)) return;

    setDeletingIds((prev) => [...prev, id]);
    setNotificationError(null);

    const targetItem = notifications.find((n) => n.id === id);

    try {
      const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setNotificationError(getErrorMessage(data.error, "O‘chirishda xatolik yuz berdi"));
        setDeletingIds((prev) => prev.filter((item) => item !== id));
        return;
      }

      // Success: update state
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (targetItem && !targetItem.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      setNotificationError("Aloqa xatosi. Bildirishnomani o‘chirib bo‘lmadi.");
    } finally {
      setDeletingIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isClearingAll || notifications.length === 0) return;

    setIsClearingAll(true);
    setNotificationError(null);

    try {
      const res = await fetch("/api/notifications?all=true", {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setNotificationError(getErrorMessage(data.error, "Tozalashda xatolik yuz berdi"));
        setIsClearingAll(false);
        return;
      }

      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setNotificationError("Aloqa xatosi. Bildirishnomalarni tozalab bo‘lmadi.");
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      setIsLoggingOut(false);
    }
  };

  const openPasswordModal = () => {
    setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPwdError(null);
    setPwdSuccess(null);
    setShowPasswordModal(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
      setPwdError("Barcha maydonlarni to‘ldiring");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("Yangi parol va tasdiqlash paroli mos kelmadi");
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwdForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwdError(getErrorMessage(data.error, "Parolni almashtirishda xatolik yuz berdi"));
        return;
      }
      setPwdSuccess(data.message || "Parol muvaffaqiyatli almashtirildi");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwdSuccess(null);
      }, 1800);
    } catch (err) {
      setPwdError("Server bilan bog‘lanishda xatolik. Qayta urinib ko‘ring.");
    } finally {
      setIsChangingPwd(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6 shadow-sm">
      {/* Left side: Hamburger button + Pharmacy Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          title="Menyuni ochish"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
              {user.pharmacyName || (user.role === "SUPER_ADMIN" ? "Super Admin Boshqaruvi" : "Dorixona Tizimi")}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {getRoleLabel(user.role)}
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Subscription Badge, Notifications, User Profile & Logout */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Trial or Subscription Status Badge */}
        {user.trialDaysLeft !== null && user.trialDaysLeft !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" />
            <span>Sinov: {user.trialDaysLeft} kun qoldi</span>
          </div>
        )}

        {user.subscriptionDaysLeft !== null && user.subscriptionDaysLeft !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Obuna: {user.subscriptionDaysLeft} kun faol</span>
          </div>
        )}

        {/* Notifications Icon (For Pharmacy Users) */}
        {user.role !== "SUPER_ADMIN" && (
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && unreadCount > 0) {
                  handleMarkAsRead();
                }
              }}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Bildirishnomalar"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Modal */}
            {showNotifications && (
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-600" />
                    Bildirishnomalar
                    {notifications.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {notifications.length}
                      </span>
                    )}
                  </h3>

                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={isClearingAll}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Barcha bildirishnomalarni tozalash"
                      >
                        {isClearingAll ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        <span>Tozalash</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowNotifications(false)}
                      className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Yopish"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {notificationError && (
                  <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] font-medium text-red-700 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{notificationError}</span>
                    </div>
                    <button 
                      onClick={() => setNotificationError(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <div className="mt-3 max-h-80 overflow-y-auto space-y-2.5 pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Yangi bildirishnomalar mavjud emas
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`group relative rounded-xl p-3 text-xs transition-all ${
                          notif.type === "LOW_STOCK" || notif.type === "EXPIRED"
                            ? "bg-red-50 text-red-900 border border-red-100"
                            : notif.type === "EXPIRY_APPROACHING" || notif.type === "TRIAL_EXPIRING"
                            ? "bg-amber-50 text-amber-900 border border-amber-100"
                            : "bg-slate-50 text-slate-800 border border-slate-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-bold pr-2">{notif.title}</p>
                              <p className="mt-0.5 text-slate-600 leading-relaxed">{notif.message}</p>
                              <span className="mt-1 block text-[10px] text-slate-400">
                                {new Date(notif.createdAt).toLocaleTimeString("uz-UZ", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Individual Delete X Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(notif.id, e)}
                            disabled={deletingIds.includes(notif.id)}
                            className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-white/80 transition-colors disabled:opacity-50"
                            title="O‘chirish"
                            aria-label="Bildirishnomani o‘chirish"
                          >
                            {deletingIds.includes(notif.id) ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-red-600" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Full Name */}
        <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
            <UserIcon className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {user.fullName}
          </span>
        </div>

        {/* Change Password Button */}
        <button
          onClick={openPasswordModal}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          title="Parolni almashtirish"
        >
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">Parol</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
          title="Tizimdan chiqish"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Chiqish</span>
        </button>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !isChangingPwd && setShowPasswordModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Lock className="h-5 w-5 text-emerald-600" />
                Parolni almashtirish
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Joriy parol
                </label>
                <input
                  type="password"
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  autoComplete="current-password"
                  required
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Yangi parol
                </label>
                <input
                  type="password"
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  autoComplete="new-password"
                  required
                  minLength={5}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Yangi parolni tasdiqlash
                </label>
                <input
                  type="password"
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  required
                  minLength={5}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>

              {pwdError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              {pwdSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-[#15803D] disabled:opacity-50"
                >
                  {isChangingPwd ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  <span>{isChangingPwd ? "Almashtirilmoqda..." : "Parolni almashtirish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
