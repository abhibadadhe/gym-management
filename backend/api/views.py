import os
import json
import random
import re
from pathlib import Path
from decimal import Decimal
from datetime import date, datetime, timedelta
from dotenv import load_dotenv
from django.conf import settings
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.core import serializers as django_serializers
from django.core.mail import send_mail

from rest_framework import viewsets, status, permissions
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    User, UserRole, GymSettings, Trainer, MembershipPlan, Member,
    MemberMembership, Payment, Attendance, WorkoutPlan,
    WorkoutExercise, Expense, ExpenseCategory, AuditLog,
    SupplementCategory, SupplementProduct, SupplementSale, SupplementSaleItem,
    PasswordResetOTP
)
from .serializers import (
    UserSerializer, GymSettingsSerializer, TrainerSerializer,
    MembershipPlanSerializer, MemberListSerializer, MemberDetailSerializer,
    MemberMembershipSerializer, PaymentSerializer, AttendanceSerializer,
    WorkoutPlanSerializer, WorkoutExerciseSerializer, ExpenseSerializer,
    ExpenseCategorySerializer,
    AuditLogSerializer, AddMemberWithMembershipSerializer,
    MemberUpdateSerializer,
    RenewMembershipSerializer, QuickPaymentSerializer,
    AttendanceCheckInSerializer,
    SupplementCategorySerializer, SupplementProductSerializer,
    SupplementSaleSerializer, SupplementSaleItemSerializer
)
from .permissions import IsAdminUserRole, IsReceptionistOrAdmin, IsStaffUser, IsAdminOrReadOnly
from .utils import log_audit, get_whatsapp_templates


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name() or user.username,
            'role': user.role,
            'phone': user.phone,
        }
        settings = GymSettings.get_settings()
        data['gym'] = {
            'name': settings.name,
            'tagline': settings.tagline,
            'phone': settings.phone,
            'address': settings.address,
            'upi_id': settings.upi_id,
        }
        
        # Log login
        log_audit(user, 'USER_LOGIN', 'USER', user.id, f"User {user.username} logged in successfully.")
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


