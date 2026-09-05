from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
import re
from datetime import date, timedelta
from decimal import Decimal
from .models import (
    User, GymSettings, Trainer, MembershipPlan, Member,
    MemberMembership, Payment, Attendance, WorkoutPlan,
    WorkoutExercise, Expense, ExpenseCategory, AuditLog,
    SupplementCategory, SupplementProduct, SupplementSale, SupplementSaleItem
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
    plan_description = serializers.ReadOnlyField(source='membership.plan.description')

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
    plan_description = serializers.ReadOnlyField(source='plan.description')
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
            'phone', 'email', 'aadhar_number', 'gender', 'dob', 'photo', 'source',
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
    current_plan = serializers.SerializerMethodField()
    expiry_date = serializers.SerializerMethodField()
    start_date = serializers.SerializerMethodField()
    pending_amount = serializers.SerializerMethodField()
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


class ExpenseCategorySerializer(serializers.ModelSerializer):
    expenses_count = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'description', 'expenses_count', 'created_at']

    def get_expenses_count(self, obj):
        return Expense.objects.filter(category__iexact=obj.name).count()


class ExpenseSerializer(serializers.ModelSerializer):
    category = serializers.CharField(max_length=100)
    category_display = serializers.SerializerMethodField()
    recorded_by_name = serializers.ReadOnlyField(source='recorded_by.get_full_name')
    description = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['expense_id', 'created_at']

    def get_category_display(self, obj):
        choices_dict = dict(Expense.CATEGORY_CHOICES)
        return choices_dict.get(obj.category, obj.category)

    def create(self, validated_data):
        if not validated_data.get('expense_id'):
            validated_data['expense_id'] = Expense.generate_expense_id()
        if not validated_data.get('description'):
            validated_data['description'] = validated_data.get('category', 'Expense')
        return super().create(validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    user_name = serializers.ReadOnlyField(source='user.get_full_name')

    class Meta:
        model = AuditLog
        fields = '__all__'


class AddMemberWithMembershipSerializer(serializers.Serializer):
    # Personal Info
    full_name = serializers.CharField(max_length=200, required=False)
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    dob = serializers.DateField(required=True)
    gender = serializers.ChoiceField(choices=Member.GENDER_CHOICES, required=True)
    address = serializers.CharField(required=True)
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    aadhar_number = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    source = serializers.ChoiceField(choices=Member.SOURCE_CHOICES, default='WALK_IN', required=False)
    joining_date = serializers.DateField(default=date.today, required=False)
    assigned_trainer_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    # Membership Plan Info
    plan_id = serializers.IntegerField()
    start_date = serializers.DateField(default=date.today, required=False)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00, required=False)
    
    # Payment Info
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.00, required=False)
    payment_method = serializers.CharField(default='UPI', required=False)
    transaction_ref = serializers.CharField(required=False, allow_blank=True)

    def validate_phone(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Mobile number is required.")
        if Member.objects.filter(phone=cleaned).exists():
            raise serializers.ValidationError(f"Mobile number '{cleaned}' is already registered with another member.")
        return cleaned

    def validate_email(self, value):
        if not value:
            return None
        cleaned = str(value).strip().lower()
        if not cleaned:
            return None
        if Member.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError(f"Email address '{cleaned}' is already registered with another member.")
        return cleaned

    def validate_aadhar_number(self, value):
        if not value:
            return ''
        cleaned = re.sub(r'[\s\-]', '', str(value).strip())
        if not cleaned:
            return ''
        if not cleaned.isdigit() or len(cleaned) != 12:
            raise serializers.ValidationError("Aadhaar number must be a valid 12-digit number.")
        return f"{cleaned[:4]} {cleaned[4:8]} {cleaned[8:]}"

    def validate(self, attrs):
        full_name = attrs.get('full_name', '').strip()
        first_name = attrs.get('first_name', '').strip()
        last_name = attrs.get('last_name', '').strip()

        if full_name:
            parts = full_name.split(' ', 1)
            attrs['first_name'] = parts[0]
            attrs['last_name'] = parts[1] if len(parts) > 1 else ''
        elif not first_name:
            raise serializers.ValidationError({"full_name": "Full name is required."})

        return attrs


class MemberUpdateSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(max_length=200, required=False)

    class Meta:
        model = Member
        fields = [
            'id', 'member_id', 'full_name', 'first_name', 'last_name',
            'phone', 'email', 'gender', 'dob', 'address', 'photo',
            'emergency_contact_name', 'emergency_contact_phone', 'aadhar_number',
            'source', 'joining_date', 'assigned_trainer', 'notes', 'is_active'
        ]
        read_only_fields = ['id', 'member_id']

    def validate_phone(self, value):
        cleaned = value.strip()
        instance_id = self.instance.id if self.instance else None
        if cleaned and instance_id:
            if Member.objects.filter(phone=cleaned).exclude(id=instance_id).exists():
                raise serializers.ValidationError(f"Mobile number '{cleaned}' is already registered with another member.")
        return cleaned

    def validate_email(self, value):
        if not value:
            return None
        cleaned = str(value).strip().lower()
        if not cleaned:
            return None
        instance_id = self.instance.id if self.instance else None
        if instance_id and Member.objects.filter(email__iexact=cleaned).exclude(id=instance_id).exists():
            raise serializers.ValidationError(f"Email address '{cleaned}' is already registered with another member.")
        return cleaned

    def validate_aadhar_number(self, value):
        if not value:
            return ''
        cleaned = re.sub(r'[\s\-]', '', str(value).strip())
        if not cleaned:
            return ''
        if not cleaned.isdigit() or len(cleaned) != 12:
            raise serializers.ValidationError("Aadhaar number must be a valid 12-digit number.")
        return f"{cleaned[:4]} {cleaned[4:8]} {cleaned[8:]}"

    def update(self, instance, validated_data):
        full_name = validated_data.pop('full_name', None)
        if full_name is not None:
            parts = full_name.strip().split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''

        return super().update(instance, validated_data)


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


class SupplementCategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = SupplementCategory
        fields = ['id', 'name', 'description', 'products_count', 'created_at']

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()


class SupplementProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = SupplementProduct
        fields = [
            'id', 'name', 'brand', 'category', 'category_name', 'flavor',
            'weight_or_servings', 'cost_price', 'selling_price', 'stock_quantity',
            'min_stock_alert', 'is_low_stock', 'expiry_date', 'image', 'is_active',
            'created_at', 'updated_at'
        ]


class SupplementSaleItemSerializer(serializers.ModelSerializer):
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = SupplementSaleItem
        fields = [
            'id', 'product', 'product_name', 'product_brand',
            'quantity', 'unit_price', 'cost_price', 'subtotal'
        ]
        read_only_fields = ['id', 'product_name', 'product_brand', 'cost_price', 'subtotal']


class SupplementSaleSerializer(serializers.ModelSerializer):
    items = SupplementSaleItemSerializer(many=True)
    sold_by_name = serializers.ReadOnlyField(source='sold_by.get_full_name')
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = SupplementSale
        fields = [
            'id', 'invoice_number', 'member', 'customer_name', 'customer_phone',
            'subtotal', 'discount', 'final_amount', 'payment_method',
            'payment_method_display', 'sold_by', 'sold_by_name', 'sale_date',
            'notes', 'items', 'created_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'subtotal', 'final_amount', 'created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        if not items_data:
            raise serializers.ValidationError({"items": "At least one supplement item is required."})

        # Calculate totals and validate stock
        calculated_subtotal = Decimal('0.00')
        prepared_items = []

        for item_data in items_data:
            product = item_data.get('product')
            quantity = item_data.get('quantity', 1)
            unit_price = item_data.get('unit_price') or (product.selling_price if product else Decimal('0.00'))

            if not product:
                raise serializers.ValidationError({"items": "A valid product must be selected for each item."})

            if product.stock_quantity < quantity:
                raise serializers.ValidationError({
                    "items": f"Insufficient stock for '{product.name}'. Available: {product.stock_quantity}, requested: {quantity}."
                })

            item_subtotal = Decimal(str(unit_price)) * quantity
            calculated_subtotal += item_subtotal

            prepared_items.append({
                'product': product,
                'product_name': product.name,
                'product_brand': product.brand,
                'quantity': quantity,
                'unit_price': unit_price,
                'cost_price': product.cost_price,
                'subtotal': item_subtotal,
            })

        discount = validated_data.get('discount', Decimal('0.00'))
        final_amount = max(Decimal('0.00'), calculated_subtotal - Decimal(str(discount)))

        if not validated_data.get('invoice_number'):
            validated_data['invoice_number'] = SupplementSale.generate_invoice_number()

        validated_data['subtotal'] = calculated_subtotal
        validated_data['final_amount'] = final_amount

        # Create the Sale
        sale = SupplementSale.objects.create(**validated_data)

        # Create Items & Deduct Stock
        for prep in prepared_items:
            product = prep['product']
            SupplementSaleItem.objects.create(
                sale=sale,
                product=product,
                product_name=prep['product_name'],
                product_brand=prep['product_brand'],
                quantity=prep['quantity'],
                unit_price=prep['unit_price'],
                cost_price=prep['cost_price'],
                subtotal=prep['subtotal'],
            )
            # Deduct inventory
            product.stock_quantity = max(0, product.stock_quantity - prep['quantity'])
            product.save(update_fields=['stock_quantity', 'updated_at'])

        return sale

