import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal

class UserRole(models.TextChoices):
    OWNER = 'OWNER', 'Owner / Admin'
    MANAGER = 'MANAGER', 'Manager / Receptionist'
    TRAINER = 'TRAINER', 'Trainer'

class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.OWNER
    )
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"


class GymSettings(models.Model):
    name = models.CharField(max_length=100, default='Morya Fitness')
    tagline = models.CharField(max_length=200, default='Unleash Your Inner Strength')
    address = models.TextField(default='Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103')
    phone = models.CharField(max_length=30, default='+91 98220 12345')
    email = models.EmailField(default='contact@moryafitness.com')
    website = models.CharField(max_length=100, default='https://moryafitness.com')
    upi_id = models.CharField(max_length=100, default='moryafitness@okhdfcbank')
    receipt_prefix = models.CharField(max_length=20, default='MF-REC-')
    reminder_days = models.CharField(max_length=50, default='7,3,0')
    logo = models.ImageField(upload_to='gym/', blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Gym Settings'

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Trainer(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]

    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='trainer_profile')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    specialization = models.CharField(max_length=150, default='General Fitness & Bodybuilding')
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    joining_date = models.DateField(default=date.today)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    photo = models.ImageField(upload_to='trainers/', blank=True, null=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.specialization})"


class MembershipPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('WEIGHT_TRAINING', 'Weight Training'),
        ('CARDIO', 'Weight Training + Cardio'),
        ('GENERAL', 'General'),
    ]

    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=30, choices=PLAN_TYPE_CHOICES, default='WEIGHT_TRAINING')
    duration_days = models.PositiveIntegerField(help_text="Duration in days (e.g. 30, 90, 180, 365)")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - ₹{self.price} ({self.duration_days} Days)"


