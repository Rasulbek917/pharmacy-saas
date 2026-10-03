"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill, Lock, User, AlertCircle, ShieldAlert, ArrowRight } from "lucide-react";
import { getErrorMessage } from "@/lib/errorMessage";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("Iltimos, login va parolni kiriting!");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsBlocked(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.isBlocked) {
          setIsBlocked(true);
        } else {
          setErrorMsg(getErrorMessage(data.error, "Login yoki parol noto‘g‘ri!"));
        }
        setIsLoading(false);
        return;
      }

      // Redirect based on role
      const role = data.user?.role;
      if (role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (role === "PHARMACY_ADMIN") {
        router.push("/admin");
      } else if (role === "WAREHOUSEMAN") {
        router.push("/omborchi");
      } else if (role === "CASHIER") {
        router.push("/kassir");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch (err) {
      setErrorMsg("Server bilan bog‘lanishda xatolik yuz berdi. Qayta urinib ko‘ring.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8FAFC] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A] text-white shadow-xl shadow-emerald-500/20">
            <Pill className="h-9 w-9" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl">
          DORIXONA <span className="text-[#16A34A]">SaaS</span>
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-500 font-medium">
          Ko‘p dorixonali professional boshqaruv tizimi
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          {/* Normal Error Alert */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Kirishda xatolik</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Blocked Subscription Alert (Exact requirement from Spec Section 9) */}
          {isBlocked && (
            <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900 animate-in fade-in">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 shrink-0 text-red-600" />
                <div>
                  <h4 className="font-bold text-sm text-red-800">Dorixona hisobi bloklangan!</h4>
                  <p className="mt-1 font-medium">
                    Obunangiz tugagan. Tizimdan foydalanishni davom ettirish uchun obunani yangilang.
                  </p>
                  <p className="mt-2 text-[11px] text-slate-600">
                    Barcha ma’lumotlaringiz (dorilar, ombor, hisobotlar) xavfsiz saqlanmoqda. Obunani qayta
                    faollashtirish uchun platforma Super Administratoriga murojaat qiling.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Foydalanuvchi logini
              </label>
              <div className="relative mt-1.5 rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Loginni kiriting"
                  required
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Parol
              </label>
              <div className="relative mt-1.5 rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolni kiriting"
                  required
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#16A34A] focus:outline-none focus:ring-1 focus:ring-[#16A34A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-[#15803D] focus:outline-none transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Tizimga kirish</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
