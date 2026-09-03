import io
import os
import shutil
import base64
import tempfile
import subprocess
from django.conf import settings as django_settings
from api.models import GymSettings


def get_gym_logo_base64() -> str:
    candidates = [
        os.path.join(django_settings.BASE_DIR, 'static', 'logo.png'),
        os.path.join(django_settings.BASE_DIR, '..', 'frontend', 'public', 'logo.png'),
        os.path.join(django_settings.BASE_DIR, '..', 'frontend', 'dist', 'logo.png'),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, 'rb') as f:
                    return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')
            except Exception:
                pass
    return ''


def find_headless_browser() -> str | None:
    candidate_browsers = [
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        'msedge',
        'chrome',
        'google-chrome',
        'google-chrome-stable',
        'chromium',
        'chromium-browser',
    ]
    for b in candidate_browsers:
        if os.path.isabs(b) and os.path.exists(b):
            return b
        elif not os.path.isabs(b):
            found = shutil.which(b)
            if found:
                return found
    return None


def render_html_to_pdf(html_content: str) -> bytes:
    browser = find_headless_browser()
    if browser:
        tmp_html = None
        tmp_pdf = None
        try:
            with tempfile.NamedTemporaryFile(suffix='.html', delete=False, mode='w', encoding='utf-8') as f:
                f.write(html_content)
                tmp_html = f.name
            tmp_pdf = tmp_html.replace('.html', '.pdf')

            cmd = [
                browser,
                '--headless',
                '--disable-gpu',
                '--no-pdf-header-footer',
                f'--print-to-pdf={tmp_pdf}',
                tmp_html
            ]
            res = subprocess.run(cmd, capture_output=True, timeout=20)
            if res.returncode == 0 and os.path.exists(tmp_pdf) and os.path.getsize(tmp_pdf) > 1000:
                with open(tmp_pdf, 'rb') as pf:
                    return pf.read()
        except Exception as e:
            print("Chromium headless print error, falling back to xhtml2pdf:", e)
        finally:
            if tmp_html and os.path.exists(tmp_html):
                try: os.remove(tmp_html)
                except Exception: pass
            if tmp_pdf and os.path.exists(tmp_pdf):
                try: os.remove(tmp_pdf)
                except Exception: pass

    # Robust fallback: xhtml2pdf
    try:
        from xhtml2pdf import pisa
        buf = io.BytesIO()
        pisa_status = pisa.CreatePDF(html_content, dest=buf)
        if not pisa_status.err:
            return buf.getvalue()
    except Exception as e:
        print("xhtml2pdf error:", e)

    return b""


