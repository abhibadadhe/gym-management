import axios from 'axios';
import {
  User, GymSettings, Trainer, MembershipPlan, Member,
  MemberMembership, Payment, Attendance, WorkoutPlan,
  WorkoutExercise, Expense, ExpenseCategory, AuditLog, DashboardData,
  ReceiptData, MemberWhatsAppTemplates,
  SupplementCategory, SupplementProduct, SupplementSale,
  SupplementSummary, SupplementReceiptData
} from '../types';

const rawEnvUrl = (import.meta as any).env?.VITE_API_BASE_URL;
// If the app is loaded over HTTPS (e.g. on Vercel) and the env URL is insecure HTTP, fall back to '/api' to prevent browser Mixed Content blockage
const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const envApiUrl = (isHttps && rawEnvUrl?.startsWith('http://')) ? '' : rawEnvUrl;
const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/+$/, '')}/api` : '/api';


export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('mf_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired and not on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('mf_access_token');
        localStorage.removeItem('mf_refresh_token');
        localStorage.removeItem('mf_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: async (credentials: { username: string; password: string }) => {
    const res = await apiClient.post('/auth/login/', credentials);
    return res.data;
  },
  forgotPassword: async (identifier: string) => {
    const res = await apiClient.post('/auth/forgot-password/', { identifier });
    return res.data;
  },
  resetPassword: async (data: { identifier: string; otp: string; new_password: string }) => {
    const res = await apiClient.post('/auth/reset-password/', data);
    return res.data;
  },
  forgotUsername: async (email: string) => {
    const res = await apiClient.post('/auth/forgot-username/', { email });
    return res.data;
  },
  requestUsernameResetOtp: async (email: string) => {
    const res = await apiClient.post('/auth/request-username-reset/', { email });
    return res.data;
  },
  resetUsername: async (data: { email: string; otp: string; new_username: string }) => {
    const res = await apiClient.post('/auth/reset-username/', data);
    return res.data;
  },
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get('/auth/profile/');
    return res.data;
  },
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.put('/auth/profile/', data);
    return res.data;
  },

  // Settings
  getSettings: async (): Promise<GymSettings> => {
    const res = await apiClient.get('/settings/');
    return res.data;
  },
  updateSettings: async (data: Partial<GymSettings>): Promise<GymSettings> => {
    const res = await apiClient.put('/settings/', data);
    return res.data;
  },

  // Dashboard
  getDashboardStats: async (): Promise<DashboardData> => {
    const res = await apiClient.get('/dashboard/');
    return res.data;
  },

  // Members
  getMembers: async (params?: { search?: string; status?: string; trainer?: number }): Promise<Member[]> => {
    const res = await apiClient.get('/members/', { params });
    return res.data;
  },
  getMember: async (id: number | string): Promise<Member> => {
    const res = await apiClient.get(`/members/${id}/`);
    return res.data;
  },
  onboardMember: async (data: any) => {
    const res = await apiClient.post('/members/onboard/', data);
    return res.data;
  },
  updateMember: async (id: number | string, data: Partial<Member>): Promise<Member> => {
    const res = await apiClient.patch(`/members/${id}/`, data);
    return res.data;
  },
  deleteMember: async (id: number | string) => {
    const res = await apiClient.delete(`/members/${id}/`);
    return res.data;
  },
  renewMember: async (id: number | string, data: any) => {
    const res = await apiClient.post(`/members/${id}/renew/`, data);
    return res.data;
  },
  getWhatsAppTemplates: async (id: number | string): Promise<MemberWhatsAppTemplates> => {
    const res = await apiClient.get(`/members/${id}/whatsapp/`);
    return res.data;
  },
  getQRPass: async (id: number | string) => {
    const res = await apiClient.get(`/members/${id}/qr/`);
    return res.data;
  },

  // Plans
  getPlans: async (): Promise<MembershipPlan[]> => {
    const res = await apiClient.get('/plans/');
    return res.data;
  },
  createPlan: async (data: Partial<MembershipPlan>): Promise<MembershipPlan> => {
    const res = await apiClient.post('/plans/', data);
    return res.data;
  },
  updatePlan: async (id: number, data: Partial<MembershipPlan>): Promise<MembershipPlan> => {
    const res = await apiClient.patch(`/plans/${id}/`, data);
    return res.data;
  },
  deletePlan: async (id: number) => {
    const res = await apiClient.delete(`/plans/${id}/`);
    return res.data;
  },

  // Payments
  getPayments: async (params?: { member_id?: string; method?: string; start_date?: string; end_date?: string }): Promise<Payment[]> => {
    const res = await apiClient.get('/payments/', { params });
    return res.data;
  },
  createPayment: async (data: any): Promise<Payment> => {
    const res = await apiClient.post('/payments/', data);
    return res.data;
  },
  getPendingDues: async (): Promise<MemberMembership[]> => {
    const res = await apiClient.get('/payments/pending-dues/');
    return res.data;
  },
  getReceipt: async (id: number | string): Promise<ReceiptData> => {
    const res = await apiClient.get(`/payments/${id}/receipt/`);
    return res.data;
  },
  getReceiptPdf: async (idOrNumber: number | string): Promise<Blob> => {
    if (typeof idOrNumber === 'number' || /^\d+$/.test(String(idOrNumber).trim())) {
      const res = await apiClient.get(`/payments/${idOrNumber}/pdf/`, { responseType: 'blob' });
      return res.data;
    }
    const res = await apiClient.get(`/public/receipts/${encodeURIComponent(String(idOrNumber))}/pdf/`, { responseType: 'blob' });
    return res.data;
  },

  // Attendance
  getAttendance: async (params?: { date?: string; member_id?: string }): Promise<Attendance[]> => {
    const res = await apiClient.get('/attendance/', { params });
    return res.data;
  },
  checkIn: async (identifier: string, method = 'QR_SCAN') => {
    const res = await apiClient.post('/attendance/check-in/', { identifier, method });
    return res.data;
  },
  getAttendanceStats: async () => {
    const res = await apiClient.get('/attendance/stats/');
    return res.data;
  },

  // Trainers
  getTrainers: async (): Promise<Trainer[]> => {
    const res = await apiClient.get('/trainers/');
    return res.data;
  },
  createTrainer: async (data: Partial<Trainer>): Promise<Trainer> => {
    const res = await apiClient.post('/trainers/', data);
    return res.data;
  },
  updateTrainer: async (id: number, data: Partial<Trainer>): Promise<Trainer> => {
    const res = await apiClient.patch(`/trainers/${id}/`, data);
    return res.data;
  },
  deleteTrainer: async (id: number) => {
    const res = await apiClient.delete(`/trainers/${id}/`);
    return res.data;
  },

  // Workouts
  getWorkouts: async (memberId?: number | string): Promise<WorkoutPlan[]> => {
    const res = await apiClient.get('/workouts/', { params: { member_id: memberId } });
    return res.data;
  },
  createWorkout: async (data: any): Promise<WorkoutPlan> => {
    const res = await apiClient.post('/workouts/', data);
    return res.data;
  },
  addExercise: async (workoutId: number, exerciseData: Partial<WorkoutExercise>): Promise<WorkoutExercise> => {
    const res = await apiClient.post(`/workouts/${workoutId}/add-exercise/`, exerciseData);
    return res.data;
  },

  // Expenses
  getExpenses: async (params?: { category?: string; start_date?: string; end_date?: string }): Promise<Expense[]> => {
    const res = await apiClient.get('/expenses/', { params });
    return res.data;
  },
  createExpense: async (data: Partial<Expense>): Promise<Expense> => {
    const res = await apiClient.post('/expenses/', data);
    return res.data;
  },
  deleteExpense: async (id: number) => {
    const res = await apiClient.delete(`/expenses/${id}/`);
    return res.data;
  },
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    const res = await apiClient.get('/expenses/categories/');
    return res.data;
  },
  createExpenseCategory: async (data: { name: string; description?: string }): Promise<ExpenseCategory> => {
    const res = await apiClient.post('/expenses/categories/', data);
    return res.data;
  },
  deleteExpenseCategory: async (id: number) => {
    const res = await apiClient.delete(`/expenses/categories/${id}/`);
    return res.data;
  },

  // Financials & Reports
  getFinancialSummary: async () => {
    const res = await apiClient.get('/financials/');
    return res.data;
  },
  getReport: async (type: string, start_date?: string, end_date?: string) => {
    const res = await apiClient.get('/reports/', { params: { type, start_date, end_date } });
    return res.data;
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await apiClient.get('/audit-logs/');
    return res.data;
  },

  // Database Backup
  getBackupDump: async () => {
    const res = await apiClient.get('/backup/');
    return res.data;
  },

  // Supplements & Store
  getSupplementCategories: async (): Promise<SupplementCategory[]> => {
    const res = await apiClient.get('/supplements/categories/');
    return res.data;
  },
  createSupplementCategory: async (data: Partial<SupplementCategory>): Promise<SupplementCategory> => {
    const res = await apiClient.post('/supplements/categories/', data);
    return res.data;
  },
  deleteSupplementCategory: async (id: number) => {
    const res = await apiClient.delete(`/supplements/categories/${id}/`);
    return res.data;
  },
  getSupplementProducts: async (params?: { category?: number; search?: string; low_stock?: boolean }): Promise<SupplementProduct[]> => {
    const res = await apiClient.get('/supplements/products/', { params });
    return res.data;
  },
  createSupplementProduct: async (data: any): Promise<SupplementProduct> => {
    const res = await apiClient.post('/supplements/products/', data);
    return res.data;
  },
  updateSupplementProduct: async (id: number, data: any): Promise<SupplementProduct> => {
    const res = await apiClient.patch(`/supplements/products/${id}/`, data);
    return res.data;
  },
  deleteSupplementProduct: async (id: number) => {
    const res = await apiClient.delete(`/supplements/products/${id}/`);
    return res.data;
  },
  restockSupplementProduct: async (id: number, quantity: number, cost_price?: number) => {
    const res = await apiClient.post(`/supplements/products/${id}/restock/`, { quantity, cost_price });
    return res.data;
  },
  getSupplementSales: async (): Promise<SupplementSale[]> => {
    const res = await apiClient.get('/supplements/sales/');
    return res.data;
  },
  createSupplementSale: async (data: any): Promise<SupplementSale> => {
    const res = await apiClient.post('/supplements/sales/', data);
    return res.data;
  },
  getSupplementReceipt: async (id: number): Promise<SupplementReceiptData> => {
    const res = await apiClient.get(`/supplements/sales/${id}/receipt/`);
    return res.data;
  },
  getSupplementInvoicePdf: async (idOrNumber: number | string): Promise<Blob> => {
    if (typeof idOrNumber === 'number' || /^\d+$/.test(String(idOrNumber).trim())) {
      const res = await apiClient.get(`/supplements/sales/${idOrNumber}/pdf/`, { responseType: 'blob' });
      return res.data;
    }
    const res = await apiClient.get(`/public/invoices/${encodeURIComponent(String(idOrNumber))}/pdf/`, { responseType: 'blob' });
    return res.data;
  },
  getSupplementSummary: async (): Promise<SupplementSummary> => {
    const res = await apiClient.get('/supplements/sales/summary/');
    return res.data;
  },
};

