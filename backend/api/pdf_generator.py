import io
import os
from django.conf import settings as django_settings
from api.models import GymSettings
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


def get_gym_logo_path() -> str | None:
    candidates = [
        os.path.join(django_settings.BASE_DIR, 'static', 'logo.png'),
        os.path.join(django_settings.BASE_DIR, '..', 'frontend', 'public', 'logo.png'),
        os.path.join(django_settings.BASE_DIR, '..', 'frontend', 'dist', 'logo.png'),
        '/app/static/logo.png',
        '/app/frontend/public/logo.png',
        '/app/frontend/dist/logo.png',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def generate_payment_receipt_pdf(payment) -> bytes:
    """
    Generates a pixel-perfect, single-page official fee receipt PDF
    matching the on-screen React receipt modal exactly.
    """
    settings = GymSettings.get_settings()
    member = payment.member
    membership = payment.membership

    gym_name = settings.name or 'Morya Fitness'
    gym_tagline = settings.tagline or 'Premium Gym & Fitness Center'
    gym_address = settings.address or 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103'

    plan_name = membership.plan.name if membership and membership.plan else 'Gym Membership Fee'
    duration_days = membership.plan.duration_days if membership and membership.plan else 30
    plan_price = float(membership.price) if membership else float(payment.amount)
    discount = float(membership.discount) if membership else 0.0
    final_amount = float(membership.final_amount) if membership else float(payment.amount)
    paid_amount = float(payment.amount)
    remaining_dues = float(membership.pending_amount) if membership else 0.0

    raw_pm = (payment.payment_method or 'UPI').upper()
    payment_mode = 'Cash' if 'CASH' in raw_pm else 'UPI'
    cashier = payment.received_by.get_full_name() if payment.received_by else 'Gokul Gugale'
    payment_date_str = payment.payment_date.strftime('%d %b %Y') if hasattr(payment, 'payment_date') and payment.payment_date else '04 Sep 2026'

    logo_path = get_gym_logo_path()
    buf = io.BytesIO()

    # A4 dimensions: 595.27 x 841.89 points
    page_margin = 22 # points
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=page_margin,
        rightMargin=page_margin,
        topMargin=page_margin,
        bottomMargin=page_margin,
    )

    avail_w = A4[0] - 2 * page_margin # ~551.27 pt
    card_padding = 16 # pt
    inner_w = avail_w - 2 * card_padding # ~519.27 pt

    styles = getSampleStyleSheet()

    # Typography & Styles
    gym_title_style = ParagraphStyle(
        'GymTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=21,
        textColor=colors.HexColor('#0F172A'),
        textTransform='uppercase',
    )
    gym_tagline_style = ParagraphStyle(
        'GymTagline',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#EA580C'),
    )
    gym_addr_style = ParagraphStyle(
        'GymAddress',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#64748B'),
    )

    badge_label_style = ParagraphStyle(
        'BadgeLabel',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#C2410C'),
        textTransform='uppercase',
    )
    badge_no_style = ParagraphStyle(
        'BadgeNo',
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#0F172A'),
    )
    badge_date_style = ParagraphStyle(
        'BadgeDate',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#64748B'),
    )

    meta_title_left = ParagraphStyle('MetaTitleLeft', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#94A3B8'), textTransform='uppercase')
    meta_name_left = ParagraphStyle('MetaNameLeft', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=colors.HexColor('#0F172A'))
    meta_id_left = ParagraphStyle('MetaIdLeft', fontName='Helvetica-Bold', fontSize=9.5, leading=13, textColor=colors.HexColor('#EA580C'))
    meta_phone_left = ParagraphStyle('MetaPhoneLeft', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#64748B'))

    meta_title_right = ParagraphStyle('MetaTitleRight', fontName='Helvetica-Bold', fontSize=8, leading=10, alignment=TA_RIGHT, textColor=colors.HexColor('#94A3B8'), textTransform='uppercase')
    meta_mode_right = ParagraphStyle('MetaModeRight', fontName='Helvetica-Bold', fontSize=13, leading=16, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))
    meta_ref_right = ParagraphStyle('MetaRefRight', fontName='Helvetica', fontSize=8, leading=10, alignment=TA_RIGHT, textColor=colors.HexColor('#64748B'))
    meta_cashier_right = ParagraphStyle('MetaCashierRight', fontName='Helvetica', fontSize=8.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#64748B'))

    th_left = ParagraphStyle('THLeft', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#475569'))
    th_center = ParagraphStyle('THCenter', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))
    th_right = ParagraphStyle('THRight', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#475569'))

    td_item_name = ParagraphStyle('TDItemName', fontName='Helvetica-Bold', fontSize=10.5, leading=13, textColor=colors.HexColor('#0F172A'))
    td_item_desc = ParagraphStyle('TDItemDesc', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#64748B'))
    td_val = ParagraphStyle('TDVal', fontName='Helvetica-Bold', fontSize=9.5, leading=12, alignment=TA_CENTER, textColor=colors.HexColor('#334155'))
    td_amt = ParagraphStyle('TDAmt', fontName='Helvetica-Bold', fontSize=10.5, leading=13, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))

    calc_label = ParagraphStyle('CalcLabel', fontName='Helvetica', fontSize=9, leading=11, textColor=colors.HexColor('#475569'))
    calc_val = ParagraphStyle('CalcVal', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#1E293B'))

    calc_discount_label = ParagraphStyle('CalcDiscountLabel', fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=colors.HexColor('#059669'))
    calc_discount_val = ParagraphStyle('CalcDiscountVal', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#059669'))

    calc_net_label = ParagraphStyle('CalcNetLabel', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=colors.HexColor('#0F172A'))
    calc_net_val = ParagraphStyle('CalcNetVal', fontName='Helvetica-Bold', fontSize=10, leading=12, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))

    calc_paid_label = ParagraphStyle('CalcPaidLabel', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=colors.HexColor('#059669'))
    calc_paid_val = ParagraphStyle('CalcPaidVal', fontName='Helvetica-Bold', fontSize=10.5, leading=12, alignment=TA_RIGHT, textColor=colors.HexColor('#059669'))

    calc_status_label = ParagraphStyle('CalcStatusLabel', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#059669'))
    calc_status_val = ParagraphStyle('CalcStatusVal', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#059669'))

    calc_due_label = ParagraphStyle('CalcDueLabel', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#DC2626'))
    calc_due_val = ParagraphStyle('CalcDueVal', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#DC2626'))

    terms_title = ParagraphStyle('TermsTitle', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#334155'))
    terms_body = ParagraphStyle('TermsBody', fontName='Helvetica', fontSize=7.5, leading=10.5, textColor=colors.HexColor('#64748B'))

    sig_title = ParagraphStyle('SigTitle', fontName='Helvetica-Bold', fontSize=9.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))
    sig_sub = ParagraphStyle('SigSub', fontName='Helvetica', fontSize=7.5, leading=9.5, alignment=TA_RIGHT, textColor=colors.HexColor('#64748B'))
    seal_tag = ParagraphStyle('SealTag', fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#1E3A8A'))

    inner_elements = []

    # 1. Header (Logo + Gym Info on Left, Official Receipt Badge on Right)
    logo_img = Image(logo_path, width=46, height=46) if logo_path and os.path.exists(logo_path) else Paragraph('', styles['Normal'])
    brand_info = [
        Paragraph(gym_name.upper(), gym_title_style),
        Spacer(1, 1),
        Paragraph(gym_tagline, gym_tagline_style),
        Spacer(1, 2),
        Paragraph(gym_address, gym_addr_style),
    ]

    badge_data = [
        [Paragraph("OFFICIAL FEE RECEIPT", badge_label_style)],
        [Paragraph(payment.receipt_number, badge_no_style)],
        [Paragraph(f"Date: {payment_date_str}", badge_date_style)],
    ]
    badge_table = Table(badge_data, colWidths=[140])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFF7ED')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FED7AA')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))

    header_table = Table([[logo_img, brand_info, badge_table]], colWidths=[50, inner_w - 50 - 145, 145])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor('#E2E8F0')),
    ]))
    inner_elements.append(header_table)
    inner_elements.append(Spacer(1, 10))

    # 2. Member & Payment Information Box
    member_col = [
        Paragraph("MEMBER DETAILS", meta_title_left),
        Spacer(1, 2),
        Paragraph(member.full_name, meta_name_left),
        Spacer(1, 1),
        Paragraph(f"ID: {member.member_id}", meta_id_left),
        Spacer(1, 1),
        Paragraph(f"Phone: +91 {member.phone}", meta_phone_left),
    ]
    payment_col = [
        Paragraph("PAYMENT MODE", meta_title_right),
        Spacer(1, 2),
        Paragraph(payment_mode, meta_mode_right),
    ]
    if getattr(payment, 'transaction_ref', None):
        payment_col.append(Spacer(1, 1))
        payment_col.append(Paragraph(f"Ref: {payment.transaction_ref}", meta_ref_right))
    payment_col.append(Spacer(1, 2))
    payment_col.append(Paragraph(f"Cashier: {cashier}", meta_cashier_right))

    info_table = Table([[member_col, payment_col]], colWidths=[inner_w * 0.55, inner_w * 0.45])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    inner_elements.append(info_table)
    inner_elements.append(Spacer(1, 10))

    # 3. Itemized Fee Table
    items_data = [
        [
            Paragraph("MEMBERSHIP ITEM", th_left),
            Paragraph("VALIDITY", th_center),
            Paragraph("AMOUNT (Rs.)", th_right)
        ],
        [
            [Paragraph(plan_name, td_item_name), Spacer(1, 1), Paragraph("General gym &amp; equipment access", td_item_desc)],
            Paragraph(f"{duration_days} Days", td_val),
            Paragraph(f"Rs. {plan_price:,.0f}", td_amt)
        ]
    ]
    items_table = Table(items_data, colWidths=[inner_w * 0.55, inner_w * 0.20, inner_w * 0.25])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    inner_elements.append(items_table)
    inner_elements.append(Spacer(1, 8))

    # 4. Financial Calculation Summary (Aligned to Right)
    calc_w = 240
    calc_rows = [
        [Paragraph("Plan Base Amount:", calc_label), Paragraph(f"Rs. {plan_price:,.0f}", calc_val)],
    ]
    if discount > 0:
        calc_rows.append([Paragraph("Discount Applied:", calc_discount_label), Paragraph(f"-Rs. {discount:,.0f}", calc_discount_val)])
    calc_rows.append([Paragraph("Net Payable:", calc_net_label), Paragraph(f"Rs. {final_amount:,.0f}", calc_net_val)])
    calc_rows.append([Paragraph("Amount Paid:", calc_paid_label), Paragraph(f"Rs. {paid_amount:,.0f}", calc_paid_val)])

    if remaining_dues > 0:
        calc_rows.append([Paragraph("Balance Dues:", calc_due_label), Paragraph(f"Rs. {remaining_dues:,.0f}", calc_due_val)])
    else:
        calc_rows.append([Paragraph("Payment Status:", calc_status_label), Paragraph("✓ Settled in Full", calc_status_val)])

    calc_inner_table = Table(calc_rows, colWidths=[120, 120])
    paid_row_idx = len(calc_rows) - 2
    status_row_idx = len(calc_rows) - 1

    calc_style_commands = [
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('LINEABOVE', (0, paid_row_idx - 1), (-1, paid_row_idx - 1), 1, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0, paid_row_idx), (-1, paid_row_idx), colors.HexColor('#ECFDF5')),
        ('BOX', (0, paid_row_idx), (-1, paid_row_idx), 1, colors.HexColor('#A7F3D0')),
        ('TOPPADDING', (0, paid_row_idx), (-1, paid_row_idx), 5),
        ('BOTTOMPADDING', (0, paid_row_idx), (-1, paid_row_idx), 5),
    ]

    if remaining_dues > 0:
        calc_style_commands.extend([
            ('BACKGROUND', (0, status_row_idx), (-1, status_row_idx), colors.HexColor('#FEF2F2')),
            ('BOX', (0, status_row_idx), (-1, status_row_idx), 1, colors.HexColor('#FECACA')),
            ('TOPPADDING', (0, status_row_idx), (-1, status_row_idx), 4),
            ('BOTTOMPADDING', (0, status_row_idx), (-1, status_row_idx), 4),
        ])
    else:
        calc_style_commands.extend([
            ('BACKGROUND', (0, status_row_idx), (-1, status_row_idx), colors.HexColor('#ECFDF5')),
            ('BOX', (0, status_row_idx), (-1, status_row_idx), 1, colors.HexColor('#A7F3D0')),
            ('TOPPADDING', (0, status_row_idx), (-1, status_row_idx), 4),
            ('BOTTOMPADDING', (0, status_row_idx), (-1, status_row_idx), 4),
        ])

    calc_inner_table.setStyle(TableStyle(calc_style_commands))

    calc_outer = Table([[Paragraph("", styles['Normal']), calc_inner_table]], colWidths=[inner_w - calc_w, calc_w])
    calc_outer.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    inner_elements.append(calc_outer)
    inner_elements.append(Spacer(1, 10))

    # 5. Footer: Terms & Official Seal Stamp
    terms_col = [
        Paragraph("Terms &amp; Conditions:", terms_title),
        Spacer(1, 2),
        Paragraph("1. Fees once paid are non-refundable and non-transferable.", terms_body),
        Paragraph("2. Please maintain gym discipline and equipment hygiene.", terms_body),
        Paragraph("3. Official receipt issued by Morya Fitness, Sinnar.", terms_body),
    ]

    seal_img = Image(logo_path, width=42, height=42) if logo_path and os.path.exists(logo_path) else Paragraph('', styles['Normal'])
    seal_data = [
        [seal_img],
        [Paragraph("OFFICIAL SEAL &bull; SINNAR", seal_tag)],
        [Spacer(1, 3)],
        [Paragraph("Authorized Signature &amp; Seal", sig_title)],
        [Paragraph("Morya Fitness, Sinnar", sig_sub)],
    ]
    seal_table = Table(seal_data, colWidths=[140])
    seal_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('LINEBELOW', (0,2), (0,2), 1, colors.HexColor('#CBD5E1')),
    ]))

    footer_table = Table([[terms_col, seal_table]], colWidths=[inner_w * 0.65, inner_w * 0.35])
    footer_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
    ]))
    inner_elements.append(footer_table)

    # Wrap in outer card
    card_table = Table([[inner_elements]], colWidths=[avail_w])
    card_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('TOPPADDING', (0,0), (-1,-1), card_padding),
        ('BOTTOMPADDING', (0,0), (-1,-1), card_padding),
        ('LEFTPADDING', (0,0), (-1,-1), card_padding),
        ('RIGHTPADDING', (0,0), (-1,-1), card_padding),
    ]))

    doc.build([card_table])
    return buf.getvalue()


