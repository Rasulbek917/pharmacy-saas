export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return "0 so'm";
  return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)).replace(/,/g, ' ') + " so'm";
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function getDaysRemaining(targetDate: string | Date | null | undefined): number {
  if (!targetDate) return 0;
  const target = new Date(targetDate);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export const EXPIRY_WARNING_DAYS = Number(
  process.env.NEXT_PUBLIC_EXPIRY_WARNING_DAYS || process.env.EXPIRY_WARNING_DAYS || 90
);

export function getExpiryStatus(expiryDate: string | Date): {
  status: 'NORMAL' | 'APPROACHING' | 'EXPIRED';
  label: string;
  badgeClass: string;
} {
  const days = getDaysRemaining(expiryDate);
  if (days <= 0) {
    return {
      status: 'EXPIRED',
      label: 'Muddati tugagan',
      badgeClass: 'bg-red-100 text-red-700 border-red-200',
    };
  } else if (days <= EXPIRY_WARNING_DAYS) {
    return {
      status: 'APPROACHING',
      label: `${days} kun qoldi`,
      badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  } else {
    return {
      status: 'NORMAL',
      label: 'Normal',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
  }
}

export function getPharmacyStatusBadge(status: string): { label: string; badgeClass: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Aktiv', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'TRIAL':
      return { label: 'Sinov', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'BLOCKED':
      return { label: 'Bloklangan', badgeClass: 'bg-red-100 text-red-800 border-red-300' };
    case 'DELETED':
      return { label: 'O‘chirilgan', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
    default:
      return { label: status, badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator';
    case 'PHARMACY_ADMIN':
      return 'Dorixona Administratori';
    case 'WAREHOUSEMAN':
      return 'Omborchi';
    case 'CASHIER':
      return 'Kassir';
    default:
      return role;
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Naqd pul';
    case 'CARD':
      return 'Bank kartasi';
    case 'ELECTRONIC':
      return 'Elektron to‘lov (Click/Payme/Uzum)';
    default:
      return method;
  }
}
