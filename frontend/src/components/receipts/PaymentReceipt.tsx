import React, { useState } from 'react';
import {
  Printer, MapPin, Phone, CheckCircle2, AlertCircle,
  MessageSquare, RefreshCw, FileText
} from 'lucide-react';
import { ReceiptData } from '../../types';
import { api } from '../../services/api';

interface PaymentReceiptProps {
  receipt: any;
  onClose?: () => void;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  // Safe Member Properties
  const memberName = receipt.member?.full_name || receipt.member?.name || 'Member';
  const memberId = receipt.member?.member_id || '—';
  const memberPhone = receipt.member?.phone || '—';

  // Safe Gym Properties
  const gymName = receipt.gym?.name || 'Morya Fitness';
  const gymTagline = receipt.gym?.tagline || 'Premium Gym & Fitness Center';
  const gymAddress = receipt.gym?.address || 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103';
  const gymPhone = receipt.gym?.phone || '+91 7219188002';
  const gymUpi = receipt.gym?.upi_id || 'moryafitness@okhdfcbank';

  // Safe Payment & Plan Properties
  const receiptNo = receipt.receipt_number || 'MF-REC-001';
  const paymentDate = receipt.payment_date || receipt.date || receipt.created_at || new Date().toISOString();
  const formattedDate = new Date(paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const planName = receipt.plan?.name || 'Gym Membership';
  const durationDays = receipt.plan?.duration_days ?? 30;

  // Strict UPI or Cash formatting (no Paytm/PhonePe/GPay or extra text)
  const formatPaymentMethod = (method: any): 'UPI' | 'Cash' => {
    if (!method) return 'UPI';
    const s = String(method).toUpperCase();
    if (s.includes('CASH')) return 'Cash';
    return 'UPI';
  };
  const paymentMethod = formatPaymentMethod(
    receipt.payment_method ||
    receipt.payment?.payment_method ||
    receipt.payment?.method ||
    'UPI'
  );

  const transactionRef = receipt.transaction_ref || receipt.payment?.transaction_ref || '';
  const cashierName = receipt.received_by || receipt.payment?.received_by || 'Admin';

  // Safe Financial Computations (No NaN guaranteed)
  const planBasePrice = Number(
    receipt.plan?.price ??
    receipt.plan?.plan_price ??
    receipt.final_payable ??
    receipt.amount_paid ??
    receipt.payment?.amount ??
    0
  );

  const discountApplied = Number(
    receipt.discount_applied ??
    receipt.plan?.discount ??
    0
  );

  const finalPayable = Number(
    receipt.final_payable ??
    receipt.plan?.final_amount ??
    Math.max(0, planBasePrice - discountApplied)
  );

  const amountPaid = Number(
    receipt.amount_paid ??
    receipt.payment?.amount ??
    receipt.plan?.paid_amount ??
    finalPayable
  );

  const remainingDues = Number(
    receipt.remaining_pending_dues ??
    receipt.plan?.pending_amount ??
    Math.max(0, finalPayable - amountPaid)
  );

  const [isSending, setIsSending] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'https://moryafitness.vercel.app'
    : window.location.origin;
  const publicPdfUrl = `${baseUrl}/api/public/receipts/${encodeURIComponent(receiptNo)}/pdf/`;

  const handleSendWhatsApp = async () => {
    setIsSending(true);
    setNoticeMessage(null);
    try {
      const rawPhone = memberPhone || receipt.member?.phone || '';
      const cleanPhone = String(rawPhone).replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.startsWith('91') && cleanPhone.length === 12
        ? cleanPhone
        : cleanPhone.length === 10
          ? `91${cleanPhone}`
          : cleanPhone;

      const message = `🏋️‍♂️ *${gymName.toUpperCase()} — OFFICIAL FEE RECEIPT*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear *${memberName}*,\n\n` +
        `Thank you for your payment at *${gymName}*! Here are your official fee receipt details:\n\n` +
        `📄 *Receipt No:* ${receiptNo}\n` +
        `📅 *Date:* ${formattedDate}\n` +
        `💪 *Plan:* ${planName} (${durationDays} Days)\n` +
        `💳 *Payment Mode:* ${paymentMethod}\n` +
        (transactionRef ? `🔖 *Ref / UTR:* ${transactionRef}\n` : '') +
        `💰 *Amount Paid:* ₹${amountPaid.toLocaleString('en-IN')}\n` +
        (remainingDues > 0
          ? `⚠️ *Balance Dues Remaining:* ₹${remainingDues.toLocaleString('en-IN')}\n`
          : `✅ *Payment Status:* Settled in Full\n`) +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📥 *OFFICIAL RECEIPT (PDF):*\n` +
        `${publicPdfUrl}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 *Address:* ${gymAddress}\n` +
        `📞 *Helpdesk:* ${gymPhone}\n\n` +
        `_Welcome to ${gymName}! Stay consistent & achieve your fitness goals!_ 🏆`;

      const fileName = `Receipt_${receiptNo}.pdf`;
      let pdfFile: File | null = null;
      try {
        const blob = await api.getReceiptPdf(receipt.id || receiptNo);
        pdfFile = new File([blob], fileName, { type: 'application/pdf' });
      } catch (pdfErr) {
        console.warn('Could not fetch PDF blob ahead of sharing:', pdfErr);
      }

      // 1. Mobile & Web Share API support (Android, iOS)
      // Directly attaches the PDF document file into WhatsApp!
      if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `Fee Receipt - ${receiptNo}`,
            text: message,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Native share cancelled or failed, using desktop fallback:', shareErr);
        }
      }

      // 2. Desktop Fallback:
      // Auto-downloads the PDF file so user has the file right in Downloads
      if (pdfFile) {
        try {
          const url = window.URL.createObjectURL(pdfFile);
          const a = document.createElement('a');
          a.href = url;
          a.download = pdfFile.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
          setNoticeMessage(`Receipt PDF "${fileName}" downloaded! In WhatsApp Web, simply drag & drop the PDF into the chat or attach as Document.`);
        } catch (e) {
          console.warn('PDF auto-download error:', e);
        }
      }

      // 3. Open WhatsApp chat directly with prefilled message containing direct PDF link
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const encodedText = encodeURIComponent(message);
      const whatsappUrl = isMobile
        ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`
        : `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`;

      window.open(whatsappUrl, '_blank');
    } finally {
      setIsSending(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt_${receiptNo}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 24px;
              font-size: 13px;
              line-height: 1.5;
            }
            .receipt-container {
              max-width: 650px;
              margin: 0 auto;
              border: 2px solid #0f172a;
              border-radius: 12px;
              padding: 28px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 18px;
              margin-bottom: 20px;
            }
            .brand-title {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: -0.5px;
              text-transform: uppercase;
            }
            .brand-tagline {
              font-size: 11px;
              font-weight: 700;
              color: #ea580c;
              margin-top: 2px;
            }
            .brand-contact {
              font-size: 11px;
              color: #64748b;
              margin-top: 4px;
              line-height: 1.4;
            }
            .receipt-badge {
              text-align: right;
              background: #fff7ed;
              border: 1px solid #ffedd5;
              padding: 10px 14px;
              border-radius: 8px;
            }
            .badge-title {
              font-size: 10px;
              font-weight: 800;
              color: #c2410c;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .badge-number {
              font-family: monospace;
              font-size: 14px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
            }
            .badge-date {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 14px;
              margin-bottom: 20px;
            }
            .info-col h4 {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .info-val-strong {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
            }
            .info-val {
              font-size: 12px;
              color: #334155;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #f1f5f9;
              color: #475569;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 10px 12px;
              text-align: left;
              border-bottom: 1px solid #cbd5e1;
            }
            th.text-right, td.text-right {
              text-align: right;
            }
            td {
              padding: 12px;
              font-size: 12px;
              border-bottom: 1px solid #f1f5f9;
              color: #1e293b;
            }
            .calc-wrap {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 20px;
            }
            .calc-table {
              width: 300px;
            }
            .calc-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              padding: 4px 0;
              color: #475569;
            }
            .calc-row.strong {
              font-weight: 800;
              color: #0f172a;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
              margin-top: 4px;
            }
            .calc-row.paid {
              font-weight: 900;
              font-size: 14px;
              color: #15803d;
              background: #f0fdf4;
              padding: 6px 8px;
              border-radius: 6px;
              border: 1px solid #bbf7d0;
              margin-top: 6px;
            }
            .calc-row.due {
              font-weight: 800;
              font-size: 12px;
              color: #b91c1c;
              background: #fef2f2;
              padding: 4px 8px;
              border-radius: 6px;
              border: 1px solid #fecaca;
              margin-top: 6px;
            }
            .footer {
              border-top: 1px dashed #cbd5e1;
              padding-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .terms {
              font-size: 10px;
              color: #64748b;
              line-height: 1.4;
              max-width: 60%;
            }
            .signature {
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }
            .stamp-seal-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 6px;
              transform: rotate(-6deg);
            }
            .stamp-seal {
              width: 72px;
              height: 72px;
              border-radius: 50%;
              border: 2.5px solid #1e3a8a;
              padding: 2px;
              background: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.2);
            }
            .stamp-seal img {
              width: 100%;
              height: 100%;
              border-radius: 50%;
              object-fit: cover;
            }
            .stamp-tag {
              font-size: 8px;
              font-weight: 800;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 3px;
              border: 1px solid #1e3a8a;
              padding: 1px 6px;
              border-radius: 4px;
              background: #eff6ff;
            }
            .sig-line {
              width: 140px;
              border-bottom: 1px solid #0f172a;
              margin-top: 4px;
              margin-bottom: 4px;
              margin-left: auto;
            }
            .sig-text {
              font-size: 10px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div style="display: flex; align-items: center; gap: 14px;">
                <img src="/logo.png" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #ea580c;" />
                <div>
                  <div class="brand-title">${gymName}</div>
                  <div class="brand-tagline">${gymTagline}</div>
                  <div class="brand-contact">
                    ${gymAddress}<br>
                    Phone: ${gymPhone} | UPI: ${gymUpi}
                  </div>
                </div>
              </div>
              <div class="receipt-badge">
                <div class="badge-title">Official Fee Receipt</div>
                <div class="badge-number">${receiptNo}</div>
                <div class="badge-date">Date: ${formattedDate}</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-col">
                <h4>Received From</h4>
                <div class="info-val-strong">${memberName}</div>
                <div class="info-val">Member ID: <strong>${memberId}</strong></div>
                <div class="info-val">Mobile: +91 ${memberPhone}</div>
              </div>
              <div class="info-col" style="text-align: right;">
                <h4>Payment Details</h4>
                <div class="info-val-strong">${paymentMethod}</div>
                ${transactionRef ? `<div class="info-val">Ref/UTR: ${transactionRef}</div>` : ''}
                <div class="info-val">Cashier: ${cashierName}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Membership Particulars</th>
                  <th>Validity Period</th>
                  <th class="text-right">Rate (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${planName}</strong><br>
                    <span style="font-size: 11px; color: #64748b;">Full Gym & Equipment Access</span>
                  </td>
                  <td>
                    ${durationDays} Days<br>
                    <span style="font-size: 10px; color: #64748b;">
                      ${receipt.membership?.start_date ? `${receipt.membership.start_date} to ${receipt.membership.end_date}` : ''}
                    </span>
                  </td>
                  <td class="text-right font-bold">₹${planBasePrice.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div class="calc-wrap">
              <div class="calc-table">
                <div class="calc-row">
                  <span>Plan Base Fee:</span>
                  <span>₹${planBasePrice.toLocaleString('en-IN')}</span>
                </div>
                ${discountApplied > 0 ? `
                <div class="calc-row" style="color: #15803d;">
                  <span>Discount Applied:</span>
                  <span>-₹${discountApplied.toLocaleString('en-IN')}</span>
                </div>` : ''}
                <div class="calc-row strong">
                  <span>Net Payable:</span>
                  <span>₹${finalPayable.toLocaleString('en-IN')}</span>
                </div>
                <div class="calc-row paid">
                  <span>Amount Paid (INR):</span>
                  <span>₹${amountPaid.toLocaleString('en-IN')}</span>
                </div>
                ${remainingDues > 0 ? `
                <div class="calc-row due">
                  <span>Balance Due:</span>
                  <span>₹${remainingDues.toLocaleString('en-IN')}</span>
                </div>` : `
                <div class="calc-row" style="color: #15803d; font-weight: bold; font-size: 11px; padding: 4px 0;">
                  <span>Payment Status:</span>
                  <span>✓ Paid in Full</span>
                </div>`}
              </div>
            </div>

            <div class="footer">
              <div class="terms">
                <strong>Terms & Conditions:</strong><br>
                1. Fees once paid are non-refundable and non-transferable.<br>
                2. Please maintain gym hygiene, discipline, and equipment care.<br>
                3. Official computer-generated receipt for Morya Fitness, Sinnar.
              </div>
              <div class="signature">
                <div class="stamp-seal-container">
                  <div class="stamp-seal">
                    <img src="/logo.png" alt="Morya Fitness Seal" />
                  </div>
                  <div class="stamp-tag">OFFICIAL SEAL • SINNAR</div>
                </div>
                <div class="sig-line"></div>
                <div class="sig-text">Authorized Signature & Seal</div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Morya Fitness, Sinnar</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* On-Screen Receipt Preview Card */}
      <div
        id="printable-receipt"
        className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-slate-800 space-y-6 max-w-2xl mx-auto"
      >
        {/* Receipt Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200 gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Morya Fitness"
              className="w-14 h-14 rounded-full object-cover border-2 border-orange-500 shadow-md flex-shrink-0"
            />
            <div>
              <h2 className="text-xl font-black text-slate-900 font-heading tracking-tight leading-tight">
                {gymName}
              </h2>
              <p className="text-xs text-orange-600 font-semibold">{gymTagline}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                {gymAddress}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-orange-50/70 p-3 rounded-2xl border border-orange-100">
            <span className="text-[10px] uppercase font-bold text-orange-700 tracking-wider block">
              Official Fee Receipt
            </span>
            <span className="font-mono font-bold text-sm text-slate-900 block mt-0.5">
              {receiptNo}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Date: {formattedDate}
            </span>
          </div>
        </div>

        {/* Member Details & Received By Info */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Member Details
            </span>
            <span className="font-bold text-slate-900 text-sm block mt-0.5">
              {memberName}
            </span>
            <span className="font-mono text-xs text-orange-600 font-semibold block">
              ID: {memberId}
            </span>
            <span className="text-slate-600 text-xs block">Phone: +91 {memberPhone}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Payment Mode
            </span>
            <span className="font-bold text-slate-900 text-sm block mt-0.5">
              {paymentMethod}
            </span>
            {transactionRef && (
              <span className="text-slate-500 font-mono text-[11px] block truncate">
                Ref: {transactionRef}
              </span>
            )}
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Cashier: {cashierName}
            </span>
          </div>
        </div>

        {/* Itemized Fee Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4">Membership Item</th>
                <th className="py-2.5 px-4">Validity</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-900 block">{planName}</span>
                  <span className="text-[11px] text-slate-500">General gym & equipment access</span>
                </td>
                <td className="py-3 px-4 font-medium text-slate-700">
                  {durationDays} Days
                </td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">
                  ₹{planBasePrice.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Calculation Breakdown */}
        <div className="flex justify-end pt-2">
          <div className="w-72 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Plan Base Amount:</span>
              <span className="font-semibold text-slate-800">
                ₹{planBasePrice.toLocaleString('en-IN')}
              </span>
            </div>

            {discountApplied > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount Applied:</span>
                <span>-₹{discountApplied.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Net Payable:</span>
              <span>₹{finalPayable.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between font-black text-emerald-600 text-sm bg-emerald-50 p-2 rounded-xl border border-emerald-100">
              <span>Amount Paid:</span>
              <span>₹{amountPaid.toLocaleString('en-IN')}</span>
            </div>

            {remainingDues > 0 ? (
              <div className="flex justify-between font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100">
                <span>Balance Dues Remaining:</span>
                <span>₹{remainingDues.toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <span>Payment Status:</span>
                <span>✓ Settled in Full</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms & Authorized Stamp */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-2 items-end gap-4 text-[10px] text-slate-500">
          <div className="space-y-1">
            <p className="font-bold text-slate-700">Terms & Conditions:</p>
            <p>1. Fees once paid are non-refundable and non-transferable.</p>
            <p>2. Please maintain gym discipline and equipment hygiene.</p>
            <p>3. Official receipt issued by Morya Fitness, Sinnar.</p>
          </div>

          <div className="text-right space-y-2 flex flex-col items-end">
            <div className="inline-flex flex-col items-center -rotate-6 transition-transform hover:rotate-0">
              <div className="w-16 h-16 rounded-full border-2 border-blue-900 p-0.5 bg-white shadow-sm ring-2 ring-blue-100 flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Morya Fitness Seal" className="w-full h-full object-cover rounded-full" />
              </div>
              <span className="text-[8px] font-black tracking-wider text-blue-900 uppercase mt-1 px-2 py-0.5 bg-blue-50 border border-blue-300 rounded">
                OFFICIAL SEAL • SINNAR
              </span>
            </div>
            <div className="w-32 border-b border-slate-300" />
            <p className="font-bold text-slate-800 text-xs">Authorized Signature & Seal</p>
            <p className="text-[9px] text-slate-500">Morya Fitness, Sinnar</p>
          </div>
        </div>
      </div>

      {/* Notice Message Banner */}
      {noticeMessage && (
        <div className="max-w-2xl mx-auto p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{noticeMessage}</p>
          </div>
          <button
            onClick={() => setNoticeMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 max-w-2xl mx-auto flex-wrap">
        <button
          onClick={handleSendWhatsApp}
          disabled={isSending}
          className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-60"
          title="Send PDF Receipt to WhatsApp"
        >
          {isSending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <MessageSquare className="w-4 h-4" />
          )}
          <span>{isSending ? 'Preparing PDF...' : 'Send to WhatsApp'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
