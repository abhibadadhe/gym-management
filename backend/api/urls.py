from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, UserProfileView, GymSettingsView,
    DashboardStatsView, MemberViewSet, MembershipPlanViewSet,
    PaymentViewSet, AttendanceViewSet, TrainerViewSet,
    WorkoutPlanViewSet, ExpenseViewSet, FinancialSummaryView,
    ReportsView, AuditLogViewSet, DatabaseBackupView
)

router = DefaultRouter()
router.register(r'members', MemberViewSet, basename='member')
router.register(r'plans', MembershipPlanViewSet, basename='plan')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'trainers', TrainerViewSet, basename='trainer')
router.register(r'workouts', WorkoutPlanViewSet, basename='workout')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/profile/', UserProfileView.as_view(), name='user_profile'),

    # Core system endpoints
    path('settings/', GymSettingsView.as_view(), name='gym_settings'),
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('financials/', FinancialSummaryView.as_view(), name='financial_summary'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('backup/', DatabaseBackupView.as_view(), name='database_backup'),

    # Router endpoints
    path('', include(router.urls)),
]