class Member(models.Model):
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    ]

    SOURCE_CHOICES = [
        ('WALK_IN', 'Walk-in'),
        ('FRIEND', 'Friend / Referral'),
        ('SOCIAL_MEDIA', 'Instagram / Social Media'),
        ('POSTER', 'Banner / Poster'),
        ('OTHER', 'Other'),
    ]

    member_id = models.CharField(max_length=30, unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    email = models.EmailField(blank=True, null=True, unique=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='MALE')
    address = models.TextField(blank=True)
    photo = models.ImageField(upload_to='members/', blank=True, null=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    aadhar_number = models.CharField(max_length=20, blank=True, default='')
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='WALK_IN')
    joining_date = models.DateField(default=date.today)
    assigned_trainer = models.ForeignKey(Trainer, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')
    qr_token = models.CharField(max_length=64, unique=True, default=uuid.uuid4, db_index=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, help_text="Soft delete flag")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.member_id} - {self.first_name} {self.last_name}"

    def save(self, *args, **kwargs):
        if self.email:
            cleaned = str(self.email).strip().lower()
            self.email = cleaned if cleaned else None
        else:
            self.email = None
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def current_membership(self):
        return self.memberships.order_by('-end_date', '-created_at').first()

    @property
    def membership_status(self):
        current = self.current_membership
        if not current:
            return 'NO_MEMBERSHIP'
        today = timezone.localdate()
        if current.end_date < today:
            return 'EXPIRED'
        elif current.end_date <= today + timedelta(days=7):
            return 'EXPIRING_SOON'
        else:
            return 'ACTIVE'

    @property
    def days_remaining(self):
        current = self.current_membership
        if not current:
            return 0
        today = timezone.localdate()
        diff = (current.end_date - today).days
        return max(0, diff) if current.end_date >= today else 0

    @classmethod
    def generate_member_id(cls):
        year = date.today().year
        prefix = f"MF{year}"
        latest = cls.objects.filter(member_id__startswith=prefix).order_by('-member_id').first()
        if latest:
            try:
                seq = int(latest.member_id[len(prefix):]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"


class MemberMembership(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('EXPIRING_SOON', 'Expiring Soon'),
        ('EXPIRED', 'Expired'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PAID', 'Fully Paid'),
        ('PARTIAL', 'Partially Paid'),
        ('PENDING', 'Pending Payment'),
    ]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='memberships')
    plan = models.ForeignKey(MembershipPlan, on_delete=models.PROTECT, related_name='subscriptions')
    start_date = models.DateField()
    end_date = models.DateField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    pending_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    is_renewal = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-end_date', '-created_at']

    def __str__(self):
        return f"{self.member.full_name} - {self.plan.name} ({self.start_date} to {self.end_date})"

    def save(self, *args, **kwargs):
        self.final_amount = max(Decimal('0.00'), self.price - self.discount)
        self.pending_amount = max(Decimal('0.00'), self.final_amount - self.paid_amount)
        if self.paid_amount >= self.final_amount and self.final_amount > 0:
            self.payment_status = 'PAID'
        elif self.paid_amount > 0:
            self.payment_status = 'PARTIAL'
        else:
            self.payment_status = 'PENDING'
        super().save(*args, **kwargs)

    @property
    def status(self):
        today = timezone.localdate()
        if self.end_date < today:
            return 'EXPIRED'
        elif self.end_date <= today + timedelta(days=7):
            return 'EXPIRING_SOON'
        return 'ACTIVE'


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('UPI', 'UPI'),
        ('CASH', 'Cash'),
        ('CARD', 'Debit / Credit Card'),
        ('BANK_TRANSFER', 'Bank Transfer / NEFT'),
    ]

    receipt_number = models.CharField(max_length=50, unique=True, db_index=True)
    member = models.ForeignKey(Member, on_delete=models.PROTECT, related_name='payments')
    membership = models.ForeignKey(MemberMembership, on_delete=models.PROTECT, related_name='payments', null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='UPI')
    transaction_ref = models.CharField(max_length=100, blank=True, help_text="UTR / UPI Ref Number")
    payment_date = models.DateField(default=date.today)
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.receipt_number} - ₹{self.amount} ({self.member.full_name})"

    @classmethod
    def generate_receipt_number(cls):
        year = date.today().year
        prefix = f"MF-REC-{year}-"
        latest = cls.objects.filter(receipt_number__startswith=prefix).order_by('-receipt_number').first()
        if latest:
            try:
                seq = int(latest.receipt_number[len(prefix):]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"


class Attendance(models.Model):
    METHOD_CHOICES = [
        ('QR_SCAN', 'QR Code Scan'),
        ('MEMBER_ID', 'Member ID Lookup'),
        ('MOBILE_NUMBER', 'Mobile Lookup'),
        ('MANUAL', 'Manual Entry'),
    ]

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField(default=date.today, db_index=True)
    check_in_time = models.DateTimeField(default=timezone.now)
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='QR_SCAN')

    class Meta:
        ordering = ['-check_in_time']

    def __str__(self):
        return f"{self.member.full_name} on {self.date} at {self.check_in_time.strftime('%I:%M %p')}"


class WorkoutPlan(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='workout_plans')
    trainer = models.ForeignKey(Trainer, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=150, default='Custom Workout Routine')
    goal = models.CharField(max_length=150, default='General Fitness')
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} for {self.member.full_name}"


class WorkoutExercise(models.Model):
    DAY_CHOICES = [
        ('MON', 'Monday - Chest & Triceps'),
        ('TUE', 'Tuesday - Back & Biceps'),
        ('WED', 'Wednesday - Legs & Core'),
        ('THU', 'Thursday - Shoulders & Traps'),
        ('FRI', 'Friday - Arms & Cardio'),
        ('SAT', 'Saturday - Full Body / Functional'),
        ('DAILY', 'Everyday / General'),
    ]

    workout_plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name='exercises')
    day_of_week = models.CharField(max_length=10, choices=DAY_CHOICES, default='MON')
    exercise_name = models.CharField(max_length=100)
    sets = models.PositiveIntegerField(default=3)
    reps = models.CharField(max_length=30, default='10-12')
    target_weight_kg = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, blank=True)
    duration_min = models.PositiveIntegerField(default=0, blank=True)
    notes = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.exercise_name} ({self.sets} x {self.reps})"


class ExpenseCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Expense Categories'

    def __str__(self):
        return self.name


class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('RENT', 'Gym Rent & Property'),
        ('ELECTRICITY', 'Electricity & Power Bills'),
        ('EQUIPMENT', 'Equipment Purchase & Repairs'),
        ('MAINTENANCE', 'Gym Maintenance & Sanitation'),
        ('SALARY', 'Trainer & Staff Salaries'),
        ('CLEANING', 'Cleaning & Housekeeping Supplies'),
        ('MARKETING', 'Marketing, Flex Banners & Ads'),
        ('SUPPLEMENTS', 'Supplements & Protein Stock'),
        ('OTHER', 'General / Miscellaneous'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CARD', 'Card'),
    ]

    expense_id = models.CharField(max_length=30, unique=True, db_index=True)
    category = models.CharField(max_length=100, default='OTHER')
    description = models.CharField(max_length=255, blank=True, default='')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=date.today)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='UPI')
    notes = models.TextField(blank=True)
    receipt_attachment = models.ImageField(upload_to='expenses/', blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def get_category_display(self):
        choices_dict = dict(self.CATEGORY_CHOICES)
        return choices_dict.get(self.category, self.category)

    def __str__(self):
        return f"{self.expense_id} - ₹{self.amount} ({self.get_category_display()})"

    @classmethod
    def generate_expense_id(cls):
        year = date.today().year
        prefix = f"MF-EXP-{year}-"
        latest = cls.objects.filter(expense_id__startswith=prefix).order_by('-expense_id').first()
        if latest:
            try:
                seq = int(latest.expense_id[len(prefix):]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.CharField(max_length=50, blank=True)
    details = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        username = self.user.username if self.user else "System"
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {username} - {self.action} on {self.entity_type} {self.entity_id}"


class SupplementCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Supplement Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class SupplementProduct(models.Model):
    name = models.CharField(max_length=150)
    brand = models.CharField(max_length=100, default='Optimum Nutrition')
    category = models.ForeignKey(SupplementCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    flavor = models.CharField(max_length=100, blank=True, default='Chocolate')
    weight_or_servings = models.CharField(max_length=100, blank=True, default='1 kg / 30 servings')
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Purchase/Cost price in INR")
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Selling/MRP price in INR")
    stock_quantity = models.PositiveIntegerField(default=0, help_text="Current available stock units")
    min_stock_alert = models.PositiveIntegerField(default=3, help_text="Threshold to trigger low-stock warning")
    expiry_date = models.DateField(null=True, blank=True)
    image = models.ImageField(upload_to='supplements/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.brand}) - ₹{self.selling_price}"

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.min_stock_alert


class SupplementSale(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('UPI', 'UPI'),
        ('CASH', 'Cash'),
        ('CARD', 'Credit / Debit Card'),
        ('NETBANKING', 'Net Banking / Transfer'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    member = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name='supplement_purchases')
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=20, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='UPI')
    sold_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    sale_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sale_date']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name} (₹{self.final_amount})"

    @classmethod
    def generate_invoice_number(cls):
        year = date.today().year
        prefix = f"MF-SUP-{year}-"
        latest = cls.objects.filter(invoice_number__startswith=prefix).order_by('-invoice_number').first()
        if latest:
            try:
                seq = int(latest.invoice_number[len(prefix):]) + 1
            except ValueError:
                seq = 1
        else:
            seq = 1
        return f"{prefix}{seq:04d}"


class SupplementSaleItem(models.Model):
    sale = models.ForeignKey(SupplementSale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(SupplementProduct, on_delete=models.SET_NULL, null=True, related_name='sale_items')
    product_name = models.CharField(max_length=150)
    product_brand = models.CharField(max_length=100, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} x {self.quantity} (₹{self.subtotal})"


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        return not self.is_used and timezone.now() <= self.created_at + timedelta(minutes=15)

    def __str__(self):
        return f"OTP for {self.user.username} ({self.otp})"

