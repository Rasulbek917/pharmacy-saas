export type UserRole = 'SUPER_ADMIN' | 'PHARMACY_ADMIN' | 'WAREHOUSEMAN' | 'CASHIER';

export type PharmacyStatus = 'ACTIVE' | 'TRIAL' | 'BLOCKED' | 'DELETED';

export type PaymentMethod = 'CASH' | 'CARD' | 'ELECTRONIC';

export type BatchStatus = 'NORMAL' | 'APPROACHING' | 'EXPIRED';

export type NotificationType = 
  | 'LOW_STOCK' 
  | 'EXPIRY_APPROACHING' 
  | 'EXPIRED' 
  | 'TRIAL_EXPIRING' 
  | 'SUB_EXPIRING' 
  | 'SUB_EXPIRED' 
  | 'SYSTEM';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  pharmacyId?: string | null;
  pharmacyName?: string | null;
  pharmacyStatus?: PharmacyStatus | null;
  trialDaysLeft?: number | null;
  subscriptionDaysLeft?: number | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface CartItem {
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  unit: string;
  unitPrice: number;
  purchasePrice: number;
  availableQuantity: number;
  quantity: number;
  discount: number;
  totalPrice: number;
}
