import json
from urllib.parse import quote
from django.utils import timezone
from .models import AuditLog, GymSettings

def log_audit(user, action, entity_type, entity_id="", details=""):
    """
    Utility function to record audit trail entries.
    """
    try:
        AuditLog.objects.create(
            user=user if user and user.is_authenticated else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            details=str(details)
        )
    except Exception as e:
        print(f"Error logging audit: {e}")


def generate_whatsapp_link(phone: str, message: str) -> str:
    """
    Generates a WhatsApp direct messaging URL with prefilled text.
    Cleans phone numbers for standard 10-digit Indian mobile format (+91).
    """
    clean_phone = "".join(filter(str.isdigit, str(phone)))
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    elif len(clean_phone) == 12 and clean_phone.startswith("91"):
        pass
    encoded_text = quote(message)
    return f"https://wa.me/{clean_phone}?text={encoded_text}"


def get_whatsapp_templates(member, gym_settings=None):
    """
    Returns a dictionary of ready-to-use message templates for a given member.
    """
    if not gym_settings:
        gym_settings = GymSettings.get_settings()

    gym_name = gym_settings.name
    gym_phone = gym_settings.phone
    gym_address = gym_settings.address
    curr_sub = member.current_membership

    plan_name = curr_sub.plan.name if curr_sub and curr_sub.plan else "Membership Plan"
    expiry_date_str = curr_sub.end_date.strftime("%d %b %Y") if curr_sub else "N/A"
    pending_amt = float(curr_sub.pending_amount) if curr_sub else 0.0

    templates = {
        "welcome": (
            f"💪 *Welcome to {gym_name}, Sinnar!*\n\n"
            f"Dear {member.first_name},\n"
            f"Thank you for joining our fitness family! 🏋️‍♂️\n\n"
            f"📋 *Your Member ID:* {member.member_id}\n"
            f"🎯 *Plan:* {plan_name}\n"
            f"📅 *Valid Until:* {expiry_date_str}\n\n"
            f"📍 *Location:* {gym_address}\n"
            f"📞 *Helpline:* {gym_phone}\n\n"
            f"Let's crush your fitness goals together! 🔥"
        ),
        "expiry_7days": (
            f"⏳ *Membership Expiry Reminder - {gym_name}*\n\n"
            f"Hello {member.first_name},\n"
            f"This is a friendly reminder that your gym membership ({plan_name}) will expire in *7 days* on *{expiry_date_str}*.\n\n"
            f"Please renew your membership at the reception to continue your daily workouts seamlessly.\n\n"
            f"📞 Contact: {gym_phone}\n"
            f"Stay fit, stay strong! 💪"
        ),
        "expiry_3days": (
            f"⚠️ *Urgent: Membership Expiring Soon - {gym_name}*\n\n"
            f"Hello {member.first_name},\n"
            f"Your {gym_name} membership is expiring in *3 days* ({expiry_date_str}).\n\n"
            f"Renew today and ask about our special renewal offers!\n\n"
            f"📞 Call/WhatsApp: {gym_phone}"
        ),
        "expired": (
            f"🚨 *Membership Expired - {gym_name}*\n\n"
            f"Dear {member.first_name},\n"
            f"Your {gym_name} membership expired on *{expiry_date_str}*.\n\n"
            f"Please renew your membership at the gym desk to regain workout and attendance access.\n\n"
            f"📍 {gym_address}\n"
            f"📞 {gym_phone}"
        ),
        "pending_payment": (
            f"💳 *Payment Due Reminder - {gym_name}*\n\n"
            f"Dear {member.first_name},\n"
            f"You have a pending balance of *₹{pending_amt:,.2f}* towards your {plan_name}.\n\n"
            f"Kindly clear the dues at the reception or via UPI: *{gym_settings.upi_id}*.\n\n"
            f"📞 For queries, call {gym_phone}.\n"
            f"Thank you!"
        ),
        "birthday": (
            f"🎂 *Happy Birthday from {gym_name}!* 🎉\n\n"
            f"Dear {member.first_name},\n"
            f"Wishing you a fantastic year filled with health, strength, and happiness! 💪\n\n"
            f"As a birthday gift, visit the gym this week to claim our special birthday discount on your next renewal! 🎁\n\n"
            f"- Team {gym_name}, Sinnar"
        ),
    }

    return {
        key: {
            "text": text,
            "link": generate_whatsapp_link(member.phone, text)
        }
        for key, text in templates.items()
    }
