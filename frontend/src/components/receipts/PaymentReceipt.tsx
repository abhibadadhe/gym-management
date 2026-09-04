import React, { useState } from 'react';
import {
  Printer, CheckCircle2,
  MessageSquare, RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { generatePdfFromElement } from '../../utils/receiptPdfGenerator';

interface PaymentReceiptProps {
  receipt: any;
  onClose?: () => void;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({ receipt, onClose }) => {
  const [isSending, setIsSending] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  if (!receipt) return null;

  // Safe Member Properties
  const memberName = receipt.member?.full_name || receipt.member?.name || 'Member';
  const memberId = receipt.member?.member_id || '—';
  const memberPhone = receipt.member?.phone || '—';

  // Safe Gym Properties
  const gymName = (receipt.gym?.name || 'Morya Fitness').toUpperCase();
  const gymTagline = receipt.gym?.tagline || 'Premium Gym & Fitness Center';
  const gymAddress = receipt.gym?.address || 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103';
  const gymPhone = receipt.gym?.phone || '+91 7219188002';
  const gymUpi = receipt.gym?.upi_id || '7219188002@ybl';

  // Safe Payment & Plan Properties
  const receiptNo = receipt.receipt_number || 'MF-REC-2026-0001';
  const paymentDate = receipt.payment_date || receipt.date || receipt.created_at || new Date().toISOString();
  const formattedDate = new Date(paymentDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const planName = receipt.plan?.name || 'One Month';
  const durationDays = receipt.plan?.duration_days ?? 30;
  const startDate = receipt.plan?.start_date || receipt.membership?.start_date || receipt.start_date || '';
  const endDate = receipt.plan?.end_date || receipt.membership?.end_date || receipt.end_date || '';
  const validityRange = startDate && endDate ? `${startDate} to ${endDate}` : '';

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
  const cashierName = receipt.received_by || receipt.payment?.received_by || 'Gokul Gugale';

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

      const message = `🏋️‍♂️ *${gymName} — OFFICIAL FEE RECEIPT*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear *${memberName}*,\n\n` +
        `Thank you for your payment at *${receipt.gym?.name || 'Morya Fitness'}*! Here are your official fee receipt details:\n\n` +
        `📄 *Receipt No:* ${receiptNo}\n` +
        `📅 *Date:* ${formattedDate}\n` +
        `💪 *Plan:* ${planName} (${durationDays} Days)\n` +
        (validityRange ? `🗓️ *Validity:* ${validityRange}\n` : '') +
        `💳 *Payment Mode:* ${paymentMethod}\n` +
        (transactionRef ? `🔖 *Ref / UTR:* ${transactionRef}\n` : '') +
        `👤 *Cashier:* ${cashierName}\n` +
        `💰 *Amount Paid:* ₹${amountPaid.toLocaleString('en-IN')}\n` +
        (remainingDues > 0
          ? `⚠️ *Balance Dues Remaining:* ₹${remainingDues.toLocaleString('en-IN')}\n`
          : `✅ *Payment Status:* Paid in Full\n`) +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 *Address:* ${gymAddress}\n` +
        `📞 *Helpdesk:* ${gymPhone} | UPI: ${gymUpi}\n\n` +
        `_Welcome to ${receipt.gym?.name || 'Morya Fitness'}! Stay consistent & achieve your fitness goals!_ 🏆`;

      const fileName = `Receipt_${receiptNo}.pdf`;
      let pdfFile: File | null = null;

      // 1. Generate exact 1:1 pixel-perfect PDF directly from the on-screen receipt card DOM
      try {
        pdfFile = await generatePdfFromElement('printable-receipt', fileName);
      } catch (domErr) {
        console.warn('DOM PDF generation failed, falling back to backend:', domErr);
      }

      // 2. Fallback to backend API if DOM generation was unavailable
      if (!pdfFile) {
        try {
          const blob = await api.getReceiptPdf(receipt.id || receiptNo);
          pdfFile = new File([blob], fileName, { type: 'application/pdf' });
        } catch (pdfErr) {
          console.warn('Could not fetch PDF blob ahead of sharing:', pdfErr);
        }
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

      // 3. Open WhatsApp chat directly with prefilled message
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
    const el = document.getElementById('printable-receipt');
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
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
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${el.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* On-Screen Receipt Preview Card: 100% Identical Replica for Screen, Print & PDF */}
      <div
        id="printable-receipt"
        style={{
          maxWidth: '650px',
          margin: '0 auto',
          border: '2px solid #0f172a',
          borderRadius: '12px',
          padding: '28px',
          background: '#ffffff',
          color: '#0f172a',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: '13px',
          lineHeight: '1.5',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '18px',
          marginBottom: '20px',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/logo.png"
              alt="Morya Fitness"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #ea580c',
                flexShrink: 0,
                backgroundColor: '#07080a',
              }}
            />
            <div>
              <div style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.5px',
                textTransform: 'uppercase',
              }}>
                {gymName}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#ea580c',
                marginTop: '2px',
              }}>
                {gymTagline}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#64748b',
                marginTop: '4px',
                lineHeight: '1.4',
              }}>
                {gymAddress}<br />
                Phone: {gymPhone} | UPI: {gymUpi}
              </div>
            </div>
          </div>

          <div style={{
            textAlign: 'right',
            background: '#fff7ed',
            border: '1px solid #ffedd5',
            padding: '10px 14px',
            borderRadius: '8px',
            flexShrink: 0,
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#c2410c',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              OFFICIAL FEE RECEIPT
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              fontWeight: 800,
              color: '#0f172a',
              marginTop: '2px',
            }}>
              {receiptNo}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#64748b',
              marginTop: '2px',
            }}>
              Date: {formattedDate}
            </div>
          </div>
        </div>

        {/* Member Details & Received By Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '20px',
        }}>
          <div>
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}>
              RECEIVED FROM
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {memberName}
            </div>
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
              Member ID: <strong style={{ color: '#0f172a' }}>{memberId}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
              Mobile: +91 {memberPhone}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#64748b',
              letterSpacing: '0.5px',
              marginBottom: '4px',
            }}>
              PAYMENT DETAILS
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {paymentMethod}
            </div>
            {transactionRef && (
              <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                Ref/UTR: {transactionRef}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
              Cashier: {cashierName}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr>
              <th style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '10px 12px',
                textAlign: 'left',
                borderBottom: '1px solid #cbd5e1',
              }}>
                MEMBERSHIP PARTICULARS
              </th>
              <th style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '10px 12px',
                textAlign: 'left',
                borderBottom: '1px solid #cbd5e1',
              }}>
                VALIDITY PERIOD
              </th>
              <th style={{
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '10px 12px',
                textAlign: 'right',
                borderBottom: '1px solid #cbd5e1',
              }}>
                RATE (INR)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{
                padding: '12px',
                fontSize: '12px',
                borderBottom: '1px solid #f1f5f9',
                color: '#1e293b',
              }}>
                <strong style={{ color: '#0f172a' }}>{planName}</strong>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Full Gym & Equipment Access
                </div>
              </td>
              <td style={{
                padding: '12px',
                fontSize: '12px',
                borderBottom: '1px solid #f1f5f9',
                color: '#1e293b',
              }}>
                <div>{durationDays} Days</div>
                {validityRange && (
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    {validityRange}
                  </div>
                )}
              </td>
              <td style={{
                padding: '12px',
                fontSize: '12px',
                borderBottom: '1px solid #f1f5f9',
                color: '#1e293b',
                textAlign: 'right',
                fontWeight: 'bold',
              }}>
                ₹{planBasePrice.toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Financial Calculation Breakdown */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ width: '300px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              padding: '4px 0',
              color: '#475569',
            }}>
              <span>Plan Base Fee:</span>
              <span>₹{planBasePrice.toLocaleString('en-IN')}</span>
            </div>

            {discountApplied > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                padding: '4px 0',
                color: '#15803d',
                fontWeight: 600,
              }}>
                <span>Discount Applied:</span>
                <span>-₹{discountApplied.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              padding: '6px 0 4px',
              color: '#0f172a',
              fontWeight: 800,
              borderTop: '1px solid #e2e8f0',
              marginTop: '4px',
            }}>
              <span>Net Payable:</span>
              <span>₹{finalPayable.toLocaleString('en-IN')}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 900,
              color: '#15803d',
              background: '#f0fdf4',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #bbf7d0',
              marginTop: '6px',
            }}>
              <span>Amount Paid (INR):</span>
              <span>₹{amountPaid.toLocaleString('en-IN')}</span>
            </div>

            {remainingDues > 0 ? (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 800,
                color: '#b91c1c',
                background: '#fef2f2',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                marginTop: '6px',
              }}>
                <span>Balance Due:</span>
                <span>₹{remainingDues.toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#15803d',
                fontWeight: 'bold',
                padding: '4px 0',
                marginTop: '4px',
              }}>
                <span>Payment Status:</span>
                <span>✓ Paid in Full</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms & Authorized Stamp */}
        <div style={{
          borderTop: '1px dashed #cbd5e1',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.4', maxWidth: '60%' }}>
            <strong style={{ color: '#475569', display: 'block', marginBottom: '2px' }}>
              Terms & Conditions:
            </strong>
            1. Fees once paid are non-refundable and non-transferable.<br />
            2. Please maintain gym hygiene, discipline, and equipment care.<br />
            3. Official computer-generated receipt for Morya Fitness, Sinnar.
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '6px',
              transform: 'rotate(-6deg)',
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: '2.5px solid #1e3a8a',
                padding: '2px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 2px rgba(30, 58, 138, 0.2)',
                overflow: 'hidden',
              }}>
                <img
                  src="/logo.png"
                  alt="Morya Fitness Seal"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', backgroundColor: '#07080a' }}
                />
              </div>
              <div style={{
                fontSize: '8px',
                fontWeight: 800,
                color: '#1e3a8a',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginTop: '3px',
                border: '1px solid #1e3a8a',
                padding: '1px 6px',
                borderRadius: '4px',
                background: '#eff6ff',
              }}>
                OFFICIAL SEAL • SINNAR
              </div>
            </div>

            <div style={{
              width: '140px',
              borderBottom: '1px solid #0f172a',
              marginTop: '4px',
              marginBottom: '4px',
              marginLeft: 'auto',
            }} />
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              AUTHORIZED SIGNATURE & SEAL
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
              Morya Fitness, Sinnar
            </div>
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
