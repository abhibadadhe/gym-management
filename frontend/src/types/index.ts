export type UserRole = 'OWNER' | 'MANAGER' | 'TRAINER';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar?: string | null;
}

export interface GymSettings {
  id?: number;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  upi_id: string;
  receipt_prefix: string;
  reminder_days: string;
  logo?: string | null;
}

export interface Trainer {
  id: number;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  salary: string | number;
  joining_date: string;
  status: 'ACTIVE' | 'INACTIVE';
  bio: string;
  photo?: string | null;
  active_members_count?: number;
}

export interface MembershipPlan {
  id: number;
  name: string;
  duration_days: number;
  price: string | number;
  description: string;
  is_active: boolean;
  created_at?: string;
}

export type MembershipStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_MEMBERSHIP';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';
export type CheckInMethod = 'QR_SCAN' | 'MEMBER_ID' | 'MOBILE_NUMBER' | 'MANUAL';

export interface MemberMembership {
  id: number;
  member: number;
  member_name?: string;
  member_code?: string;
  plan: number;
  plan_name: string;
  plan_description?: string;
  plan_duration_days?: number;
  start_date: string;
  end_date: string;
  price: string | number;
  discount: string | number;
  final_amount: string | number;
  paid_amount: string | number;
  pending_amount: string | number;
  payment_status: PaymentStatus;
  is_renewal: boolean;
  notes?: string;
  status: MembershipStatus;
  created_at: string;
}

export interface Payment {
  id: number;
  receipt_number: string;
  member: number;
  member_name: string;
  member_id: string;
  membership?: number | null;
  plan_name?: string;
  plan_description?: string;
  amount: string | number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  payment_date: string;
  notes?: string;
  received_by?: number | null;
  received_by_name?: string;
  created_at: string;
}

export interface Attendance {
  id: number;
  member: number;
  member_name: string;
  member_id: string;
  member_phone?: string;
  membership_status?: MembershipStatus;
  date: string;
  check_in_time: string;
  check_out_time?: string | null;
  check_in_method: CheckInMethod;
}

export interface Member {
  id: number;
  member_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email?: string;
  dob?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  source: string;
  joining_date: string;
  assigned_trainer?: number | null;
  trainer_name?: string;
  qr_token: string;
  notes?: string;
  is_active: boolean;
  membership_status: MembershipStatus;
  days_remaining: number;
  current_plan?: string | null;
  start_date?: string | null;
  expiry_date?: string | null;
  pending_amount: number;
  created_at: string;

  // Detail view extras
  memberships?: MemberMembership[];
  payments?: Payment[];
  attendance_records?: Attendance[];
  total_paid?: number;
  total_pending?: number;
  total_visits?: number;
  visits_this_month?: number;
  last_visit?: string | null;
}

export interface WorkoutExercise {
  id?: number;
  workout_plan?: number;
  day_of_week: string;
  exercise_name: string;
  sets: number;
  reps: string;
  target_weight_kg: string | number;
  duration_min: number;
  notes: string;
}

export interface WorkoutPlan {
  id: number;
  member: number;
  member_name?: string;
  trainer?: number | null;
  trainer_name?: string;
  title: string;
  goal: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  exercises: WorkoutExercise[];
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  expenses_count?: number;
  created_at?: string;
}

export interface Expense {
  id: number;
  expense_id: string;
  category: string;
  category_display: string;
  description: string;
  amount: string | number;
  date: string;
  payment_method: PaymentMethod;
  notes: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  username: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

export interface DashboardKPIs {
  total_members: number;
  active_members: number;
  expiring_soon: number;
  expired_members: number;
  today_attendance: number;
  today_collection: number;
  this_month_collection: number;
  pending_payments: number;
  new_members_this_month: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  revenue_trend: { month: string; revenue: number; expenses: number; profit: number }[];
  attendance_trend: { date: string; count: number }[];
  plan_distribution: { name: string; value: number }[];
  recent_checkins: Attendance[];
  expiring_members: {
    id: number;
    member_id: string;
    full_name: string;
    phone: string;
    plan_name: string;
    end_date: string;
    days_remaining: number;
  }[];
  pending_dues: {
    id: number;
    member_id: string;
    full_name: string;
    phone: string;
    plan_name: string;
    pending_amount: number;
  }[];
  today_birthdays: {
    id: number;
    member_id: string;
    full_name: string;
    phone: string;
    dob: string;
  }[];
}

export interface ReceiptData {
  id?: number;
  gym: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    upi_id: string;
  };
  receipt_number: string;
  date: string;
  created_at: string;
  member: {
    id: number;
    member_id: string;
    full_name: string;
    phone: string;
    email: string;
    address: string;
  };
  plan: {
    name: string;
    description?: string;
    duration_days: number;
    start_date: string;
    end_date: string;
    plan_price: number;
    discount: number;
    final_amount: number;
    paid_amount: number;
    pending_amount: number;
  };
  plan_description?: string;
  payment: {
    amount: number;
    method: string;
    transaction_ref?: string;
    notes?: string;
    received_by: string;
  };
}

export interface WhatsAppTemplateItem {
  text: string;
  link: string;
}

export interface MemberWhatsAppTemplates {
  member_id: string;
  name: string;
  phone: string;
  templates: {
    welcome: WhatsAppTemplateItem;
    expiry_7days: WhatsAppTemplateItem;
    expiry_3days: WhatsAppTemplateItem;
    expired: WhatsAppTemplateItem;
    pending_payment: WhatsAppTemplateItem;
    birthday: WhatsAppTemplateItem;
  };
}

// Supplements & Store Types
export interface SupplementCategory {
  id: number;
  name: string;
  description: string;
  products_count?: number;
  created_at?: string;
}

export interface SupplementProduct {
  id: number;
  name: string;
  brand: string;
  category?: number | null;
  category_name?: string;
  flavor?: string;
  weight_or_servings?: string;
  cost_price: number | string;
  selling_price: number | string;
  stock_quantity: number;
  min_stock_alert: number;
  is_low_stock?: boolean;
  expiry_date?: string | null;
  image?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplementSaleItem {
  id?: number;
  product?: number;
  product_name: string;
  product_brand?: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  subtotal: number;
}

export interface SupplementSale {
  id: number;
  invoice_number: string;
  member?: number | null;
  customer_name: string;
  customer_phone?: string;
  subtotal: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  payment_method_display?: string;
  sold_by?: number | null;
  sold_by_name?: string;
  sale_date: string;
  notes?: string;
  items: SupplementSaleItem[];
  created_at?: string;
}

export interface SupplementSummary {
  total_products: number;
  low_stock_count: number;
  total_inventory_cost: number;
  total_retail_valuation: number;
  today_sales: number;
  monthly_sales: number;
  lifetime_sales: number;
}

export interface SupplementReceiptData {
  gym: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    email: string;
    upi_id: string;
  };
  invoice_number: string;
  sale_date: string;
  date: string;
  time: string;
  customer_name: string;
  customer_phone: string;
  member_id?: string | null;
  items: {
    id: number;
    name: string;
    brand: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  final_amount: number;
  payment_method: string;
  sold_by: string;
  notes?: string;
}

