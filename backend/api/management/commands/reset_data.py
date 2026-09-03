from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import (
    GymSettings,
    MembershipPlan,
    Trainer,
    Member,
    MemberMembership,
    Payment,
    Attendance,
    WorkoutPlan,
    WorkoutExercise,
    Expense,
    AuditLog,
    UserRole,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Resets all gym operational data (members, payments, attendance, expenses, logs) while preserving Admin login and plans."

    def handle(self, *args, **options):
        self.stdout.write("Clearing all transactional and member data...")

        # 1. Clear operational & member data
        Payment.objects.all().delete()
        Attendance.objects.all().delete()
        WorkoutExercise.objects.all().delete()
        WorkoutPlan.objects.all().delete()
        MemberMembership.objects.all().delete()
        Member.objects.all().delete()
        Expense.objects.all().delete()
        Trainer.objects.all().delete()
        AuditLog.objects.all().delete()

        # 2. Clear non-admin users
        User.objects.exclude(username="admin").delete()

        # 3. Ensure Admin account is intact and ready
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "gokul.gugale@moryafitness.com",
                "first_name": "Gokul",
                "last_name": "Gugale",
                "role": UserRole.OWNER,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin_user.set_password("admin123")
        admin_user.role = UserRole.OWNER
        admin_user.first_name = "Gokul"
        admin_user.last_name = "Gugale"
        admin_user.email = "gokul.gugale@moryafitness.com"
        admin_user.save()

        # 4. Ensure Gym Settings are ready
        gym_settings = GymSettings.get_settings()
        gym_settings.name = "Morya Fitness"
        gym_settings.tagline = "Premium Gym & Fitness Center"
        gym_settings.address = "Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103"
        gym_settings.phone = "+91 98220 12345"
        gym_settings.email = "contact@moryafitness.com"
        gym_settings.upi_id = "moryafitness@okhdfcbank"
        gym_settings.receipt_prefix = "MF-REC-"
        gym_settings.save()

        # 5. Ensure Default Supplement Categories are created
        from api.models import SupplementCategory, SupplementProduct
        categories = [
            ("Whey Protein", "Whey isolate, concentrate, and blend protein powders"),
            ("Creatine", "Micronized & monohydrate creatine formulas"),
            ("Pre-Workout", "Energy boosters, pump formulas, and endurance powders"),
            ("BCAA & EAA", "Branch-chain and essential amino acids for recovery"),
            ("Mass Gainer", "High-calorie muscle mass and bulking formulas"),
            ("Vitamins & Health", "Daily multivitamins, fish oil omega-3, and joint support"),
            ("Peanut Butter & Snacks", "High-protein peanut butter, bars, and oats"),
            ("Shakers & Gear", "Gym shakers, lifting straps, and accessories"),
        ]
        for cat_name, desc in categories:
            SupplementCategory.objects.get_or_create(name=cat_name, defaults={'description': desc})

        self.stdout.write(
            self.style.SUCCESS(
                "Successfully reset all data!\n"
                "- Members, subscriptions, payments, attendance, expenses, and logs have been wiped clean.\n"
                "- Admin credentials preserved: username='admin', password='admin123'\n"
                "- Gym Settings & Membership Plans are ready for new registrations."
            )
        )