def get_configured_system_email() -> str:
    """
    Returns the currently configured Gmail address from .env or django settings,
    dynamically checking .env on disk so updates are reflected immediately.
    """
    try:
        base_dir = Path(settings.BASE_DIR)
        load_dotenv(base_dir / '.env', override=True)
        load_dotenv(base_dir.parent / '.env', override=True)
    except Exception:
        pass

    env_user = os.environ.get('EMAIL_HOST_USER', '').strip()
    if env_user:
        settings.EMAIL_HOST_USER = env_user
    env_pass = os.environ.get('EMAIL_HOST_PASSWORD', '').strip()
    if env_pass:
        settings.EMAIL_HOST_PASSWORD = env_pass
    env_from = os.environ.get('DEFAULT_FROM_EMAIL', '').strip()
    if env_from:
        settings.DEFAULT_FROM_EMAIL = env_from

    return (os.environ.get('EMAIL_HOST_USER') or getattr(settings, 'EMAIL_HOST_USER', '')).strip()


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier', '').strip()
        if not identifier:
            return Response({'detail': 'Please provide your registered Gmail address, username, or phone number.'}, status=status.HTTP_400_BAD_REQUEST)

        configured_email = get_configured_system_email()
        gym_settings = GymSettings.get_settings()
        gym_email = (gym_settings.email or '').strip()

        clean_phone = re.sub(r'[\s\-\+\(\)]', '', identifier)

        # 1. Direct search by email, username, or phone number
        user = User.objects.filter(
            Q(email__iexact=identifier) |
            Q(username__iexact=identifier) |
            Q(phone__iexact=identifier) |
            (Q(phone__endswith=clean_phone[-10:]) if len(clean_phone) >= 10 else Q(pk__in=[]))
        ).first()

        # 2. If entered identifier is an email matching configured_email, gym_email, or gokulgugale99@gmail.com, map to Owner/Admin
        if not user and '@' in identifier:
            if (configured_email and identifier.lower() == configured_email.lower()) or (gym_email and identifier.lower() == gym_email.lower()) or (identifier.lower() == 'gokulgugale99@gmail.com'):
                user = User.objects.filter(Q(is_superuser=True) | Q(role=UserRole.OWNER) | Q(username='admin')).first()
                if user:
                    user.email = identifier.strip().lower()
                    user.save(update_fields=['email'])

        if not user:
            return Response({'detail': 'No registered account found matching this username, email, or phone number.'}, status=status.HTTP_404_NOT_FOUND)

        # 3. For Owner / Admin accounts or developer email legacy accounts, synchronize email with configured system email or gokulgugale99@gmail.com
        target_admin_email = configured_email or 'gokulgugale99@gmail.com'
        if user.is_superuser or user.role == UserRole.OWNER or user.username == 'admin' or (user.email and user.email.lower() == 'abhibadadhe33@gmail.com'):
            user.email = target_admin_email
            user.save(update_fields=['email'])

        recipient_email = (user.email or '').strip()
        if not recipient_email or recipient_email.lower() == 'abhibadadhe33@gmail.com':
            recipient_email = target_admin_email
            user.email = recipient_email
            user.save(update_fields=['email'])

        otp = f"{random.randint(100000, 999999)}"

        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        PasswordResetOTP.objects.create(user=user, otp=otp)

        email_parts = recipient_email.split('@')
        masked_user = email_parts[0][0] + '***' + email_parts[0][-1] if len(email_parts[0]) > 2 else email_parts[0]
        masked_email = f"{masked_user}@{email_parts[1]}" if len(email_parts) == 2 else recipient_email

        subject = f"Morya Fitness - Password Reset Code: {otp}"
        message = (
            f"Hello {user.first_name or user.username},\n\n"
            f"You requested a password reset for your Morya Fitness account.\n\n"
            f"Registered Username: {user.username}\n"
            f"Your 6-Digit Reset Code: {otp}\n\n"
            f"This code is valid for 15 minutes. Please enter this code in the reset window to set a new password.\n\n"
            f"If you did not request this reset, please ignore this email.\n\n"
            f"Best regards,\n"
            f"Morya Fitness Sinnar"
        )

        email_sent = False
        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or configured_email or 'noreply@moryafitness.com'
            send_mail(subject, message, from_email, [recipient_email], fail_silently=False)
            email_sent = True
        except Exception as e:
            print(f"[Email Error] Could not send OTP email to {recipient_email}: {e}")

        resp = {
            'detail': f"A 6-digit password reset code has been sent to your Gmail ({masked_email}).",
            'email_masked': masked_email,
            'username': user.username,
        }
        if not email_sent:
            resp['dev_note'] = f"SMTP unconfigured or delivery failed. Dev OTP: {otp}"

        return Response(resp, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get('identifier', '').strip()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '').strip()

        if not identifier or not otp or not new_password:
            return Response({'detail': 'Identifier, OTP, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 4:
            return Response({'detail': 'Password must be at least 4 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        configured_email = get_configured_system_email()
        gym_settings = GymSettings.get_settings()
        gym_email = (gym_settings.email or '').strip()

        clean_phone = re.sub(r'[\s\-\+\(\)]', '', identifier)
        user = User.objects.filter(
            Q(email__iexact=identifier) |
            Q(username__iexact=identifier) |
            Q(phone__iexact=identifier) |
            (Q(phone__endswith=clean_phone[-10:]) if len(clean_phone) >= 10 else Q(pk__in=[]))
        ).first()

        if not user and '@' in identifier:
            if (configured_email and identifier.lower() == configured_email.lower()) or (gym_email and identifier.lower() == gym_email.lower()) or (identifier.lower() == 'gokulgugale99@gmail.com'):
                user = User.objects.filter(Q(is_superuser=True) | Q(role=UserRole.OWNER) | Q(username='admin')).first()

        if not user:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        otp_record = PasswordResetOTP.objects.filter(user=user, otp=otp, is_used=False).first()
        if not otp_record or not otp_record.is_valid():
            return Response({'detail': 'Invalid or expired OTP code. Please request a fresh code.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        otp_record.is_used = True
        otp_record.save()

        log_audit(user, 'PASSWORD_RESET', 'USER', user.id, "User password reset successfully via Gmail OTP.")

        return Response({'detail': 'Password reset successfully! You can now log in with your new password.'}, status=status.HTTP_200_OK)


class ForgotUsernameView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'detail': 'Please provide your registered Gmail address.'}, status=status.HTTP_400_BAD_REQUEST)

        configured_email = get_configured_system_email()
        gym_settings = GymSettings.get_settings()
        gym_email = (gym_settings.email or '').strip()

        users = User.objects.filter(email__iexact=email)
        if not users.exists():
            if (configured_email and email.lower() == configured_email.lower()) or (gym_email and email.lower() == gym_email.lower()) or (email.lower() == 'gokulgugale99@gmail.com'):
                admin_user = User.objects.filter(Q(is_superuser=True) | Q(role=UserRole.OWNER) | Q(username='admin')).first()
                if admin_user:
                    admin_user.email = email.strip().lower()
                    admin_user.save(update_fields=['email'])
                    users = User.objects.filter(id=admin_user.id)

        if not users.exists():
            return Response({'detail': 'No account registered with this email address.'}, status=status.HTTP_404_NOT_FOUND)

        usernames = [u.username for u in users]
        usernames_str = ', '.join(usernames)

        subject = "Morya Fitness - Your Registered Username"
        message = (
            f"Hello,\n\n"
            f"You requested your username for Morya Fitness Gym Management System.\n\n"
            f"Your Registered Username(s): {usernames_str}\n\n"
            f"You can now sign in at the Morya Fitness portal using this username.\n\n"
            f"Best regards,\n"
            f"Morya Fitness Sinnar"
        )

        try:
            from django.conf import settings
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@moryafitness.com'
            send_mail(subject, message, from_email, [email], fail_silently=False)
        except Exception as e:
            print(f"[Email Error] Could not send username to {email}: {e}")

        return Response({
            'detail': f"Your registered username has been sent to your Gmail ({email})."
        }, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_audit(user, 'PROFILE_UPDATED', 'USER', user.id, "Updated own profile.")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GymSettingsView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsStaffUser()]
        return [IsAdminUserRole()]

    def get(self, request):
        settings = GymSettings.get_settings()
        serializer = GymSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = GymSettings.get_settings()
        serializer = GymSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_audit(request.user, 'SETTINGS_UPDATED', 'GYM_SETTINGS', settings.id, "Updated gym settings.")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DashboardStatsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        today = timezone.localdate()
        this_month_start = today.replace(day=1)
        
        # 1. Member Counts
        all_members = Member.objects.filter(is_active=True)
        total_members = all_members.count()
        
        active_count = 0
        expiring_soon_count = 0
        expired_count = 0

        expiring_members_list = []
        pending_dues_list = []
        today_birthdays_list = []

        for m in all_members.prefetch_related('memberships', 'memberships__plan'):
            status_val = m.membership_status
            if status_val == 'ACTIVE':
                active_count += 1
            elif status_val == 'EXPIRING_SOON':
                expiring_soon_count += 1
                curr = m.current_membership
                expiring_members_list.append({
                    'id': m.id,
                    'member_id': m.member_id,
                    'full_name': m.full_name,
                    'phone': m.phone,
                    'plan_name': curr.plan.name if curr and curr.plan else 'N/A',
                    'end_date': curr.end_date if curr else None,
                    'days_remaining': m.days_remaining
                })
            elif status_val in ['EXPIRED', 'NO_MEMBERSHIP']:
                expired_count += 1

            curr = m.current_membership
            if curr and curr.pending_amount > 0:
                pending_dues_list.append({
                    'id': m.id,
                    'member_id': m.member_id,
                    'full_name': m.full_name,
                    'phone': m.phone,
                    'plan_name': curr.plan.name,
                    'pending_amount': float(curr.pending_amount)
                })

            if m.dob and m.dob.month == today.month and m.dob.day == today.day:
                today_birthdays_list.append({
                    'id': m.id,
                    'member_id': m.member_id,
                    'full_name': m.full_name,
                    'phone': m.phone,
                    'dob': m.dob
                })

        new_members_this_month = all_members.filter(joining_date__gte=this_month_start).count()

        # 2. Today's Attendance
        today_attendance = Attendance.objects.filter(date=today).count()

        # 3. Financial Collections
        today_collection = Payment.objects.filter(payment_date=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        this_month_collection = Payment.objects.filter(payment_date__gte=this_month_start).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Pending dues total
        total_pending = MemberMembership.objects.filter(
            member__is_active=True
        ).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')

        # 4. 14-Day Attendance Trend
        attendance_trend = []
        for i in range(13, -1, -1):
            d = today - timedelta(days=i)
            count = Attendance.objects.filter(date=d).count()
            attendance_trend.append({
                'date': d.strftime('%d %b'),
                'count': count
            })

        # 5. 6-Month Revenue Trend
        revenue_trend = []
        for i in range(5, -1, -1):
            # calculate year and month
            m_year = today.year
            m_month = today.month - i
            while m_month <= 0:
                m_month += 12
                m_year -= 1
            m_start = date(m_year, m_month, 1)
            if m_month == 12:
                m_end = date(m_year + 1, 1, 1) - timedelta(days=1)
            else:
                m_end = date(m_year, m_month + 1, 1) - timedelta(days=1)
            
            m_rev = Payment.objects.filter(payment_date__range=[m_start, m_end]).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            m_exp = Expense.objects.filter(date__range=[m_start, m_end]).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            revenue_trend.append({
                'month': m_start.strftime('%b %Y'),
                'revenue': float(m_rev),
                'expenses': float(m_exp),
                'profit': float(m_rev - m_exp)
            })

        # 6. Plan Distribution among Active Members (Unique active members per current plan)
        plan_counts = {}
        for m in all_members.prefetch_related('memberships', 'memberships__plan'):
            curr = m.current_membership
            if curr and curr.plan:
                p_name = curr.plan.name
                plan_counts[p_name] = plan_counts.get(p_name, 0) + 1

        plan_distribution = [
            {'name': name, 'value': count}
            for name, count in sorted(plan_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        # 7. Recent Check-ins
        recent_checkins = Attendance.objects.select_related('member').order_by('-check_in_time')[:8]
        recent_checkins_data = AttendanceSerializer(recent_checkins, many=True).data

        return Response({
            'kpis': {
                'total_members': total_members,
                'active_members': active_count,
                'expiring_soon': expiring_soon_count,
                'expired_members': expired_count,
                'today_attendance': today_attendance,
                'today_collection': float(today_collection),
                'this_month_collection': float(this_month_collection),
                'pending_payments': float(total_pending),
                'new_members_this_month': new_members_this_month,
            },
            'revenue_trend': revenue_trend,
            'attendance_trend': attendance_trend,
            'plan_distribution': plan_distribution,
            'recent_checkins': recent_checkins_data,
            'expiring_members': expiring_members_list[:10],
            'pending_dues': pending_dues_list[:10],
            'today_birthdays': today_birthdays_list,
        })


class MemberViewSet(viewsets.ModelViewSet):
    permission_classes = [IsReceptionistOrAdmin]
    queryset = Member.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        elif self.action in ['update', 'partial_update']:
            return MemberUpdateSerializer
        return MemberListSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        log_audit(
            self.request.user,
            'MEMBER_UPDATED',
            'MEMBER',
            instance.id,
            f"Updated member profile {instance.full_name} ({instance.member_id})"
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        detail_serializer = MemberDetailSerializer(instance, context=self.get_serializer_context())
        return Response(detail_serializer.data)

    def get_queryset(self):
        qs = Member.objects.filter(is_active=True).prefetch_related('memberships', 'memberships__plan', 'assigned_trainer')
        search = self.request.query_params.get('search', '').strip()
        status_filter = self.request.query_params.get('status', '').upper()
        trainer_id = self.request.query_params.get('trainer')

        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search) |
                Q(member_id__icontains=search)
            )

        if trainer_id:
            qs = qs.filter(assigned_trainer_id=trainer_id)

        # Status filtering
        if status_filter:
            today = timezone.localdate()
            if status_filter == 'ACTIVE':
                qs = [m for m in qs if m.membership_status == 'ACTIVE']
            elif status_filter == 'EXPIRING_SOON':
                qs = [m for m in qs if m.membership_status == 'EXPIRING_SOON']
            elif status_filter == 'EXPIRED':
                qs = [m for m in qs if m.membership_status in ['EXPIRED', 'NO_MEMBERSHIP']]
            elif status_filter in ['PENDING_PAYMENT', 'PENDING_DUES']:
                qs = [m for m in qs if m.current_membership and m.current_membership.pending_amount > 0]

        return qs

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save()
        log_audit(self.request.user, 'MEMBER_DELETED', 'MEMBER', instance.id, f"Soft-deleted member {instance.full_name} ({instance.member_id})")

    @action(detail=False, methods=['post'], url_path='onboard')
    def onboard_member(self, request):
        serializer = AddMemberWithMembershipSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        plan = get_object_or_404(MembershipPlan, id=data['plan_id'])
        start_date = data.get('start_date', date.today())
        end_date = start_date + timedelta(days=plan.duration_days)

        # 1. Create Member
        member_id = Member.generate_member_id()
        member = Member.objects.create(
            member_id=member_id,
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data['phone'],
            email=data.get('email') or None,
            dob=data.get('dob'),
            gender=data.get('gender', 'MALE'),
            address=data.get('address', ''),
            emergency_contact_name=data.get('emergency_contact_name', ''),
            emergency_contact_phone=data.get('emergency_contact_phone', ''),
            source=data.get('source', 'WALK_IN'),
            joining_date=data.get('joining_date', date.today()),
            assigned_trainer_id=data.get('assigned_trainer_id'),
            notes=data.get('notes', ''),
        )

        # 2. Create Membership
        price = Decimal(str(plan.price))
        discount = Decimal(str(data.get('discount') or '0.00'))
        final_amount = max(Decimal('0.00'), price - discount)
        raw_paid = Decimal(str(data.get('paid_amount') or '0.00'))
        paid_amount = min(final_amount, raw_paid)
        pending_amount = max(Decimal('0.00'), final_amount - paid_amount)

        membership = MemberMembership.objects.create(
            member=member,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            price=price,
            discount=discount,
            final_amount=final_amount,
            paid_amount=paid_amount,
            pending_amount=pending_amount,
            is_renewal=False,
            notes="Initial Registration",
        )

        # 3. Create Payment if paid_amount > 0
        payment = None
        if paid_amount > 0:
            receipt_no = Payment.generate_receipt_number()
            payment = Payment.objects.create(
                receipt_number=receipt_no,
                member=member,
                membership=membership,
                amount=paid_amount,
                payment_method=data.get('payment_method', 'UPI'),
                transaction_ref=data.get('transaction_ref', ''),
                payment_date=date.today(),
                notes="Initial membership registration payment",
                received_by=request.user,
            )

        log_audit(
            request.user,
            'MEMBER_ONBOARDED',
            'MEMBER',
            member.id,
            f"Created new member {member.full_name} ({member.member_id}) with {plan.name} plan."
        )

        return Response({
            'message': 'Member created successfully!',
            'member': MemberDetailSerializer(member).data,
            'receipt': PaymentSerializer(payment).data if payment else None
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='renew')
    def renew_membership(self, request, pk=None):
        member = self.get_object()
        serializer = RenewMembershipSerializer(data={**request.data, 'member_id': member.id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        plan = get_object_or_404(MembershipPlan, id=data['plan_id'])
        
        # Calculate new start date: if current membership is still active, start on expiry + 1 day
        curr = member.current_membership
        today = date.today()
        if data.get('start_date'):
            new_start_date = data['start_date']
        elif curr and curr.end_date >= today:
            new_start_date = curr.end_date + timedelta(days=1)
        else:
            new_start_date = today

        new_end_date = new_start_date + timedelta(days=plan.duration_days)

        price = Decimal(str(plan.price))
        discount = Decimal(str(data.get('discount') or '0.00'))
        final_amount = max(Decimal('0.00'), price - discount)
        raw_paid = Decimal(str(data.get('paid_amount') or '0.00'))
        paid_amount = min(final_amount, raw_paid)
        pending_amount = max(Decimal('0.00'), final_amount - paid_amount)

        # Create new renewal subscription (never overwrite historical records)
        membership = MemberMembership.objects.create(
            member=member,
            plan=plan,
            start_date=new_start_date,
            end_date=new_end_date,
            price=price,
            discount=discount,
            final_amount=final_amount,
            paid_amount=paid_amount,
            pending_amount=pending_amount,
            is_renewal=True,
            notes=data.get('notes', 'Membership Renewal'),
        )

        payment = None
        if paid_amount > 0:
            receipt_no = Payment.generate_receipt_number()
            payment = Payment.objects.create(
                receipt_number=receipt_no,
                member=member,
                membership=membership,
                amount=paid_amount,
                payment_method=data.get('payment_method', 'UPI'),
                transaction_ref=data.get('transaction_ref', ''),
                payment_date=date.today(),
                notes=f"Renewal payment for {plan.name}",
                received_by=request.user,
            )

        log_audit(
            request.user,
            'MEMBERSHIP_RENEWED',
            'MEMBER',
            member.id,
            f"Renewed {member.full_name} ({member.member_id}) for {plan.name} until {new_end_date}."
        )

        return Response({
            'message': 'Membership renewed successfully!',
            'member': MemberDetailSerializer(member).data,
            'membership': MemberMembershipSerializer(membership).data,
            'receipt': PaymentSerializer(payment).data if payment else None
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='whatsapp')
    def get_whatsapp_links(self, request, pk=None):
        member = self.get_object()
        templates = get_whatsapp_templates(member)
        return Response({
            'member_id': member.member_id,
            'name': member.full_name,
            'phone': member.phone,
            'templates': templates
        })

    @action(detail=True, methods=['get'], url_path='qr')
    def get_qr_pass(self, request, pk=None):
        member = self.get_object()
        settings = GymSettings.get_settings()
        curr = member.current_membership
        return Response({
            'gym_name': settings.name,
            'tagline': settings.tagline,
            'address': settings.address,
            'phone': settings.phone,
            'member_id': member.member_id,
            'full_name': member.full_name,
            'phone_number': member.phone,
            'qr_token': member.qr_token,
            'joining_date': member.joining_date,
            'plan_name': curr.plan.name if curr and curr.plan else 'General',
            'expiry_date': curr.end_date if curr else None,
            'status': member.membership_status,
        })


class MembershipPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReadOnly]
    queryset = MembershipPlan.objects.all().order_by('duration_days')
    serializer_class = MembershipPlanSerializer

    def perform_create(self, serializer):
        plan = serializer.save()
        log_audit(self.request.user, 'PLAN_CREATED', 'PLAN', plan.id, f"Created plan {plan.name} at ₹{plan.price}")

    def perform_update(self, serializer):
        plan = serializer.save()
        log_audit(self.request.user, 'PLAN_UPDATED', 'PLAN', plan.id, f"Updated plan {plan.name} at ₹{plan.price}")


class PaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsReceptionistOrAdmin]
    queryset = Payment.objects.all().select_related('member', 'membership', 'received_by')
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        member_id = self.request.query_params.get('member_id')
        method = self.request.query_params.get('method')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if member_id:
            qs = qs.filter(member_id=member_id)
        if method:
            qs = qs.filter(payment_method=method)
        if start_date:
            qs = qs.filter(payment_date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__lte=end_date)
        return qs

    def perform_create(self, serializer):
        payment = serializer.save(received_by=self.request.user)
        log_audit(
            self.request.user,
            'PAYMENT_RECEIVED',
            'PAYMENT',
            payment.id,
            f"Received ₹{payment.amount} via {payment.payment_method} from {payment.member.full_name} ({payment.receipt_number})"
        )

    @action(detail=False, methods=['get'], url_path='pending-dues')
    def pending_dues(self, request):
        memberships = MemberMembership.objects.filter(
            pending_amount__gt=0,
            member__is_active=True
        ).select_related('member', 'plan')
        data = MemberMembershipSerializer(memberships, many=True).data
        return Response(data)

    @action(detail=True, methods=['get'], url_path='receipt')
    def get_receipt(self, request, pk=None):
        payment = self.get_object()
        settings = GymSettings.get_settings()
        member = payment.member
        membership = payment.membership

        plan_price = float(membership.price) if membership else float(payment.amount)
        discount = float(membership.discount) if membership else 0.0
        final_amount = float(membership.final_amount) if membership else float(payment.amount)
        paid_amount = float(membership.paid_amount) if membership else float(payment.amount)
        pending_amount = float(membership.pending_amount) if membership else 0.0

        cashier_name = payment.received_by.get_full_name() if payment.received_by else 'Gokul Gugale (Admin)'

        return Response({
            'id': payment.id,
            'gym': {
                'name': settings.name,
                'tagline': settings.tagline,
                'address': settings.address,
                'phone': settings.phone,
                'email': settings.email,
                'upi_id': settings.upi_id,
            },
            'receipt_number': payment.receipt_number,
            'payment_date': str(payment.payment_date),
            'date': str(payment.payment_date),
            'created_at': payment.created_at.isoformat(),
            'member': {
                'id': member.id,
                'member_id': member.member_id,
                'name': member.full_name,
                'full_name': member.full_name,
                'phone': member.phone,
                'email': member.email,
                'address': member.address,
            },
            'plan': {
                'name': membership.plan.name if membership and membership.plan else 'Gym Membership Fee',
                'description': membership.plan.description if membership and membership.plan else '',
                'duration_days': membership.plan.duration_days if membership and membership.plan else 30,
                'start_date': str(membership.start_date) if membership else str(payment.payment_date),
                'end_date': str(membership.end_date) if membership else None,
                'price': plan_price,
                'plan_price': plan_price,
                'discount': discount,
                'final_amount': final_amount,
                'paid_amount': paid_amount,
                'pending_amount': pending_amount,
            },
            'membership': {
                'start_date': str(membership.start_date) if membership else str(payment.payment_date),
                'end_date': str(membership.end_date) if membership else None,
                'plan_name': membership.plan.name if membership and membership.plan else 'Gym Membership Fee',
                'plan_description': membership.plan.description if membership and membership.plan else '',
            },
            'plan_description': membership.plan.description if membership and membership.plan else '',
            'discount_applied': discount,
            'final_payable': final_amount,
            'amount_paid': float(payment.amount),
            'remaining_pending_dues': pending_amount,
            'payment_method': payment.get_payment_method_display(),
            'transaction_ref': payment.transaction_ref,
            'received_by': cashier_name,
            'payment': {
                'amount': float(payment.amount),
                'method': payment.get_payment_method_display(),
                'transaction_ref': payment.transaction_ref,
                'notes': payment.notes,
                'received_by': cashier_name,
            }
        })

    @action(detail=True, methods=['get'], url_path='pdf')
    def get_receipt_pdf(self, request, pk=None):
        from django.http import HttpResponse, Http404
        from .pdf_generator import generate_payment_receipt_pdf
        try:
            if str(pk).isdigit():
                payment = self.get_object()
            else:
                payment = Payment.objects.select_related('member', 'membership', 'membership__plan').get(receipt_number__iexact=pk)
        except (Payment.DoesNotExist, Http404):
            raise Http404("Payment receipt not found")
        pdf_bytes = generate_payment_receipt_pdf(payment)
        filename = f"Receipt_{payment.receipt_number}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response


class AttendanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    queryset = Attendance.objects.all().select_related('member')
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        date_param = self.request.query_params.get('date')
        member_id = self.request.query_params.get('member_id')
        if date_param:
            qs = qs.filter(date=date_param)
        if member_id:
            qs = qs.filter(member_id=member_id)
        return qs

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        serializer = AttendanceCheckInSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        identifier = serializer.validated_data['identifier'].strip()
        method = serializer.validated_data.get('method', 'QR_SCAN')

        # Find member by QR token, Member ID, or Phone
        member = Member.objects.filter(
            Q(qr_token=identifier) |
            Q(member_id__iexact=identifier) |
            Q(phone=identifier),
            is_active=True
        ).first()

        if not member:
            return Response({
                'success': False,
                'message': f"No member found matching '{identifier}'. Please verify Member ID or Phone number."
            }, status=status.HTTP_404_NOT_FOUND)

        # Check membership status
        mem_status = member.membership_status
        today = timezone.localdate()

        if mem_status in ['EXPIRED', 'NO_MEMBERSHIP']:
            return Response({
                'success': False,
                'status': 'EXPIRED',
                'message': 'Membership Expired – Please Renew to record attendance!',
                'member': {
                    'id': member.id,
                    'member_id': member.member_id,
                    'full_name': member.full_name,
                    'phone': member.phone,
                    'status': mem_status,
                    'expiry_date': member.current_membership.end_date if member.current_membership else None,
                }
            }, status=status.HTTP_403_FORBIDDEN)

        # Check if already checked in today
        existing = Attendance.objects.filter(member=member, date=today).first()
        if existing:
            return Response({
                'success': True,
                'status': 'ALREADY_CHECKED_IN',
                'message': f"{member.full_name} is already checked in today at {existing.check_in_time.strftime('%I:%M %p')}.",
                'member': {
                    'id': member.id,
                    'member_id': member.member_id,
                    'full_name': member.full_name,
                    'phone': member.phone,
                    'status': mem_status,
                    'days_remaining': member.days_remaining
                },
                'attendance': AttendanceSerializer(existing).data
            })

        # Record check-in
        record = Attendance.objects.create(
            member=member,
            date=today,
            check_in_time=timezone.now(),
            check_in_method=method
        )

        return Response({
            'success': True,
            'status': 'SUCCESS',
            'message': f"Welcome {member.full_name}! Check-in recorded at {record.check_in_time.strftime('%I:%M %p')}.",
            'member': {
                'id': member.id,
                'member_id': member.member_id,
                'full_name': member.full_name,
                'phone': member.phone,
                'status': mem_status,
                'days_remaining': member.days_remaining
            },
            'attendance': AttendanceSerializer(record).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='stats')
    def attendance_stats(self, request):
        today = timezone.localdate()
        
        # Today's hourly distribution (6 AM to 10 PM)
        today_records = Attendance.objects.filter(date=today)
        hours_distribution = []
        for h in range(6, 23):
            # Check local hour
            count = sum(1 for r in today_records if timezone.localtime(r.check_in_time).hour == h)
            label = f"{h if h <= 12 else h - 12} {'AM' if h < 12 else 'PM'}"
            hours_distribution.append({'hour': label, 'count': count})

        # Top 5 most active members this month
        month_start = today.replace(day=1)
        top_active = Member.objects.filter(
            attendance_records__date__gte=month_start,
            is_active=True
        ).annotate(
            visit_count=Count('attendance_records')
        ).order_by('-visit_count')[:5]

        top_active_data = [
            {
                'id': m.id,
                'member_id': m.member_id,
                'full_name': m.full_name,
                'phone': m.phone,
                'visit_count': m.visit_count,
            }
            for m in top_active
        ]

        return Response({
            'today_total': today_records.count(),
            'hours_distribution': hours_distribution,
            'top_active_members': top_active_data
        })


class TrainerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    queryset = Trainer.objects.all()
    serializer_class = TrainerSerializer

    def perform_create(self, serializer):
        trainer = serializer.save()
        log_audit(self.request.user, 'TRAINER_ADDED', 'TRAINER', trainer.id, f"Added trainer {trainer.name}")


class WorkoutPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    queryset = WorkoutPlan.objects.all().select_related('member', 'trainer').prefetch_related('exercises')
    serializer_class = WorkoutPlanSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        member_id = self.request.query_params.get('member_id')
        if member_id:
            qs = qs.filter(member_id=member_id)
        return qs

    @action(detail=True, methods=['post'], url_path='add-exercise')
    def add_exercise(self, request, pk=None):
        plan = self.get_object()
        serializer = WorkoutExerciseSerializer(data={**request.data, 'workout_plan': plan.id})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsReceptionistOrAdmin]
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer

    def get_queryset(self):
        # Auto-seed default categories if empty
        if not ExpenseCategory.objects.exists():
            defaults = [
                ('Rent & Property', 'Gym lease, building rent, and property taxes'),
                ('Electricity & Power Bills', 'Electricity, power, and generator fuel'),
                ('Equipment Purchase & Repairs', 'Machines, barbells, dumbbells, cables, and servicing'),
                ('Gym Maintenance & Sanitation', 'AC servicing, plumbing, paint, and repairs'),
                ('Trainer & Staff Salaries', 'Fitness coaches, front desk, and housekeeping payroll'),
                ('Cleaning & Housekeeping Supplies', 'Sanitizers, floor cleaners, phenyl, and wipes'),
                ('Marketing, Flex Banners & Ads', 'Social media ads, hoarding flex, and pamphlets'),
                ('Supplements & Protein Stock', 'Store inventory purchase and restocking'),
                ('General / Miscellaneous', 'Internet wifi, drinking water, first aid, and petty cash'),
            ]
            for name, desc in defaults:
                ExpenseCategory.objects.get_or_create(name=name, defaults={'description': desc})
        return ExpenseCategory.objects.all().order_by('name')


class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsReceptionistOrAdmin]
    queryset = Expense.objects.all().select_related('recorded_by')
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if category:
            qs = qs.filter(category=category)
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        return qs

    def perform_create(self, serializer):
        expense = serializer.save(recorded_by=self.request.user)
        log_audit(
            self.request.user,
            'EXPENSE_RECORDED',
            'EXPENSE',
            expense.id,
            f"Recorded expense {expense.expense_id} of ₹{expense.amount} under {expense.get_category_display()}"
        )


class FinancialSummaryView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)
        
        # Last month
        first_day_current = month_start
        last_month_end = first_day_current - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)

        # Revenue from Membership Fees
        mem_total_rev = Payment.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        mem_today_rev = Payment.objects.filter(payment_date=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        mem_this_month_rev = Payment.objects.filter(payment_date__gte=month_start).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        mem_last_month_rev = Payment.objects.filter(payment_date__range=[last_month_start, last_month_end]).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Revenue from Supplements & Store Sales
        sup_total_rev = SupplementSale.objects.aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')
        sup_today_rev = SupplementSale.objects.filter(sale_date__date=today).aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')
        sup_this_month_rev = SupplementSale.objects.filter(sale_date__date__gte=month_start).aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')
        sup_last_month_rev = SupplementSale.objects.filter(sale_date__date__range=[last_month_start, last_month_end]).aggregate(total=Sum('final_amount'))['total'] or Decimal('0.00')

        # Combined Total Revenues
        total_rev = mem_total_rev + sup_total_rev
        today_rev = mem_today_rev + sup_today_rev
        this_month_rev = mem_this_month_rev + sup_this_month_rev
        last_month_rev = mem_last_month_rev + sup_last_month_rev

        # Expenses
        total_exp = Expense.objects.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        this_month_exp = Expense.objects.filter(date__gte=month_start).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        last_month_exp = Expense.objects.filter(date__range=[last_month_start, last_month_end]).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Dues
        pending_dues = MemberMembership.objects.filter(member__is_active=True).aggregate(total=Sum('pending_amount'))['total'] or Decimal('0.00')

        # Category breakdown
        cat_expenses = Expense.objects.values('category').annotate(total=Sum('amount')).order_by('-total')
        categories_data = [
            {
                'category': c['category'],
                'category_name': dict(Expense.CATEGORY_CHOICES).get(c['category'], c['category']),
                'total': float(c['total'])
            }
            for c in cat_expenses
        ]

        return Response({
            'total_revenue': float(total_rev),
            'total_expenses': float(total_exp),
            'net_profit': float(total_rev - total_exp),
            'today_collection': float(today_rev),
            'this_month_collection': float(this_month_rev),
            'last_month_collection': float(last_month_rev),
            'this_month_expenses': float(this_month_exp),
            'last_month_expenses': float(last_month_exp),
            'this_month_profit': float(this_month_rev - this_month_exp),
            'pending_dues': float(pending_dues),
            'category_expenses': categories_data,
            # Dedicated Stream Breakdown
            'membership_revenue': {
                'all_time': float(mem_total_rev),
                'today': float(mem_today_rev),
                'this_month': float(mem_this_month_rev),
                'last_month': float(mem_last_month_rev),
            },
            'supplement_revenue': {
                'all_time': float(sup_total_rev),
                'today': float(sup_today_rev),
                'this_month': float(sup_this_month_rev),
                'last_month': float(sup_last_month_rev),
            },
        })


class ReportsView(APIView):
    permission_classes = [IsReceptionistOrAdmin]

    def get(self, request):
        report_type = request.query_params.get('type', 'members')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if report_type == 'members':
            qs = Member.objects.filter(is_active=True).prefetch_related('memberships', 'memberships__plan')
            if start_date:
                qs = qs.filter(joining_date__gte=start_date)
            if end_date:
                qs = qs.filter(joining_date__lte=end_date)
            
            data = [
                {
                    'Member ID': m.member_id,
                    'Name': m.full_name,
                    'Phone': m.phone,
                    'Gender': m.gender,
                    'Joining Date': str(m.joining_date),
                    'Plan': m.current_membership.plan.name if m.current_membership and m.current_membership.plan else 'None',
                    'Start Date': str(m.current_membership.start_date) if m.current_membership else 'N/A',
                    'Expiry Date': str(m.current_membership.end_date) if m.current_membership else 'N/A',
                    'Status': m.membership_status,
                    'Pending (₹)': float(m.current_membership.pending_amount) if m.current_membership else 0.0
                }
                for m in qs
            ]
            return Response({'title': 'Member Registry Report', 'data': data})

        elif report_type == 'payments':
            qs = Payment.objects.select_related('member', 'membership__plan', 'received_by')
            if start_date:
                qs = qs.filter(payment_date__gte=start_date)
            if end_date:
                qs = qs.filter(payment_date__lte=end_date)

            data = [
                {
                    'Receipt No': p.receipt_number,
                    'Date': str(p.payment_date),
                    'Member ID': p.member.member_id,
                    'Member Name': p.member.full_name,
                    'Plan': p.membership.plan.name if p.membership and p.membership.plan else 'N/A',
                    'Amount (₹)': float(p.amount),
                    'Method': p.get_payment_method_display(),
                    'Ref No': p.transaction_ref or 'N/A',
                    'Received By': p.received_by.get_full_name() if p.received_by else 'Admin'
                }
                for p in qs
            ]
            return Response({'title': 'Payments & Collection Report', 'data': data})

        elif report_type == 'attendance':
            qs = Attendance.objects.select_related('member')
            if start_date:
                qs = qs.filter(date__gte=start_date)
            if end_date:
                qs = qs.filter(date__lte=end_date)

            data = [
                {
                    'Date': str(a.date),
                    'Check-in Time': a.check_in_time.strftime('%I:%M %p'),
                    'Member ID': a.member.member_id,
                    'Name': a.member.full_name,
                    'Phone': a.member.phone,
                    'Method': a.get_check_in_method_display()
                }
                for a in qs
            ]
            return Response({'title': 'Attendance Logs Report', 'data': data})

        elif report_type == 'supplements':
            qs = SupplementSale.objects.select_related('member', 'sold_by').prefetch_related('items__product').order_by('-sale_date')
            if start_date:
                qs = qs.filter(sale_date__date__gte=start_date)
            if end_date:
                qs = qs.filter(sale_date__date__lte=end_date)

            total_rev = qs.aggregate(t=Sum('final_amount'))['t'] or Decimal('0.00')
            total_sales = qs.count()

            data = []
            total_units = 0
            for s in qs:
                items_str = ", ".join([f"{item.product_name} (x{item.quantity})" for item in s.items.all()])
                items_count = sum([item.quantity for item in s.items.all()])
                total_units += items_count
                data.append({
                    'Invoice No': s.invoice_number,
                    'Date': s.sale_date.strftime('%Y-%m-%d %I:%M %p'),
                    'Customer': s.customer_name,
                    'Phone': s.customer_phone or 'N/A',
                    'Customer Type': 'Gym Member' if s.member else 'Walk-in Customer',
                    'Items': items_str,
                    'Qty': items_count,
                    'Subtotal (₹)': float(s.subtotal),
                    'Discount (₹)': float(s.discount),
                    'Final Paid (₹)': float(s.final_amount),
                    'Method': s.get_payment_method_display(),
                    'Billed By': s.sold_by.get_full_name() if s.sold_by else 'Staff'
                })

            avg_val = float(round(total_rev / total_sales, 2)) if total_sales > 0 else 0.0

            return Response({
                'title': 'Supplements & Store Sales Report',
                'summary': {
                    'total_revenue': float(total_rev),
                    'total_sales_count': total_sales,
                    'total_units_sold': total_units,
                    'average_sale_value': avg_val
                },
                'data': data
            })

        elif report_type == 'financials':
            mem_qs = Payment.objects.all()
            sup_qs = SupplementSale.objects.all()
            exp_qs = Expense.objects.all()
            if start_date:
                mem_qs = mem_qs.filter(payment_date__gte=start_date)
                sup_qs = sup_qs.filter(sale_date__date__gte=start_date)
                exp_qs = exp_qs.filter(date__gte=start_date)
            if end_date:
                mem_qs = mem_qs.filter(payment_date__lte=end_date)
                sup_qs = sup_qs.filter(sale_date__date__lte=end_date)
                exp_qs = exp_qs.filter(date__lte=end_date)

            mem_rev = mem_qs.aggregate(t=Sum('amount'))['t'] or Decimal('0.00')
            sup_rev = sup_qs.aggregate(t=Sum('final_amount'))['t'] or Decimal('0.00')
            total_rev = mem_rev + sup_rev
            total_exp = exp_qs.aggregate(t=Sum('amount'))['t'] or Decimal('0.00')

            data = [
                {'Metric': 'Membership Fees Collection', 'Amount (₹)': float(mem_rev)},
                {'Metric': 'Supplements & Store Sales', 'Amount (₹)': float(sup_rev)},
                {'Metric': 'Gross Total Revenue', 'Amount (₹)': float(total_rev)},
                {'Metric': 'Total Operating Expenses', 'Amount (₹)': float(total_exp)},
                {'Metric': 'Net Business Profit', 'Amount (₹)': float(total_rev - total_exp)},
            ]

            return Response({
                'title': 'Financial P&L Report',
                'summary': {
                    'total_revenue': float(total_rev),
                    'membership_revenue': float(mem_rev),
                    'supplement_revenue': float(sup_rev),
                    'total_expenses': float(total_exp),
                    'net_profit': float(total_rev - total_exp)
                },
                'data': data
            })

        return Response({'error': 'Invalid report type'}, status=status.HTTP_400_BAD_REQUEST)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdminUserRole]
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer


class DatabaseBackupView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        """
        Exports a complete JSON dump of all gym data.
        """
        data = {
            'exported_at': timezone.now().isoformat(),
            'gym_settings': json.loads(django_serializers.serialize('json', GymSettings.objects.all())),
            'plans': json.loads(django_serializers.serialize('json', MembershipPlan.objects.all())),
            'trainers': json.loads(django_serializers.serialize('json', Trainer.objects.all())),
            'members': json.loads(django_serializers.serialize('json', Member.objects.all())),
            'memberships': json.loads(django_serializers.serialize('json', MemberMembership.objects.all())),
            'payments': json.loads(django_serializers.serialize('json', Payment.objects.all())),
            'attendance': json.loads(django_serializers.serialize('json', Attendance.objects.all())),
            'expenses': json.loads(django_serializers.serialize('json', Expense.objects.all())),
            'workouts': json.loads(django_serializers.serialize('json', WorkoutPlan.objects.all())),
            'audit_logs': json.loads(django_serializers.serialize('json', AuditLog.objects.all())),
        }
        log_audit(request.user, 'BACKUP_CREATED', 'SYSTEM', 0, "Generated system database backup.")
        return JsonResponse(data, safe=False)


# ============================================================================
# SUPPLEMENTS & STORE VIEWSETS
# ============================================================================

class SupplementCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    queryset = SupplementCategory.objects.all().prefetch_related('products')
    serializer_class = SupplementCategorySerializer


class SupplementProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    queryset = SupplementProduct.objects.all().select_related('category')
    serializer_class = SupplementProductSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        low_stock_only = self.request.query_params.get('low_stock')

        if category_id:
            qs = qs.filter(category_id=category_id)
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(brand__icontains=search) |
                Q(flavor__icontains=search)
            )
        if low_stock_only == 'true':
            qs = qs.filter(stock_quantity__lte=F('min_stock_alert'))

        return qs

    @action(detail=True, methods=['post'], url_path='restock')
    def restock(self, request, pk=None):
        product = self.get_object()
        added_qty = int(request.data.get('quantity', 0))
        cost_price = request.data.get('cost_price')

        if added_qty <= 0:
            return Response({'error': 'Quantity to restock must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)

        product.stock_quantity += added_qty
        if cost_price:
            product.cost_price = Decimal(str(cost_price))
        product.save(update_fields=['stock_quantity', 'cost_price', 'updated_at'])

        log_audit(
            request.user, 'SUPPLEMENT_RESTOCKED', 'SupplementProduct', product.id,
            f"Restocked {added_qty} units of '{product.name}' (Total stock now: {product.stock_quantity})"
        )

        return Response({
            'message': f"Successfully added {added_qty} units to {product.name}.",
            'product': SupplementProductSerializer(product).data
        })


class SupplementSaleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsStaffUser]
    queryset = SupplementSale.objects.all().select_related('member', 'sold_by').prefetch_related('items__product')
    serializer_class = SupplementSaleSerializer

    def perform_create(self, serializer):
        sale = serializer.save(sold_by=self.request.user)
        log_audit(
            self.request.user, 'SUPPLEMENT_SOLD', 'SupplementSale', sale.id,
            f"Sold supplements to '{sale.customer_name}' for ₹{sale.final_amount} (Invoice: {sale.invoice_number})"
        )

    @action(detail=True, methods=['get'], url_path='receipt')
    def receipt(self, request, pk=None):
        sale = self.get_object()
        settings = GymSettings.get_settings()
        cashier_name = sale.sold_by.get_full_name() if sale.sold_by else "Admin"

        items_list = []
        for item in sale.items.all():
            items_list.append({
                'id': item.id,
                'name': item.product_name,
                'brand': item.product_brand,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'subtotal': float(item.subtotal),
            })

        return Response({
            'id': sale.id,
            'gym': {
                'name': settings.name,
                'tagline': settings.tagline,
                'address': settings.address,
                'phone': settings.phone,
                'email': settings.email,
                'upi_id': settings.upi_id,
            },
            'invoice_number': sale.invoice_number,
            'sale_date': sale.sale_date.strftime('%d-%b-%Y %I:%M %p'),
            'date': sale.sale_date.strftime('%d-%b-%Y'),
            'time': sale.sale_date.strftime('%I:%M %p'),
            'customer_name': sale.customer_name,
            'customer_phone': sale.customer_phone or "N/A",
            'member_id': sale.member.member_id if sale.member else None,
            'items': items_list,
            'subtotal': float(sale.subtotal),
            'discount': float(sale.discount),
            'final_amount': float(sale.final_amount),
            'payment_method': sale.get_payment_method_display(),
            'sold_by': cashier_name,
            'notes': sale.notes or "",
        })

    @action(detail=True, methods=['get'], url_path='pdf')
    def get_invoice_pdf(self, request, pk=None):
        from django.http import HttpResponse, Http404
        from .pdf_generator import generate_supplement_invoice_pdf
        try:
            if str(pk).isdigit():
                sale = self.get_object()
            else:
                sale = SupplementSale.objects.select_related('member', 'sold_by').prefetch_related('items', 'items__product').get(invoice_number__iexact=pk)
        except (SupplementSale.DoesNotExist, Http404):
            raise Http404("Supplement invoice not found")
        pdf_bytes = generate_supplement_invoice_pdf(sale)
        filename = f"Invoice_{sale.invoice_number}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        today = date.today()
        first_day_of_month = today.replace(day=1)

        # Product & Inventory stats
        products = SupplementProduct.objects.filter(is_active=True)
        total_products = products.count()
        low_stock_count = products.filter(stock_quantity__lte=F('min_stock_alert')).count()

        total_inventory_cost = sum([p.stock_quantity * p.cost_price for p in products])
        total_retail_valuation = sum([p.stock_quantity * p.selling_price for p in products])

        # Sales stats
        today_sales = SupplementSale.objects.filter(sale_date__date=today).aggregate(t=Sum('final_amount'))['t'] or Decimal('0.00')
        monthly_sales = SupplementSale.objects.filter(sale_date__date__gte=first_day_of_month).aggregate(t=Sum('final_amount'))['t'] or Decimal('0.00')
        lifetime_sales = SupplementSale.objects.aggregate(t=Sum('final_amount'))['t'] or Decimal('0.00')

        return Response({
            'total_products': total_products,
            'low_stock_count': low_stock_count,
            'total_inventory_cost': float(total_inventory_cost),
            'total_retail_valuation': float(total_retail_valuation),
            'today_sales': float(today_sales),
            'monthly_sales': float(monthly_sales),
            'lifetime_sales': float(lifetime_sales),
        })


class PublicReceiptPdfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, receipt_number):
        from django.http import HttpResponse, Http404
        from .pdf_generator import generate_payment_receipt_pdf
        try:
            payment = Payment.objects.select_related('member', 'membership', 'membership__plan').get(receipt_number__iexact=receipt_number)
        except Payment.DoesNotExist:
            raise Http404("Receipt not found")

        pdf_bytes = generate_payment_receipt_pdf(payment)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Receipt_{payment.receipt_number}.pdf"'
        return response


class PublicInvoicePdfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, invoice_number):
        from django.http import HttpResponse, Http404
        from .pdf_generator import generate_supplement_invoice_pdf
        try:
            sale = SupplementSale.objects.select_related('member', 'sold_by').prefetch_related('items', 'items__product').get(invoice_number__iexact=invoice_number)
        except SupplementSale.DoesNotExist:
            raise Http404("Invoice not found")

        pdf_bytes = generate_supplement_invoice_pdf(sale)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Invoice_{sale.invoice_number}.pdf"'
        return response


