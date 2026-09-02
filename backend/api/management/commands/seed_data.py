import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from api.models import (
    User, GymSettings, Trainer, MembershipPlan, Member,
    MemberMembership, Payment, Attendance, WorkoutPlan,
    WorkoutExercise, Expense, AuditLog
)

class Command(BaseCommand):
    help = 'Populates the database with realistic seed data for Morya Fitness, Sinnar.'

    def handle(self, *args, **options):
        self.stdout.write("Starting database seeding for Morya Fitness...")

        # 1. Gym Settings
        settings, _ = GymSettings.objects.get_or_create(pk=1)
        settings.name = "Morya Fitness"
        settings.tagline = "Premium Gym & Crossfit Center"
        settings.address = "Opposite Shiv Smarak, Pune Highway, Sinnar, Nashik - 422103"
        settings.phone = "+91 98220 12345"
        settings.email = "contact@moryafitness.com"
        settings.website = "https://moryafitness.com"
        settings.upi_id = "moryafitness@okhdfcbank"
        settings.receipt_prefix = "MF-REC-"
        settings.reminder_days = "7,3,0"
        settings.save()
        self.stdout.write(self.style.SUCCESS("[OK] Gym settings configured"))

        # 2. Staff Users
        # Admin / Owner
        admin_user, _ = User.objects.get_or_create(username='admin')
        admin_user.set_password('admin123')
        admin_user.email = 'admin@moryafitness.com'
        admin_user.first_name = 'Harsh'
        admin_user.last_name = 'Patil (Owner)'
        admin_user.role = 'OWNER'
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.phone = '9822012345'
        admin_user.save()

        # Manager / Receptionist
        reception_user, _ = User.objects.get_or_create(username='reception')
        reception_user.set_password('reception123')
        reception_user.email = 'reception@moryafitness.com'
        reception_user.first_name = 'Pooja'
        reception_user.last_name = 'Shinde'
        reception_user.role = 'MANAGER'
        reception_user.is_staff = True
        reception_user.phone = '9823055443'
        reception_user.save()

        # Trainer User 1
        trainer1_user, _ = User.objects.get_or_create(username='trainer')
        trainer1_user.set_password('trainer123')
        trainer1_user.email = 'omkar@moryafitness.com'
        trainer1_user.first_name = 'Omkar'
        trainer1_user.last_name = 'Deshmukh'
        trainer1_user.role = 'TRAINER'
        trainer1_user.phone = '9423011223'
        trainer1_user.save()

        # Trainer User 2
        trainer2_user, _ = User.objects.get_or_create(username='trainer2')
        trainer2_user.set_password('trainer123')
        trainer2_user.email = 'vishal@moryafitness.com'
        trainer2_user.first_name = 'Vishal'
        trainer2_user.last_name = 'Pawar'
        trainer2_user.role = 'TRAINER'
        trainer2_user.phone = '9822199887'
        trainer2_user.save()

        self.stdout.write(self.style.SUCCESS("[OK] Staff users created (admin, reception, trainer, trainer2)"))

        # 3. Trainers Profile
        trainer_omkar, _ = Trainer.objects.get_or_create(
            name='Omkar Deshmukh',
            defaults={
                'user': trainer1_user,
                'phone': '9423011223',
                'email': 'omkar@moryafitness.com',
                'specialization': 'Strength & CrossFit Specialist',
                'salary': Decimal('25000.00'),
                'joining_date': date(2025, 1, 15),
                'status': 'ACTIVE',
                'bio': 'Certified personal trainer with 6+ years experience in bodybuilding and athlete conditioning.'
            }
        )

        trainer_vishal, _ = Trainer.objects.get_or_create(
            name='Vishal Pawar',
            defaults={
                'user': trainer2_user,
                'phone': '9822199887',
                'email': 'vishal@moryafitness.com',
                'specialization': 'Bodybuilding & Hypertrophy',
                'salary': Decimal('22000.00'),
                'joining_date': date(2025, 3, 1),
                'status': 'ACTIVE',
                'bio': 'State level physique competitor specializing in fat loss transformations.'
            }
        )

        trainer_sneha, _ = Trainer.objects.get_or_create(
            name='Sneha Kulkarni',
            defaults={
                'phone': '9765432100',
                'email': 'sneha@moryafitness.com',
                'specialization': 'Weight Loss & Female Fitness',
                'salary': Decimal('20000.00'),
                'joining_date': date(2025, 6, 10),
                'status': 'ACTIVE',
                'bio': 'Functional trainer and nutrition coach focusing on lifestyle transformations.'
            }
        )

        trainers = [trainer_omkar, trainer_vishal, trainer_sneha]
        self.stdout.write(self.style.SUCCESS("[OK] Trainer profiles created"))

        # 4. Membership Plans
        plans_data = [
            {'name': 'Monthly Plan', 'duration_days': 30, 'price': Decimal('1000.00'), 'description': 'Full access to gym equipment and cardio area for 1 month.'},
            {'name': 'Quarterly Plan (3 Months)', 'duration_days': 90, 'price': Decimal('2500.00'), 'description': 'Save ₹500. Access to gym, free weights, and locker facilities.'},
            {'name': 'Half-Yearly Plan (6 Months)', 'duration_days': 180, 'price': Decimal('4500.00'), 'description': 'Most popular! Includes basic diet guide and general trainer assistance.'},
            {'name': 'Annual Plan (12 Months)', 'duration_days': 365, 'price': Decimal('7500.00'), 'description': 'Best value! Complete access + free body composition analysis every month.'},
            {'name': 'Personal Training Add-on', 'duration_days': 30, 'price': Decimal('3500.00'), 'description': 'Dedicated 1-on-1 certified trainer guidance 6 days a week.'},
        ]

        plans = []
        for p in plans_data:
            plan_obj, _ = MembershipPlan.objects.get_or_create(
                name=p['name'],
                defaults={
                    'duration_days': p['duration_days'],
                    'price': p['price'],
                    'description': p['description'],
                    'is_active': True
                }
            )
            plans.append(plan_obj)
        self.stdout.write(self.style.SUCCESS("[OK] Membership plans created"))

        # 5. Members and Subscriptions
        raw_members = [
            # Active members
            ("Rahul", "Patil", "9822014589", "rahul.patil@gmail.com", "MALE", date(1996, 9, 1), "Shivaji Nagar, Sinnar", "Suresh Patil", "9822099999", 0, -60, Decimal('0.00'), Decimal('2500.00')), # Birthday today!
            ("Amit", "Shinde", "9423045612", "amit.shinde@outlook.com", "MALE", date(1994, 4, 15), "Nashik Road, Sinnar", "Sunita Shinde", "9423011111", 1, -30, Decimal('0.00'), Decimal('2500.00')),
            ("Snehal", "Gaikwad", "7020088991", "snehal.g@gmail.com", "FEMALE", date(1998, 11, 20), "Ganesh Nagar, Sinnar", "Ashok Gaikwad", "7020022222", 2, -120, Decimal('500.00'), Decimal('4000.00')),
            ("Sachin", "More", "9890123456", "sachin.more@yahoo.in", "MALE", date(1992, 8, 10), "MIDC Area, Sinnar", "Vikas More", "9890100000", 3, -150, Decimal('0.00'), Decimal('7500.00')),
            ("Priya", "Deshmukh", "8888123456", "priya.d@gmail.com", "FEMALE", date(1997, 2, 28), "Station Road, Sinnar", "Mahesh Deshmukh", "8888100000", 1, -45, Decimal('0.00'), Decimal('2500.00')),
            ("Rohan", "Kadam", "9766543210", "rohan.kadam@rediffmail.com", "MALE", date(1995, 6, 18), "Someshwar Colony, Sinnar", "Dilip Kadam", "9766500000", 0, -10, Decimal('0.00'), Decimal('1000.00')),
            ("Vikas", "Gite", "9552147896", "vikas.gite@gmail.com", "MALE", date(1999, 12, 5), "Bypass Road, Sinnar", "Ramdas Gite", "9552100000", 2, -50, Decimal('500.00'), Decimal('4000.00')),
            ("Akshay", "Wagh", "9145632145", "akshay.wagh@gmail.com", "MALE", date(1993, 3, 22), "Navi Galli, Sinnar", "Kailas Wagh", "9145600000", 3, -200, Decimal('0.00'), Decimal('7500.00')),
            ("Mahesh", "Avhad", "9823456789", "mahesh.avhad@gmail.com", "MALE", date(1991, 7, 14), "Gurewadi, Sinnar", "Pandurang Avhad", "9823400000", 1, -20, Decimal('0.00'), Decimal('2500.00')),
            ("Neha", "Chavan", "9404123789", "neha.chavan@gmail.com", "FEMALE", date(1999, 5, 30), "Vise Mala, Sinnar", "Sanjay Chavan", "9404100000", 0, -15, Decimal('0.00'), Decimal('1000.00')),
            ("Mayur", "Sonawane", "9763124578", "mayur.s@gmail.com", "MALE", date(1997, 10, 12), "Takli Phata, Sinnar", "Santosh Sonawane", "9763100000", 2, -70, Decimal('0.00'), Decimal('4500.00')),
            ("Tanvi", "Joshi", "7709123456", "tanvi.joshi@gmail.com", "FEMALE", date(2000, 1, 25), "Agasti Nagar, Sinnar", "Prasad Joshi", "7709100000", 1, -15, Decimal('0.00'), Decimal('2500.00')),
            ("Kiran", "Tambe", "9881234567", "kiran.tambe@gmail.com", "MALE", date(1994, 9, 2), "Dodi Road, Sinnar", "Nana Tambe", "9881200000", 3, -100, Decimal('0.00'), Decimal('7500.00')), # Birthday tomorrow!
            ("Ajay", "Khairnar", "9970123456", "ajay.k@gmail.com", "MALE", date(1995, 11, 14), "Vijaynagar, Sinnar", "Eknath Khairnar", "9970100000", 0, -5, Decimal('0.00'), Decimal('1000.00')),

            # Expiring Soon (in 2 to 6 days)
            ("Rohit", "Jadhav", "9822998877", "rohit.jadhav@gmail.com", "MALE", date(1995, 3, 12), "Bhadrakali Chowk, Sinnar", "Sambhaji Jadhav", "9822900000", 1, -86, Decimal('0.00'), Decimal('2500.00')), # Expiring in 4 days
            ("Pooja", "Bhagat", "9422887766", "pooja.bhagat@gmail.com", "FEMALE", date(1998, 7, 24), "Panchavati Colony, Sinnar", "Sudhakar Bhagat", "9422800000", 0, -28, Decimal('0.00'), Decimal('1000.00')), # Expiring in 2 days
            ("Tushar", "Sanap", "7057123456", "tushar.sanap@gmail.com", "MALE", date(1993, 12, 19), "Wavi Phata, Sinnar", "Gorakh Sanap", "7057100000", 2, -175, Decimal('500.00'), Decimal('4000.00')), # Expiring in 5 days
            ("Siddharth", "Shirole", "9665123456", "sid.shirole@gmail.com", "MALE", date(1996, 4, 8), "Gulshanabad, Sinnar", "Madhukar Shirole", "9665100000", 1, -87, Decimal('0.00'), Decimal('2500.00')), # Expiring in 3 days

            # Expired members (expired recently or 1-2 months ago)
            ("Ganesh", "Bhalerao", "9860123456", "ganesh.b@gmail.com", "MALE", date(1990, 5, 16), "Panchale, Sinnar", "Kashinath Bhalerao", "9860100000", 0, -45, Decimal('0.00'), Decimal('1000.00')), # Expired 15 days ago
            ("Swapnil", "Gunjal", "9503123456", "swapnil.gunjal@gmail.com", "MALE", date(1997, 8, 22), "Musalgaon, Sinnar", "Bhagwan Gunjal", "9503100000", 1, -120, Decimal('0.00'), Decimal('2500.00')), # Expired 30 days ago
            ("Nikhil", "Jagtap", "9767123456", "nikhil.jagtap@gmail.com", "MALE", date(1994, 1, 9), "Kundewadi, Sinnar", "Baban Jagtap", "9767100000", 0, -50, Decimal('0.00'), Decimal('1000.00')), # Expired 20 days ago
            ("Swati", "Borade", "8975123456", "swati.b@gmail.com", "FEMALE", date(1999, 10, 3), "Baragaon Pimpri, Sinnar", "Dnyaneshwar Borade", "8975100000", 2, -210, Decimal('0.00'), Decimal('4500.00')), # Expired 30 days ago
            ("Vishal", "Hande", "9130123456", "vishal.hande@gmail.com", "MALE", date(1992, 11, 30), "Vinchur Road, Sinnar", "Ananda Hande", "9130100000", 0, -65, Decimal('0.00'), Decimal('1000.00')), # Expired 35 days ago

            # Members with Pending Payments
            ("Shraddha", "Kale", "9689123456", "shraddha.kale@gmail.com", "FEMALE", date(1998, 3, 14), "Samata Nagar, Sinnar", "Deepak Kale", "9689100000", 2, -10, Decimal('500.00'), Decimal('2500.00')), # Final 4000, Paid 2500, Pending 1500
            ("Chetan", "Pagare", "9822776655", "chetan.pagare@gmail.com", "MALE", date(1996, 6, 28), "Nehru Chowk, Sinnar", "Bhimrao Pagare", "9822700000", 1, -15, Decimal('0.00'), Decimal('1500.00')), # Final 2500, Paid 1500, Pending 1000
        ]

        today = timezone.localdate()
        created_members = []
        payment_methods = ['UPI', 'CASH', 'CARD', 'BANK_TRANSFER']

        # Clear old members if re-running seed
        Member.objects.all().delete()
        Payment.objects.all().delete()
        Attendance.objects.all().delete()
        Expense.objects.all().delete()
        AuditLog.objects.all().delete()

        seq = 1
        for m_data in raw_members:
            (first_name, last_name, phone, email, gender, dob, address,
             em_name, em_phone, plan_idx, start_offset_days, discount, paid_amount) = m_data

            member_id = f"MF2026{seq:04d}"
            seq += 1

            trainer_assigned = trainers[(seq % len(trainers))]

            joining_dt = today + timedelta(days=start_offset_days)
            member = Member.objects.create(
                member_id=member_id,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                email=email,
                gender=gender,
                dob=dob,
                address=address,
                emergency_contact_name=em_name,
                emergency_contact_phone=em_phone,
                source='WALK_IN' if seq % 2 == 0 else 'FRIEND',
                joining_date=joining_dt,
                assigned_trainer=trainer_assigned,
                notes=f"Enrolled by {reception_user.first_name}. Regular fitness member.",
                is_active=True
            )
            created_members.append(member)

            # Assign membership subscription
            plan = plans[plan_idx]
            sub_start = joining_dt
            sub_end = sub_start + timedelta(days=plan.duration_days)
            final_amt = max(Decimal('0.00'), plan.price - discount)
            actual_paid = min(final_amt, paid_amount)
            pending_amt = max(Decimal('0.00'), final_amt - actual_paid)

            membership = MemberMembership.objects.create(
                member=member,
                plan=plan,
                start_date=sub_start,
                end_date=sub_end,
                price=plan.price,
                discount=discount,
                final_amount=final_amt,
                paid_amount=actual_paid,
                pending_amount=pending_amt,
                is_renewal=False,
                notes="Initial Registration",
            )

            # Record Payment
            if actual_paid > 0:
                rec_no = f"MF-REC-2026-{seq:04d}"
                method = payment_methods[seq % len(payment_methods)]
                utr = f"UPI/{random.randint(100000000000, 999999999999)}" if method == 'UPI' else ""
                
                Payment.objects.create(
                    receipt_number=rec_no,
                    member=member,
                    membership=membership,
                    amount=actual_paid,
                    payment_method=method,
                    transaction_ref=utr,
                    payment_date=sub_start,
                    notes=f"Membership payment for {plan.name}",
                    received_by=reception_user if seq % 2 == 0 else admin_user,
                )

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(created_members)} Members and Subscriptions seeded"))

        # 6. Generate Attendance Logs (Past 14 days)
        attendance_count = 0
        for day_offset in range(13, -1, -1):
            att_date = today - timedelta(days=day_offset)
            
            # Active members on this day
            attending_members = [
                m for m in created_members
                if m.membership_status in ['ACTIVE', 'EXPIRING_SOON']
            ]
            
            # Daily attendees count between 12 and 22 members
            daily_sample = random.sample(attending_members, min(len(attending_members), random.randint(12, 19)))
            for m in daily_sample:
                # Morning (6:00 AM - 9:30 AM) or Evening (5:00 PM - 9:30 PM)
                is_morning = random.choice([True, False, True])
                if is_morning:
                    h = random.randint(6, 9)
                    mins = random.randint(0, 59)
                else:
                    h = random.randint(17, 21)
                    mins = random.randint(0, 59)

                check_in_dt = timezone.make_aware(
                    datetime(att_date.year, att_date.month, att_date.day, h, mins, 0)
                )

                Attendance.objects.create(
                    member=m,
                    date=att_date,
                    check_in_time=check_in_dt,
                    check_in_method=random.choice(['QR_SCAN', 'QR_SCAN', 'MEMBER_ID', 'MOBILE_NUMBER'])
                )
                attendance_count += 1

        self.stdout.write(self.style.SUCCESS(f"[OK] {attendance_count} Attendance records generated for last 14 days"))

        # 7. Gym Expenses
        expenses_data = [
            ('RENT', 'Gym Hall Monthly Rent - August 2026', Decimal('35000.00'), date(2026, 8, 5), 'BANK_TRANSFER'),
            ('ELECTRICITY', 'MSEDCL Gym Electricity Bill - August', Decimal('6450.00'), date(2026, 8, 10), 'UPI'),
            ('SALARY', 'Omkar Deshmukh Trainer Salary - July', Decimal('25000.00'), date(2026, 8, 7), 'BANK_TRANSFER'),
            ('SALARY', 'Vishal Pawar Trainer Salary - July', Decimal('22000.00'), date(2026, 8, 7), 'BANK_TRANSFER'),
            ('MAINTENANCE', 'Treadmill Belt Servicing & Motor Greasing', Decimal('3200.00'), date(2026, 8, 14), 'CASH'),
            ('CLEANING', 'Phenyl, Sanitizer, Microfiber Towels & Handwash', Decimal('1850.00'), date(2026, 8, 18), 'UPI'),
            ('MARKETING', 'Flex Hoardings at Shiv Smarak Chowk, Sinnar', Decimal('4500.00'), date(2026, 8, 20), 'UPI'),
            ('EQUIPMENT', 'New 20kg Hex Dumbbells Pair & Resistance Bands', Decimal('7800.00'), date(2026, 8, 25), 'UPI'),
            ('SUPPLEMENTS', 'Whey Protein Stock & Pre-workout Powder', Decimal('12500.00'), date(2026, 8, 28), 'BANK_TRANSFER'),
            ('ELECTRICITY', 'MSEDCL Gym Electricity Bill - September', Decimal('6800.00'), date(2026, 9, 1), 'UPI'),
            ('RENT', 'Gym Hall Monthly Rent - September 2026', Decimal('35000.00'), date(2026, 9, 1), 'BANK_TRANSFER'),
            ('CLEANING', 'Housekeeping Supplies - September', Decimal('1500.00'), date(2026, 9, 1), 'CASH'),
        ]

        exp_seq = 1
        for cat, desc, amt, dt, method in expenses_data:
            Expense.objects.create(
                expense_id=f"MF-EXP-2026-{exp_seq:04d}",
                category=cat,
                description=desc,
                amount=amt,
                date=dt,
                payment_method=method,
                recorded_by=admin_user,
                notes="Verified by Harsh Patil."
            )
            exp_seq += 1

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(expenses_data)} Gym Expenses seeded"))

        # 8. Workout Plans & Exercises
        if created_members:
            sample_member = created_members[0] # Rahul Patil
            wp = WorkoutPlan.objects.create(
                member=sample_member,
                trainer=trainer_omkar,
                title="Hypertrophy & Strength 6-Day Split",
                goal="Muscle Gain & Core Definition",
                notes="Maintain proper form on compound lifts. Drink 4L water daily."
            )

            exercises = [
                ('MON', 'Flat Barbell Bench Press', 4, '8-10', Decimal('60.00'), 15, 'Warm up shoulder rotator cuff first'),
                ('MON', 'Incline Dumbbell Press', 3, '10-12', Decimal('22.50'), 12, 'Control eccentric descent'),
                ('MON', 'Cable Chest Flyes', 3, '15', Decimal('15.00'), 10, 'Peak contraction hold for 1 sec'),
                ('MON', 'Tricep Rope Pushdown', 4, '12-15', Decimal('25.00'), 10, 'Keep elbows pinned to torso'),
                ('TUE', 'Lat Pulldown (Wide Grip)', 4, '10-12', Decimal('55.00'), 15, 'Squeeze lats at bottom'),
                ('TUE', 'Seated Cable Row', 3, '10-12', Decimal('50.00'), 12, 'Keep back straight'),
                ('TUE', 'Barbell Bicep Curls', 4, '10', Decimal('25.00'), 10, 'No swinging torso'),
                ('WED', 'Barbell Back Squats', 4, '8-10', Decimal('70.00'), 20, 'Hit parallel depth safely'),
                ('WED', 'Leg Press (45 Degree)', 4, '12', Decimal('120.00'), 15, 'Feet shoulder width'),
                ('WED', 'Standing Calf Raises', 4, '15-20', Decimal('40.00'), 10, 'Full stretch at bottom'),
            ]

            for day, name, sets, reps, wt, dur, notes in exercises:
                WorkoutExercise.objects.create(
                    workout_plan=wp,
                    day_of_week=day,
                    exercise_name=name,
                    sets=sets,
                    reps=reps,
                    target_weight_kg=wt,
                    duration_min=dur,
                    notes=notes
                )

        self.stdout.write(self.style.SUCCESS("[OK] Sample workout plans & exercises seeded"))

        # 9. Audit Logs
        AuditLog.objects.create(
            user=admin_user,
            action='SYSTEM_INITIALIZED',
            entity_type='SYSTEM',
            entity_id='1',
            details='Morya Fitness Gym Management System initialized with default seed database.'
        )
        AuditLog.objects.create(
            user=reception_user,
            action='MEMBER_ONBOARDED',
            entity_type='MEMBER',
            entity_id='MF20260001',
            details='Rahul Patil registered with Quarterly Plan (₹2,500).'
        )

        self.stdout.write(self.style.SUCCESS("[OK] Seeding complete! Database is fully populated with realistic demo data."))

