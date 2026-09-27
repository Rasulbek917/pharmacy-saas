"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ScrollText,
  Pill,
  Boxes,
  ArrowDownToLine,
  ShoppingCart,
  RotateCcw,
  Users,
  Truck,
  UserCog,
  BarChart3,
  CalendarClock,
  BadgePercent,
  Receipt,
  X,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { AuthUser, UserRole } from "@/types";

interface SidebarProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const getNavItems = (role: UserRole): NavItem[] => {
    switch (role) {
      case "SUPER_ADMIN":
        return [
          { label: "Boshqaruv paneli", href: "/super-admin", icon: LayoutDashboard },
          { label: "Dorixonalar", href: "/super-admin/dorixonalar", icon: Building2 },
          { label: "Obuna va Sinov", href: "/super-admin/obunalar", icon: CreditCard },
          { label: "Tizim jurnali (Audit)", href: "/super-admin/audit-log", icon: ScrollText },
        ];

      case "PHARMACY_ADMIN":
        return [
          { label: "Bosh sahifa", href: "/admin", icon: LayoutDashboard },
          { label: "Dorilar katalogi", href: "/admin/dorilar", icon: Pill },
          { label: "Ombor va partiyalar", href: "/admin/ombor", icon: Boxes },
          { label: "Tezkor kirim", href: "/omborchi/kirim", icon: ArrowDownToLine },
          { label: "Sotuvlar tarixi", href: "/admin/sotuvlar", icon: ShoppingCart },
          { label: "Qaytarishlar", href: "/admin/qaytarishlar", icon: RotateCcw },
          { label: "Mijozlar bazasi", href: "/admin/mijozlar", icon: Users },
          { label: "Yetkazib beruvchilar", href: "/admin/yetkazib-beruvchilar", icon: Truck },
          { label: "Xodimlar boshqaruvi", href: "/admin/xodimlar", icon: UserCog },
          { label: "Hisobotlar va Tahlil", href: "/admin/hisobotlar", icon: BarChart3 },
          { label: "Sozlamalar", href: "/admin/sozlamalar", icon: Settings },
        ];

      case "WAREHOUSEMAN":
        return [
          { label: "Bosh sahifa", href: "/omborchi", icon: LayoutDashboard },
          { label: "Ombor qoldiqlari", href: "/admin/ombor", icon: Boxes },
          { label: "Tezkor kirim (Kamera/USB)", href: "/omborchi/kirim", icon: ArrowDownToLine },
          { label: "Partiyalar va muddat", href: "/omborchi/partiyalar", icon: CalendarClock },
          { label: "Dori qo‘shish", href: "/admin/dorilar", icon: Pill },
        ];

      case "CASHIER":
        return [
          { label: "POS Savdo terminali", href: "/kassir", icon: BadgePercent },
          { label: "Mening sotuvlarim", href: "/kassir/tarixim", icon: Receipt },
          { label: "Tovarni qaytarish", href: "/kassir/qaytarish", icon: RotateCcw },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems(user.role);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-[#0F172A] text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#16A34A] text-white shadow-md">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wide text-white">
                DORIXONA <span className="text-[#16A34A]">SaaS</span>
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                Boshqaruv Tizimi
              </p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Asosiy menyu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#16A34A] text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Security badge at bottom */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
            <span>Multi-tenant Xavfsiz Tizim</span>
          </div>
        </div>
      </aside>
    </>
  );
}