def generate_supplement_invoice_pdf(sale) -> bytes:
    """
    Generates a pixel-perfect, single-page official supplement retail invoice PDF.
    """
    settings = GymSettings.get_settings()
    gym_name = settings.name or 'Morya Fitness'
    gym_tagline = settings.tagline or 'Nutrition & Fitness Supplement Store'
    gym_address = settings.address or 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103'

    raw_pm = (sale.payment_method or 'UPI').upper()
    payment_mode = 'Cash' if 'CASH' in raw_pm else 'UPI'
    cashier = sale.sold_by.get_full_name() if sale.sold_by else 'Gokul Gugale'
    sale_date_str = sale.sale_date.strftime('%d %b %Y') if hasattr(sale, 'sale_date') and sale.sale_date else '04 Sep 2026'

    subtotal = float(sale.subtotal)
    discount = float(sale.discount)
    final_amount = float(sale.final_amount)

    logo_path = get_gym_logo_path()
    buf = io.BytesIO()

    page_margin = 22
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=page_margin,
        rightMargin=page_margin,
        topMargin=page_margin,
        bottomMargin=page_margin,
    )

    avail_w = A4[0] - 2 * page_margin
    card_padding = 16
    inner_w = avail_w - 2 * card_padding

    styles = getSampleStyleSheet()

    gym_title_style = ParagraphStyle('GymTitle', fontName='Helvetica-Bold', fontSize=18, leading=21, textColor=colors.HexColor('#0F172A'), textTransform='uppercase')
    gym_tagline_style = ParagraphStyle('GymTagline', fontName='Helvetica-Bold', fontSize=9.5, leading=13, textColor=colors.HexColor('#EA580C'))
    gym_addr_style = ParagraphStyle('GymAddress', fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#64748B'))

    badge_label_style = ParagraphStyle('BadgeLabel', fontName='Helvetica-Bold', fontSize=8, leading=10, alignment=TA_RIGHT, textColor=colors.HexColor('#C2410C'), textTransform='uppercase')
    badge_no_style = ParagraphStyle('BadgeNo', fontName='Helvetica-Bold', fontSize=12, leading=15, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))
    badge_date_style = ParagraphStyle('BadgeDate', fontName='Helvetica', fontSize=8.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#64748B'))

    meta_title_left = ParagraphStyle('MetaTitleLeft', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#94A3B8'), textTransform='uppercase')
    meta_name_left = ParagraphStyle('MetaNameLeft', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=colors.HexColor('#0F172A'))
    meta_id_left = ParagraphStyle('MetaIdLeft', fontName='Helvetica-Bold', fontSize=9.5, leading=13, textColor=colors.HexColor('#EA580C'))
    meta_phone_left = ParagraphStyle('MetaPhoneLeft', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#64748B'))

    meta_title_right = ParagraphStyle('MetaTitleRight', fontName='Helvetica-Bold', fontSize=8, leading=10, alignment=TA_RIGHT, textColor=colors.HexColor('#94A3B8'), textTransform='uppercase')
    meta_mode_right = ParagraphStyle('MetaModeRight', fontName='Helvetica-Bold', fontSize=13, leading=16, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))
    meta_cashier_right = ParagraphStyle('MetaCashierRight', fontName='Helvetica', fontSize=8.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#64748B'))

    th_left = ParagraphStyle('THLeft', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#475569'))
    th_center = ParagraphStyle('THCenter', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))
    th_right = ParagraphStyle('THRight', fontName='Helvetica-Bold', fontSize=8.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#475569'))

    td_item_name = ParagraphStyle('TDItemName', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=colors.HexColor('#0F172A'))
    td_item_desc = ParagraphStyle('TDItemDesc', fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#64748B'))
    td_qty = ParagraphStyle('TDQty', fontName='Helvetica-Bold', fontSize=9.5, leading=12, alignment=TA_CENTER, textColor=colors.HexColor('#334155'))
    td_price = ParagraphStyle('TDPrice', fontName='Helvetica', fontSize=9.5, leading=12, alignment=TA_RIGHT, textColor=colors.HexColor('#334155'))
    td_subtotal = ParagraphStyle('TDSubtotal', fontName='Helvetica-Bold', fontSize=10, leading=12, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))

    calc_label = ParagraphStyle('CalcLabel', fontName='Helvetica', fontSize=9, leading=11, textColor=colors.HexColor('#475569'))
    calc_val = ParagraphStyle('CalcVal', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#1E293B'))

    calc_discount_label = ParagraphStyle('CalcDiscountLabel', fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=colors.HexColor('#059669'))
    calc_discount_val = ParagraphStyle('CalcDiscountVal', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#059669'))

    calc_paid_label = ParagraphStyle('CalcPaidLabel', fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=colors.HexColor('#059669'))
    calc_paid_val = ParagraphStyle('CalcPaidVal', fontName='Helvetica-Bold', fontSize=10.5, leading=12, alignment=TA_RIGHT, textColor=colors.HexColor('#059669'))

    terms_title = ParagraphStyle('TermsTitle', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#334155'))
    terms_body = ParagraphStyle('TermsBody', fontName='Helvetica', fontSize=7.5, leading=10.5, textColor=colors.HexColor('#64748B'))

    sig_title = ParagraphStyle('SigTitle', fontName='Helvetica-Bold', fontSize=9.5, leading=11, alignment=TA_RIGHT, textColor=colors.HexColor('#0F172A'))
    sig_sub = ParagraphStyle('SigSub', fontName='Helvetica', fontSize=7.5, leading=9.5, alignment=TA_RIGHT, textColor=colors.HexColor('#64748B'))
    seal_tag = ParagraphStyle('SealTag', fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#1E3A8A'))

    inner_elements = []

    # 1. Header
    logo_img = Image(logo_path, width=46, height=46) if logo_path and os.path.exists(logo_path) else Paragraph('', styles['Normal'])
    brand_info = [
        Paragraph(gym_name.upper(), gym_title_style),
        Spacer(1, 1),
        Paragraph(gym_tagline, gym_tagline_style),
        Spacer(1, 2),
        Paragraph(gym_address, gym_addr_style),
    ]

    badge_data = [
        [Paragraph("SUPPLEMENT INVOICE", badge_label_style)],
        [Paragraph(sale.invoice_number, badge_no_style)],
        [Paragraph(f"Date: {sale_date_str}", badge_date_style)],
    ]
    badge_table = Table(badge_data, colWidths=[140])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFF7ED')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#FED7AA')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))

    header_table = Table([[logo_img, brand_info, badge_table]], colWidths=[50, inner_w - 50 - 145, 145])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor('#E2E8F0')),
    ]))
    inner_elements.append(header_table)
    inner_elements.append(Spacer(1, 10))

    # 2. Customer & Payment Info
    customer_col = [
        Paragraph("CUSTOMER DETAILS", meta_title_left),
        Spacer(1, 2),
        Paragraph(sale.customer_name, meta_name_left),
    ]
    if getattr(sale, 'member', None) and getattr(sale.member, 'member_id', None):
        customer_col.append(Spacer(1, 1))
        customer_col.append(Paragraph(f"Member ID: {sale.member.member_id}", meta_id_left))
    customer_col.append(Spacer(1, 1))
    customer_col.append(Paragraph(f"Phone: +91 {sale.customer_phone or 'N/A'}", meta_phone_left))

    payment_col = [
        Paragraph("PAYMENT MODE", meta_title_right),
        Spacer(1, 2),
        Paragraph(payment_mode, meta_mode_right),
        Spacer(1, 2),
        Paragraph(f"Cashier: {cashier}", meta_cashier_right),
    ]

    info_table = Table([[customer_col, payment_col]], colWidths=[inner_w * 0.55, inner_w * 0.45])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    inner_elements.append(info_table)
    inner_elements.append(Spacer(1, 10))

    # 3. Items Table
    items_rows = [
        [
            Paragraph("PURCHASED ITEM", th_left),
            Paragraph("QTY", th_center),
            Paragraph("RATE", th_right),
            Paragraph("AMOUNT (Rs.)", th_right),
        ]
    ]

    for item in sale.items.all():
        p_name = item.product_name or (item.product.name if getattr(item, 'product', None) else 'Supplement Item')
        p_brand = item.product_brand or (item.product.brand if getattr(item, 'product', None) and item.product.brand else '')
        desc_para = Paragraph(f"Brand: {p_brand}", td_item_desc) if p_brand else Paragraph("", styles['Normal'])

        items_rows.append([
            [Paragraph(p_name, td_item_name), Spacer(1, 1), desc_para],
            Paragraph(str(item.quantity), td_qty),
            Paragraph(f"Rs. {float(item.unit_price):,.0f}", td_price),
            Paragraph(f"Rs. {float(item.subtotal):,.0f}", td_subtotal),
        ])

    items_table = Table(items_rows, colWidths=[inner_w * 0.50, inner_w * 0.12, inner_w * 0.18, inner_w * 0.20])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('LINEBELOW', (0,0), (-1,0), 1, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    inner_elements.append(items_table)
    inner_elements.append(Spacer(1, 8))

    # 4. Calculation Summary
    calc_w = 240
    calc_rows = [
        [Paragraph("Subtotal:", calc_label), Paragraph(f"Rs. {subtotal:,.0f}", calc_val)],
    ]
    if discount > 0:
        calc_rows.append([Paragraph("Discount Applied:", calc_discount_label), Paragraph(f"-Rs. {discount:,.0f}", calc_discount_val)])
    calc_rows.append([Paragraph("Total Paid:", calc_paid_label), Paragraph(f"Rs. {final_amount:,.0f}", calc_paid_val)])

    calc_inner_table = Table(calc_rows, colWidths=[120, 120])
    paid_idx = len(calc_rows) - 1
    calc_inner_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('BACKGROUND', (0, paid_idx), (-1, paid_idx), colors.HexColor('#ECFDF5')),
        ('BOX', (0, paid_idx), (-1, paid_idx), 1, colors.HexColor('#A7F3D0')),
        ('TOPPADDING', (0, paid_idx), (-1, paid_idx), 5),
        ('BOTTOMPADDING', (0, paid_idx), (-1, paid_idx), 5),
    ]))

    calc_outer = Table([[Paragraph("", styles['Normal']), calc_inner_table]], colWidths=[inner_w - calc_w, calc_w])
    calc_outer.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    inner_elements.append(calc_outer)
    inner_elements.append(Spacer(1, 10))

    # 5. Footer & Store Policies
    terms_col = [
        Paragraph("Store Terms &amp; Policies:", terms_title),
        Spacer(1, 2),
        Paragraph("1. All supplement products are 100% genuine &amp; authentic.", terms_body),
        Paragraph("2. Opened or unsealed products are non-returnable.", terms_body),
        Paragraph("3. Official store tax invoice issued by Morya Fitness, Sinnar.", terms_body),
    ]

    seal_img = Image(logo_path, width=42, height=42) if logo_path and os.path.exists(logo_path) else Paragraph('', styles['Normal'])
    seal_data = [
        [seal_img],
        [Paragraph("OFFICIAL STORE SEAL &bull; SINNAR", seal_tag)],
        [Spacer(1, 3)],
        [Paragraph("Authorized Signatory", sig_title)],
        [Paragraph("Morya Fitness, Sinnar", sig_sub)],
    ]
    seal_table = Table(seal_data, colWidths=[140])
    seal_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('LINEBELOW', (0,2), (0,2), 1, colors.HexColor('#CBD5E1')),
    ]))

    footer_table = Table([[terms_col, seal_table]], colWidths=[inner_w * 0.65, inner_w * 0.35])
    footer_table.setStyle(TableStyle([
        ('LINEABOVE', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
    ]))
    inner_elements.append(footer_table)

    card_table = Table([[inner_elements]], colWidths=[avail_w])
    card_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('TOPPADDING', (0,0), (-1,-1), card_padding),
        ('BOTTOMPADDING', (0,0), (-1,-1), card_padding),
        ('LEFTPADDING', (0,0), (-1,-1), card_padding),
        ('RIGHTPADDING', (0,0), (-1,-1), card_padding),
    ]))

    doc.build([card_table])
    return buf.getvalue()
