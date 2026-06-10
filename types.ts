export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  AGENT = 'agent'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered'
}

export enum Network {
  MTN = 'MTN',
  VODAFONE = 'Telecel',
  AT = 'AT'
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  wallet_balance: number;
  referral_code: string;
  referred_by?: string;
  created_at: string;
}

export interface Bundle {
  size: number; // in GB
  price: number; // in GHS
}

export interface Order {
  id: string;
  user_id: string;
  network: Network;
  bundle_size: string; // "5 GB"
  amount: number;
  phone: string;
  payment_ref: string;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  created_at: string;
  payment_method: 'paystack' | 'wallet' | 'moolre';
  supplier?: string;
  supplier_reference?: string;
  supplier_order_code?: string;
  supplier_status?: string;
  supplier_error?: string;
  supplier_submitted_at?: string;
  supplier_fulfilled_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'topup' | 'purchase' | 'reward';
  amount: number;
  status: 'pending' | 'completed';
  reference: string;
  created_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  code?: string;
  color: string;
}