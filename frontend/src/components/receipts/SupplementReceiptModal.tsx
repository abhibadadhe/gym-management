import React, { useState } from 'react';
import {
  Printer, X, CheckCircle2, ShoppingBag, MapPin,
  Phone, CreditCard, Sparkles, Building2, MessageSquare,
  RefreshCw
} from 'lucide-react';
import { SupplementReceiptData } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface SupplementReceiptModalProps {
  receipt: SupplementReceiptData;
  onClose: () => void;
}

export const SupplementReceiptModal: React.FC<SupplementReceiptModalProps> = ({ receipt, onClose }) => {
  const { showToast } = useToast();
  const gymName = receipt.gym?.name || 'Morya Fitness';
  const gymTagline = receipt.gym?.tagline || 'Premium Gym & Fitness Center';
  const gymAddress = receipt.gym?.address || 'Kanadi Mala, Baragaon Pimpri Road, Sinnar - 422103';
  const gymPhone = receipt.gym?.phone || '+91 7219188002';
  const gymUpi = receipt.gym?.upi_id || 'moryafitness@okhdfcbank';

  // Strict UPI or Cash
  const formatPaymentMethod = (method: any): 'UPI' | 'Cash' => {
    if (!method) return 'UPI';
    const s = String(method).toUpperCase();
    if (s.includes('CASH')) return 'Cash';
    return 'UPI';
  };
  const paymentMethod = formatPaymentMethod(receipt.payment_method);

  const [isSending, setIsSending] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const handleSendWhatsApp = async () => {
    setIsSending(true);
    setNoticeMessage(null);
    try {
      const rawPhone = receipt.customer_phone || '';
      const cleanPhone = String(rawPhone).replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.startsWith('91') && cleanPhone.length === 12
        ? cleanPhone
        : cleanPhone.length === 10
          ? `91${cleanPhone}`
          : cleanPhone;

      const itemsText = receipt.items
        .map((item, idx) => `${idx + 1}. *${item.name}* (Qty: ${item.quantity}) — ₹${item.subtotal.toLocaleString('en-IN')}`)
        .join('\n');

      const message = `🛍️ *${gymName.toUpperCase()} — SUPPLEMENT INVOICE*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear *${receipt.customer_name}*,\n\n` +
        `Thank you for your supplement purchase at *${gymName}*! Here are your invoice details:\n\n` +
        `📄 *Invoice No:* ${receipt.invoice_number}\n` +
        `📅 *Date:* ${receipt.sale_date}\n` +
        `💳 *Payment Mode:* ${paymentMethod}\n\n` +
        `*Purchased Items:*\n${itemsText}\n\n` +
        `💰 *Total Amount Paid:* ₹${receipt.final_amount.toLocaleString('en-IN')}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 *Store:* ${gymAddress}\n` +
        `📞 *Helpdesk:* ${gymPhone}\n\n` +
        `_Authentic fitness supplements guaranteed by ${gymName}!_ 💪`;

      const fileName = `Invoice_${receipt.invoice_number}.pdf`;
      let pdfFile: File | null = null;
      try {
        const saleIdentifier = (receipt as any).id || (receipt as any).sale_id || receipt.invoice_number;
        const blob = await api.getSupplementInvoicePdf(saleIdentifier);
        pdfFile = new File([blob], fileName, { type: 'application/pdf' });
      } catch (e) {
        console.warn('Invoice PDF fetch error:', e);
      }

      // 1. Mobile & Web Share API support (Android, iOS)
      if (pdfFile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `Supplement Invoice - ${receipt.invoice_number}`,
            text: message,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return;
          console.warn('Native share failed, proceeding with desktop fallback:', shareErr);
        }
      }

      // 2. Desktop Fallback:
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
          setNoticeMessage(`Invoice PDF "${fileName}" downloaded! In WhatsApp Web, simply drag & drop the PDF into the chat or attach as Document.`);
        } catch (e) {
          console.warn('Auto-download error:', e);
        }
      }

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
      showToast('Please allow popups in your browser to print the invoice.', 'error');
      return;
    }

    const itemsRowsHtml = receipt.items.map((item, idx) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">
          ${idx + 1}. ${item.name}
          ${item.brand ? `<span style="display:block; font-size: 10px; color: #64748b; font-weight: normal;">Brand: ${item.brand}</span>` : ''}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${item.quantity}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${item.unit_price.toLocaleString('en-IN')}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">₹${item.subtotal.toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Supplement Invoice - ${receipt.invoice_number}</title>
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
              padding: 20px;
              font-size: 13px;
              line-height: 1.4;
            }
            .invoice-box {
              max-width: 650px;
              margin: 0 auto;
              border: 2px solid #0f172a;
              border-radius: 12px;
              padding: 24px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            .header-brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .brand-logo {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              object-fit: cover;
              border: 2px solid #ea580c;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .brand-tagline {
              font-size: 11px;
              font-weight: 700;
              color: #ea580c;
            }
            .brand-address {
              font-size: 10px;
              color: #64748b;
              margin-top: 3px;
              line-height: 1.3;
            }
            .invoice-badge {
              text-align: right;
              background: #fff7ed;
              border: 1px solid #fed7aa;
              padding: 10px 14px;
              border-radius: 8px;
            }
            .badge-title {
              font-size: 11px;
              font-weight: 800;
              color: #c2410c;
              text-transform: uppercase;
            }
            .badge-num {
              font-size: 13px;
              font-weight: 900;
              font-family: monospace;
              color: #0f172a;
              margin-top: 2px;
            }
            .badge-date {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            .customer-bar {
              display: flex;
              justify-content: space-between;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .items-table th {
              background: #0f172a;
              color: #ffffff;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 8px 10px;
              letter-spacing: 0.5px;
            }
            .totals-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-top: 2px solid #0f172a;
              padding-top: 14px;
              margin-bottom: 18px;
            }
            .payment-info {
              font-size: 11px;
              color: #334155;
            }
            .calc-box {
              width: 220px;
              text-align: right;
            }
            .calc-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 12px;
            }
            .calc-row.final {
              font-size: 15px;
              font-weight: 900;
              color: #15803d;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              padding: 6px 8px;
              border-radius: 6px;
              margin-top: 6px;
            }
            .footer {
              border-top: 1px dashed #cbd5e1;
              padding-top: 12px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 10px;
              color: #64748b;
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
              margin-bottom: 4px;
              transform: rotate(-6deg);
            }
            .stamp-seal {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              border: 2px solid #1e3a8a;
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
              font-size: 7.5px;
              font-weight: 800;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 2px;
              border: 1px solid #1e3a8a;
              padding: 1px 5px;
              border-radius: 4px;
              background: #eff6ff;
            }
            .sig-line {
              width: 120px;
              border-bottom: 1px solid #0f172a;
              margin: 4px 0 3px auto;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div class="header-brand">
                <img src="/logo.png" class="brand-logo" alt="Logo" />
                <div>
                  <div class="brand-title">${gymName}</div>
                  <div class="brand-tagline">${gymTagline}</div>
                  <div class="brand-address">
                    ${gymAddress}<br />
                    Phone: ${gymPhone} | UPI: ${gymUpi}
                  </div>
                </div>
              </div>
              <div class="invoice-badge">
                <div class="badge-title">Supplement Invoice</div>
                <div class="badge-num">${receipt.invoice_number}</div>
                <div class="badge-date">${receipt.sale_date}</div>
              </div>
            </div>

            <div class="customer-bar">
              <div>
                <strong>Customer:</strong> ${receipt.customer_name}
                ${receipt.member_id ? ` <span style="color:#ea580c; font-weight:700;">(ID: ${receipt.member_id})</span>` : ''}
              </div>
              <div>
                <strong>Phone:</strong> ${receipt.customer_phone || 'N/A'}
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Product Description</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 100px;">Rate</th>
                  <th style="text-align: right; width: 110px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>

            <div class="totals-container">
              <div class="payment-info">
                <strong>Payment Mode:</strong> ${paymentMethod}<br />
                <strong>Cashier / Sold By:</strong> ${receipt.sold_by}<br />
                ${receipt.notes ? `<strong>Notes:</strong> ${receipt.notes}` : ''}
              </div>

              <div class="calc-box">
                <div class="calc-row">
                  <span style="color:#64748b;">Gross Amount:</span>
                  <span>₹${receipt.subtotal.toLocaleString('en-IN')}</span>
                </div>
                ${receipt.discount > 0 ? `
                  <div class="calc-row" style="color: #ea580c;">
                    <span>Discount:</span>
                    <span>- ₹${receipt.discount.toLocaleString('en-IN')}</span>
                  </div>
                ` : ''}
                <div class="calc-row final">
                  <span>Total Paid:</span>
                  <span>₹${receipt.final_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <div>
                • Authentic fitness supplements guaranteed by Morya Fitness.<br />
                • Please keep this invoice for your nutritional records.
              </div>
              <div class="signature">
                <div class="stamp-seal-container">
                  <div class="stamp-seal">
                    <img src="/logo.png" alt="Morya Fitness Seal" />
                  </div>
                  <div class="stamp-tag">OFFICIAL SEAL • SINNAR</div>
                </div>
                <div class="sig-line"></div>
                <strong>Authorized Signatory</strong>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold font-heading text-sm sm:text-base">Supplement Sales Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div id="printable-supplement-invoice" className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Gym Branding */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shadow-sm flex-shrink-0"
              />
              <div>
                <h2 className="text-base font-black text-slate-900 font-heading leading-tight">
                  {gymName}
                </h2>
                <p className="text-[11px] text-orange-600 font-semibold">{gymTagline}</p>
                <p className="text-[10px] text-slate-500">{gymAddress}</p>
              </div>
            </div>

            <div className="text-right bg-orange-50/80 p-2.5 rounded-xl border border-orange-100">
              <span className="text-[9px] font-bold uppercase text-orange-700 tracking-wider block">
                Invoice No
              </span>
              <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
                {receipt.invoice_number}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {receipt.date}
              </span>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Customer</span>
              <span className="font-bold text-slate-900 block mt-0.5">{receipt.customer_name}</span>
              {receipt.member_id && (
                <span className="text-[10px] text-orange-600 font-semibold block">
                  Member ID: {receipt.member_id}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Phone & Payment</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{receipt.customer_phone || 'N/A'}</span>
              <span className="text-[10px] text-emerald-700 font-bold block">
                Paid via {receipt.payment_method}
              </span>
            </div>
          </div>

          {/* Items table */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Purchased Items
            </span>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-medium text-slate-900">
                        {item.name}
                        {item.brand && <span className="block text-[10px] text-slate-400">{item.brand}</span>}
                      </td>
                      <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="p-2.5 text-right">₹{item.unit_price.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">₹{item.subtotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Cashier</span>
              <span className="font-semibold text-slate-800 text-xs">{receipt.sold_by}</span>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-[11px] text-slate-500">
                Gross: ₹{receipt.subtotal.toLocaleString('en-IN')}
              </div>
              {receipt.discount > 0 && (
                <div className="text-[11px] text-orange-600 font-semibold">
                  Discount: - ₹{receipt.discount.toLocaleString('en-IN')}
                </div>
              )}
              <div className="text-base font-black text-emerald-700 font-heading">
                Total: ₹{receipt.final_amount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Notice Message Banner */}
        {noticeMessage && (
          <div className="mx-6 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2 shadow-sm animate-fade-in">
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap">
          <button
            onClick={handleSendWhatsApp}
            disabled={isSending}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-60"
            title="Send PDF Invoice via WhatsApp"
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
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
