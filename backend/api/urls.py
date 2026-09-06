from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, UserProfileView, GymSettingsView,
    ForgotPasswordView, ResetPasswordView, ForgotUsernameView,
    RequestUsernameResetView, ResetUsernameView,
    DashboardStatsView, MemberViewSet, MembershipPlanViewSet,
    PaymentViewSet, AttendanceViewSet, TrainerViewSet,
    WorkoutPlanViewSet, ExpenseViewSet, ExpenseCategoryViewSet, FinancialSummaryView,
    ReportsView, AuditLogViewSet, DatabaseBackupView, ResetSystemDataView,
    SupplementCategoryViewSet, SupplementProductViewSet, SupplementSaleViewSet,
    SupplementPaymentViewSet,
    PublicReceiptPdfView, PublicInvoicePdfView
)

router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
router.register(r'plans', MembershipPlanViewSet, basename='plan')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'trainers', TrainerViewSet, basename='trainer')
router.register(r'workouts', WorkoutPlanViewSet, basename='workout')
router.register(r'expenses/categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'supplements/categories', SupplementCategoryViewSet, basename='supplement-category')
router.register(r'supplements/products', SupplementProductViewSet, basename='supplement-product')
router.register(r'supplements/sales', SupplementSaleViewSet, basename='supplement-sale')
router.register(r'supplements/payments', SupplementPaymentViewSet, basename='supplement-payment')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('auth/forgot-username/', ForgotUsernameView.as_view(), name='forgot_username'),
    path('auth/request-username-reset/', RequestUsernameResetView.as_view(), name='request_username_reset'),
    path('auth/reset-username/', ResetUsernameView.as_view(), name='reset_username'),

    # Core system endpoints
    path('settings/', GymSettingsView.as_view(), name='gym_settings'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('financials/', FinancialSummaryView.as_view(), name='financial_summary'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('backup/', DatabaseBackupView.as_view(), name='database_backup'),
    path('system/reset-data/', ResetSystemDataView.as_view(), name='reset_system_data'),

    # Public Receipt & Invoice PDF endpoints (accessible by members via WhatsApp)
    path('public/receipts/<str:receipt_number>/pdf/', PublicReceiptPdfView.as_view(), name='public_receipt_pdf'),
    path('public/receipts/<str:receipt_number>/pdf', PublicReceiptPdfView.as_view(), name='public_receipt_pdf_noslash'),
    path('public/invoices/<str:invoice_number>/pdf/', PublicInvoicePdfView.as_view(), name='public_invoice_pdf'),
    path('public/invoices/<str:invoice_number>/pdf', PublicInvoicePdfView.as_view(), name='public_invoice_pdf_noslash'),

    # Router endpoints
    path('', include(router.urls)),
]