def generate_payment_receipt_pdf(payment) -> bytes:
    settings = GymSettings.get_settings()
    member = payment.member
    membership = payment.membership

    gym_name = settings.name or 'Morya Fitness'
    gym_tagline = settings.tagline or 'Premium Gym & Fitness Center'
    gym_address = settings.address or 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103'

    plan_name = membership.plan.name if membership and membership.plan else 'General Fitness'
    duration_days = membership.plan.duration_days if membership and membership.plan else 30
    plan_price = float(membership.price) if membership else float(payment.amount)
    discount = float(membership.discount) if membership else 0.0
    final_amount = float(membership.final_amount) if membership else float(payment.amount)
    paid_amount = float(payment.amount)
    remaining_dues = float(membership.pending_amount) if membership else 0.0

    raw_pm = (payment.payment_method or 'UPI').upper()
    payment_mode = 'Cash' if 'CASH' in raw_pm else 'UPI'
    cashier = payment.received_by.get_full_name() if payment.received_by else 'Gokul Gugale'

    logo_b64 = get_gym_logo_base64()
    logo_tag = f'<img src="{logo_b64}" class="brand-logo" alt="Logo" />' if logo_b64 else '<div class="brand-logo-placeholder"></div>'
    seal_logo_tag = f'<img src="{logo_b64}" alt="Seal Logo" />' if logo_b64 else ''

    discount_row_html = ''
    if discount > 0:
        discount_row_html = f'''
        <div class="calc-row">
          <span>Discount Applied:</span>
          <span style="color: #059669; font-weight: 700;">-₹{discount:,.0f}</span>
        </div>
        '''

    status_html = ''
    if remaining_dues > 0:
        status_html = f'''
        <div class="due-banner">
          <span>Balance Dues Remaining:</span>
          <span>₹{remaining_dues:,.0f}</span>
        </div>
        '''
    else:
        status_html = '''
        <div class="status-banner">
          <span>Payment Status:</span>
          <span>✓ Settled in Full</span>
        </div>
        '''

    html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt_{payment.receipt_number}</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 10mm;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    font-size: 13px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  .receipt-card {{
    max-width: 660px;
    margin: 0 auto;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    padding: 26px 30px;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 18px;
    border-bottom: 1px solid #e2e8f0;
    gap: 16px;
  }}
  .brand-left {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}
  .brand-logo {{
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 2.5px solid #ea580c;
    flex-shrink: 0;
  }}
  .brand-logo-placeholder {{
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #fed7aa;
    border: 2.5px solid #ea580c;
    flex-shrink: 0;
  }}
  .brand-name {{
    font-size: 22px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.5px;
    line-height: 1.1;
  }}
  .brand-tagline {{
    font-size: 11.5px;
    font-weight: 700;
    color: #ea580c;
    margin-top: 3px;
  }}
  .brand-address {{
    font-size: 11px;
    color: #64748b;
    margin-top: 3px;
    display: flex;
    align-items: center;
    gap: 4px;
  }}
  .location-pin {{
    display: inline-block;
    width: 12px;
    height: 12px;
    background: #ea580c;
    mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');
    vertical-align: middle;
  }}
  .receipt-badge {{
    text-align: right;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    padding: 10px 18px;
    border-radius: 16px;
    flex-shrink: 0;
  }}
  .badge-tag {{
    font-size: 9.5px;
    font-weight: 800;
    color: #c2410c;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }}
  .badge-no {{
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 2px;
  }}
  .badge-date {{
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }}
  .info-box {{
    display: flex;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 16px;
    padding: 14px 18px;
    margin-top: 18px;
  }}
  .info-col-title {{
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    color: #94a3b8;
    letter-spacing: 0.6px;
    margin-bottom: 2px;
  }}
  .member-name {{
    font-size: 14.5px;
    font-weight: 800;
    color: #0f172a;
  }}
  .member-id {{
    font-size: 11px;
    font-weight: 700;
    color: #ea580c;
    margin-top: 2px;
  }}
  .member-phone {{
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }}
  .payment-method {{
    font-size: 14.5px;
    font-weight: 800;
    color: #0f172a;
    text-align: right;
  }}
  .cashier-name {{
    font-size: 11px;
    color: #64748b;
    margin-top: 3px;
    text-align: right;
  }}
  .table-box {{
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    margin-top: 18px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
  }}
  th {{
    background: #f8fafc;
    color: #475569;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }}
  th.text-center, td.text-center {{ text-align: center; }}
  th.text-right, td.text-right {{ text-align: right; }}
  td {{
    padding: 12px 16px;
    font-size: 12.5px;
    color: #1e293b;
    vertical-align: middle;
  }}
  .item-title {{
    font-weight: 800;
    color: #0f172a;
    font-size: 13px;
  }}
  .item-sub {{
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }}
  .item-duration {{
    font-weight: 600;
    color: #334155;
    font-size: 12.5px;
  }}
  .item-price {{
    font-weight: 800;
    color: #0f172a;
    font-size: 13px;
  }}
  .calc-container {{
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }}
  .calc-box {{
    width: 270px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }}
  .calc-row {{
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #475569;
  }}
  .calc-row.net {{
    font-weight: 800;
    color: #0f172a;
    font-size: 12.5px;
  }}
  .paid-banner {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 10px;
    padding: 8px 12px;
    color: #059669;
    font-weight: 800;
    font-size: 13.5px;
    margin-top: 2px;
  }}
  .status-banner {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 10px;
    padding: 7px 12px;
    color: #059669;
    font-weight: 800;
    font-size: 11.5px;
  }}
  .due-banner {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    padding: 7px 12px;
    color: #dc2626;
    font-weight: 800;
    font-size: 11.5px;
  }}
  .footer {{
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 26px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }}
  .terms-title {{
    font-size: 10.5px;
    font-weight: 800;
    color: #334155;
    margin-bottom: 4px;
  }}
  .terms-list {{
    font-size: 9.5px;
    color: #64748b;
    line-height: 1.5;
  }}
  .seal-signature {{
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }}
  .stamp-container {{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 6px;
    transform: rotate(-6deg);
  }}
  .stamp-ring {{
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid #1e3a8a;
    padding: 2px;
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .stamp-ring img {{
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }}
  .stamp-tag {{
    font-size: 7.5px;
    font-weight: 900;
    color: #1e3a8a;
    border: 1.5px solid #1e3a8a;
    padding: 1px 6px;
    border-radius: 4px;
    background: #eff6ff;
    margin-top: 3px;
    letter-spacing: 0.5px;
  }}
  .sig-title {{
    font-size: 11.5px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 4px;
  }}
  .sig-sub {{
    font-size: 9.5px;
    color: #64748b;
    margin-top: 1px;
  }}
</style>
</head>
<body>
  <div class="receipt-card">
    <!-- Header -->
    <div class="header">
      <div class="brand-left">
        {logo_tag}
        <div>
          <div class="brand-name">{gym_name}</div>
          <div class="brand-tagline">{gym_tagline}</div>
          <div class="brand-address">
            <span class="location-pin"></span> {gym_address}
          </div>
        </div>
      </div>
      <div class="receipt-badge">
        <div class="badge-tag">OFFICIAL FEE RECEIPT</div>
        <div class="badge-no">{payment.receipt_number}</div>
        <div class="badge-date">Date: {payment.payment_date.strftime('%d %b %Y')}</div>
      </div>
    </div>

    <!-- Member Details & Payment Info -->
    <div class="info-box">
      <div>
        <div class="info-col-title">MEMBER DETAILS</div>
        <div class="member-name">{member.full_name}</div>
        <div class="member-id">ID: {member.member_id}</div>
        <div class="member-phone">Phone: +91 {member.phone}</div>
      </div>
      <div>
        <div class="info-col-title" style="text-align: right;">PAYMENT MODE</div>
        <div class="payment-method">{payment_mode}</div>
        <div class="cashier-name">Cashier: {cashier}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-box">
      <table>
        <thead>
          <tr>
            <th>MEMBERSHIP ITEM</th>
            <th class="text-center">VALIDITY</th>
            <th class="text-right">AMOUNT (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-title">{plan_name}</div>
              <div class="item-sub">General gym & equipment access</div>
            </td>
            <td class="text-center item-duration">{duration_days} Days</td>
            <td class="text-right item-price">₹{plan_price:,.0f}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Calculation Summary -->
    <div class="calc-container">
      <div class="calc-box">
        <div class="calc-row">
          <span>Plan Base Amount:</span>
          <span>₹{plan_price:,.0f}</span>
        </div>
        {discount_row_html}
        <div class="calc-row net">
          <span>Net Payable:</span>
          <span>₹{final_amount:,.0f}</span>
        </div>
        <div class="paid-banner">
          <span>Amount Paid:</span>
          <span>₹{paid_amount:,.0f}</span>
        </div>
        {status_html}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        <div class="terms-title">Terms & Conditions:</div>
        <div class="terms-list">
          1. Fees once paid are non-refundable and non-transferable.<br/>
          2. Please maintain gym discipline and equipment hygiene.<br/>
          3. Official receipt issued by Morya Fitness, Sinnar.
        </div>
      </div>
      <div class="seal-signature">
        <div class="stamp-container">
          <div class="stamp-ring">
            {seal_logo_tag}
          </div>
          <div class="stamp-tag">OFFICIAL SEAL • SINNAR</div>
        </div>
        <div class="sig-title">Authorized Signature & Seal</div>
        <div class="sig-sub">Morya Fitness, Sinnar</div>
      </div>
    </div>
  </div>
</body>
</html>
'''
    return render_html_to_pdf(html)


def generate_supplement_invoice_pdf(sale) -> bytes:
    settings = GymSettings.get_settings()
    gym_name = settings.name or 'Morya Fitness'
    gym_tagline = settings.tagline or 'Premium Gym & Fitness Center'
    gym_address = settings.address or 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103'

    raw_pm = (sale.payment_method or 'UPI').upper()
    payment_mode = 'Cash' if 'CASH' in raw_pm else 'UPI'
    cashier = sale.sold_by.get_full_name() if sale.sold_by else 'Gokul Gugale'

    subtotal = float(sale.subtotal)
    discount = float(sale.discount)
    final_amount = float(sale.final_amount)

    logo_b64 = get_gym_logo_base64()
    logo_tag = f'<img src="{logo_b64}" class="brand-logo" alt="Logo" />' if logo_b64 else '<div class="brand-logo-placeholder"></div>'
    seal_logo_tag = f'<img src="{logo_b64}" alt="Seal Logo" />' if logo_b64 else ''

    member_id_line = f'<div class="member-id">Member ID: {sale.member.member_id}</div>' if sale.member else ''

    items_rows_html = ''
    for item in sale.items.all():
        p_name = item.product.name if item.product else 'Supplement Item'
        p_brand = item.product.brand if item.product and item.product.brand else '—'
        items_rows_html += f'''
        <tr>
          <td>
            <div class="item-title">{p_name}</div>
            <div class="item-sub">{p_brand}</div>
          </td>
          <td class="text-center item-duration">{item.quantity}</td>
          <td class="text-right">₹{float(item.unit_price):,.0f}</td>
          <td class="text-right item-price">₹{float(item.subtotal):,.0f}</td>
        </tr>
        '''

    discount_row_html = ''
    if discount > 0:
        discount_row_html = f'''
        <div class="calc-row">
          <span>Discount Applied:</span>
          <span style="color: #059669; font-weight: 700;">-₹{discount:,.0f}</span>
        </div>
        '''

    html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice_{sale.invoice_number}</title>
<style>
  @page {{
    size: A4 portrait;
    margin: 10mm;
  }}
  * {{
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    font-size: 13px;
    line-height: 1.4;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  .receipt-card {{
    max-width: 660px;
    margin: 0 auto;
    border: 1px solid #e2e8f0;
    border-radius: 24px;
    padding: 26px 30px;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 18px;
    border-bottom: 1px solid #e2e8f0;
    gap: 16px;
  }}
  .brand-left {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}
  .brand-logo {{
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 2.5px solid #ea580c;
    flex-shrink: 0;
  }}
  .brand-logo-placeholder {{
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #fed7aa;
    border: 2.5px solid #ea580c;
    flex-shrink: 0;
  }}
  .brand-name {{
    font-size: 22px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.5px;
    line-height: 1.1;
  }}
  .brand-tagline {{
    font-size: 11.5px;
    font-weight: 700;
    color: #ea580c;
    margin-top: 3px;
  }}
  .brand-address {{
    font-size: 11px;
    color: #64748b;
    margin-top: 3px;
  }}
  .receipt-badge {{
    text-align: right;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    padding: 10px 18px;
    border-radius: 16px;
    flex-shrink: 0;
  }}
  .badge-tag {{
    font-size: 9.5px;
    font-weight: 800;
    color: #c2410c;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }}
  .badge-no {{
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 2px;
  }}
  .badge-date {{
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }}
  .info-box {{
    display: flex;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 16px;
    padding: 14px 18px;
    margin-top: 18px;
  }}
  .info-col-title {{
    font-size: 9.5px;
    font-weight: 800;
    text-transform: uppercase;
    color: #94a3b8;
    letter-spacing: 0.6px;
    margin-bottom: 2px;
  }}
  .member-name {{
    font-size: 14.5px;
    font-weight: 800;
    color: #0f172a;
  }}
  .member-id {{
    font-size: 11px;
    font-weight: 700;
    color: #ea580c;
    margin-top: 2px;
  }}
  .member-phone {{
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }}
  .payment-method {{
    font-size: 14.5px;
    font-weight: 800;
    color: #0f172a;
    text-align: right;
  }}
  .cashier-name {{
    font-size: 11px;
    color: #64748b;
    margin-top: 3px;
    text-align: right;
  }}
  .table-box {{
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    margin-top: 18px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
  }}
  th {{
    background: #f8fafc;
    color: #475569;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 16px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }}
  th.text-center, td.text-center {{ text-align: center; }}
  th.text-right, td.text-right {{ text-align: right; }}
  td {{
    padding: 12px 16px;
    font-size: 12.5px;
    color: #1e293b;
    vertical-align: middle;
  }}
  .item-title {{
    font-weight: 800;
    color: #0f172a;
    font-size: 13px;
  }}
  .item-sub {{
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }}
  .item-duration {{
    font-weight: 600;
    color: #334155;
    font-size: 12.5px;
  }}
  .item-price {{
    font-weight: 800;
    color: #0f172a;
    font-size: 13px;
  }}
  .calc-container {{
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }}
  .calc-box {{
    width: 270px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }}
  .calc-row {{
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #475569;
  }}
  .paid-banner {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 10px;
    padding: 8px 12px;
    color: #059669;
    font-weight: 800;
    font-size: 13.5px;
    margin-top: 2px;
  }}
  .footer {{
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 26px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }}
  .terms-title {{
    font-size: 10.5px;
    font-weight: 800;
    color: #334155;
    margin-bottom: 4px;
  }}
  .terms-list {{
    font-size: 9.5px;
    color: #64748b;
    line-height: 1.5;
  }}
  .seal-signature {{
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }}
  .stamp-container {{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 6px;
    transform: rotate(-6deg);
  }}
  .stamp-ring {{
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 2px solid #1e3a8a;
    padding: 2px;
    background: #ffffff;
    box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .stamp-ring img {{
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }}
  .stamp-tag {{
    font-size: 7.5px;
    font-weight: 900;
    color: #1e3a8a;
    border: 1.5px solid #1e3a8a;
    padding: 1px 6px;
    border-radius: 4px;
    background: #eff6ff;
    margin-top: 3px;
    letter-spacing: 0.5px;
  }}
  .sig-title {{
    font-size: 11.5px;
    font-weight: 800;
    color: #0f172a;
    margin-top: 4px;
  }}
  .sig-sub {{
    font-size: 9.5px;
    color: #64748b;
    margin-top: 1px;
  }}
</style>
</head>
<body>
  <div class="receipt-card">
    <!-- Header -->
    <div class="header">
      <div class="brand-left">
        {logo_tag}
        <div>
          <div class="brand-name">{gym_name}</div>
          <div class="brand-tagline">{gym_tagline}</div>
          <div class="brand-address">{gym_address}</div>
        </div>
      </div>
      <div class="receipt-badge">
        <div class="badge-tag">INVOICE NO</div>
        <div class="badge-no">{sale.invoice_number}</div>
        <div class="badge-date">Date: {sale.sale_date.strftime('%d %b %Y')}</div>
      </div>
    </div>

    <!-- Customer & Payment -->
    <div class="info-box">
      <div>
        <div class="info-col-title">CUSTOMER</div>
        <div class="member-name">{sale.customer_name}</div>
        {member_id_line}
      </div>
      <div>
        <div class="info-col-title" style="text-align: right;">PHONE & PAYMENT</div>
        <div class="member-phone" style="text-align: right;">{sale.customer_phone or 'N/A'}</div>
        <div class="payment-method" style="color: #059669; font-size: 12px; margin-top: 3px;">Paid via {payment_mode}</div>
        <div class="cashier-name">Cashier: {cashier}</div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-box">
      <table>
        <thead>
          <tr>
            <th>PRODUCT</th>
            <th class="text-center">QTY</th>
            <th class="text-right">PRICE (₹)</th>
            <th class="text-right">TOTAL (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items_rows_html}
        </tbody>
      </table>
    </div>

    <!-- Calculation Summary -->
    <div class="calc-container">
      <div class="calc-box">
        <div class="calc-row">
          <span>Gross Subtotal:</span>
          <span>₹{subtotal:,.0f}</span>
        </div>
        {discount_row_html}
        <div class="paid-banner">
          <span>Total Paid:</span>
          <span>₹{final_amount:,.0f}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        <div class="terms-title">Notice & Guarantee:</div>
        <div class="terms-list">
          1. Authentic fitness supplements guaranteed by Morya Fitness.<br/>
          2. Please store in a cool, dry place away from sunlight.<br/>
          3. Keep this invoice for nutritional and billing records.
        </div>
      </div>
      <div class="seal-signature">
        <div class="stamp-container">
          <div class="stamp-ring">
            {seal_logo_tag}
          </div>
          <div class="stamp-tag">OFFICIAL SEAL • SINNAR</div>
        </div>
        <div class="sig-title">Authorized Signatory</div>
        <div class="sig-sub">Morya Fitness, Sinnar</div>
      </div>
    </div>
  </div>
</body>
</html>
'''
    return render_html_to_pdf(html)
