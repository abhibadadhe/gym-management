from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
from .models import (
    User, GymSettings, Trainer, MembershipPlan, Member,
    MemberMembership, Payment, Attendance, WorkoutPlan,
    WorkoutExercise, Expense, AuditLog
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'avatar']
        read_only_fields = ['id']


class GymSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GymSettings
        fields = '__all__'


class TrainerSerializer(serializers.ModelSerializer):
    active_members_count = serializers.SerializerMethodField()

    class Meta:
        model = Trainer
        fields = '__all__'

    def get_active_members_count(self, obj):
        return obj.members.filter(is_active=True).count()


class MembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    member_name = serializers.ReadOnlyField(source='member.full_name')
    member_id = serializers.ReadOnlyField(source='member.member_id')
    received_by_name = serializers.ReadOnlyField(source='received_by.get_full_name')
    plan_name = serializers.ReadOnlyField(source='membership.plan.name')

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['receipt_number', 'created_at']

    def create(self, validated_data):
        if not validated_data.get('receipt_number'):
            validated_data['receipt_number'] = Payment.generate_receipt_number()
        
        payment = super().create(validated_data)
        
        # If attached to a membership, update its paid_amount
        if payment.membership:
            membership = payment.membership
            membership.paid_amount += payment.amount
            membership.save()
            
        return payment


class MemberMembershipSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    plan_duration_days = serializers.ReadOnlyField(source='plan.duration_days')
    member_name = serializers.ReadOnlyField(source='member.full_name')
    member_code = serializers.ReadOnlyField(source='member.member_id')
    status = serializers.ReadOnlyField()

    class Meta:
        model = MemberMembership
        fields = '__all__'
        read_only_fields = ['created_at']


class AttendanceSerializer(serializers.ModelSerializer):
    member_name = serializers.ReadOnlyField(source='member.full_name')
    member_id = serializers.ReadOnlyField(source='member.member_id')
    member_phone = serializers.ReadOnlyField(source='member.phone')
    membership_status = serializers.ReadOnlyField(source='member.membership_status')

    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['date', 'check_in_time']


class MemberListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    membership_status = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    current_plan = serializers.SerializerMethodField()
    expiry_date = serializers.SerializerMethodField()
    start_date = serializers.SerializerMethodField()
    pending_amount = serializers.SerializerMethodField()
    trainer_name = serializers.ReadOnlyField(source='assigned_trainer.name')

    class Meta:
        model = Member
        fields = [
            'id', 'member_id', 'first_name', 'last_name', 'full_name',
            'phone', 'email', 'gender', 'dob', 'photo', 'source',
            'joining_date', 'assigned_trainer', 'trainer_name',
            'qr_token', 'is_active', 'membership_status', 'days_remaining',
            'current_plan', 'start_date', 'expiry_date', 'pending_amount',
            'created_at'
        ]

    def get_current_plan(self, obj):
        curr = obj.current_membership
        return curr.plan.name if curr and curr.plan else None

    def get_expiry_date(self, obj):
        curr = obj.current_membership
        return curr.end_date if curr else None

    def get_start_date(self, obj):
        curr = obj.current_membership
        return curr.start_date if curr else None

    def get_pending_amount(self, obj):
        curr = obj.current_membership
        return float(curr.pending_amount) if curr else 0.0


class MemberDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    membership_status = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    trainer_name = serializers.ReadOnlyField(source='assigned_trainer.name')
    memberships = MemberMembershipSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    attendance_records = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    total_pending = serializers.SerializerMethodField()
    total_visits = serializers.SerializerMethodField()
    visits_this_month = serializers.SerializerMethodField()
    last_visit = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ['member_id', 'qr_token', 'created_at', 'updated_at']

    def get_attendance_records(self, obj):
        # Return recent 15 check-ins
        records = obj.attendance_records.order_by('-check_in_time')[:15]
        return AttendanceSerializer(records, many=True).data

    def get_total_paid(self, obj):
        payments = obj.payments.all()
        return sum(float(p.amount) for p in payments)

    def get_total_pending(self, obj):
        curr = obj.current_membership
        return float(curr.pending_amount) if curr else 0.0

    def get_total_visits(self, obj):
        return obj.attendance_records.count()

    def get_visits_this_month(self, obj):
        today = date.today()
        return obj.attendance_records.filter(date__year=today.year, date__month=today.month).count()

    def get_last_visit(self, obj):
        latest = obj.attendance_records.order_by('-check_in_time').first()
        return latest.check_in_time.strftime('%d %b %Y, %I:%M %p') if latest else None


class WorkoutExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkoutExercise
        fields = '__all__'


class WorkoutPlanSerializer(serializers.ModelSerializer):
    exercises = WorkoutExerciseSerializer(many=True, read_only=True)
    trainer_name = serializers.ReadOnlyField(source='trainer.name')
    member_name = serializers.ReadOnlyField(source='member.full_name')

    class Meta:
        model = WorkoutPlan
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    recorded_by_name = serializers.ReadOnlyField(source='recorded_by.get_full_name')

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['expense_id', 'created_at']

    def create(self, validated_data):
        if not validated_data.get('expense_id'):
            validated_data['expense_id'] = Expense.generate_expense_id()
        return super().create(validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    user_name = serializers.ReadOnlyField(source='user.get_full_name')

    class Meta:
        model = AuditLog
        fields = '__all__'


class AddMemberWithMembershipSerializer(serializers.Serializer):
    # Personal Info
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    dob = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Member.GENDER_CHOICES, default='MALE')
    address = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True)
    source = serializers.ChoiceField(choices=Member.SOURCE_CHOICES, default='WALK_IN')
    joining_date = serializers.DateField(default=date.today)
    assigned_trainer_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    # Membership Plan Info
    plan_id = serializers.IntegerField()
    start_date = serializers.DateField(default=date.today)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Payment Info
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES, default='UPI')
    transaction_ref = serializers.CharField(required=False, allow_blank=True)


class RenewMembershipSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    plan_id = serializers.IntegerField()
    start_date = serializers.DateField(required=False)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES, default='UPI')
    transaction_ref = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class QuickPaymentSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    membership_id = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES, default='UPI')
    transaction_ref = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class AttendanceCheckInSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="Can be QR token, Member ID (MF20260001), or Phone number")
    method = serializers.ChoiceField(choices=Attendance.METHOD_CHOICES, default='QR_SCAN')
