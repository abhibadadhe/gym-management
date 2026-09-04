import React, { useState } from 'react';
import {
  Printer, X, CheckCircle2, ShoppingBag,
  MessageSquare, RefreshCw
} from 'lucide-react';
import { SupplementReceiptData } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { generatePdfFromElement } from '../../utils/receiptPdfGenerator';

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

      // 1. Generate exact 1:1 pixel-perfect PDF directly from the on-screen invoice card DOM
      try {
        pdfFile = await generatePdfFromElement('printable-supplement-invoice', fileName);
      } catch (domErr) {
        console.warn('DOM PDF generation failed, falling back to backend:', domErr);
      }

      // 2. Fallback to backend API if DOM generation was unavailable
      if (!pdfFile) {
        try {
          const saleIdentifier = (receipt as any).id || (receipt as any).sale_id || receipt.invoice_number;
          const blob = await api.getSupplementInvoicePdf(saleIdentifier);
          pdfFile = new File([blob], fileName, { type: 'application/pdf' });
        } catch (e) {
          console.warn('Invoice PDF fetch error:', e);
        }
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
    const el = document.getElementById('printable-supplement-invoice');
    if (!el) {
      window.print();
      return;
    }
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      showToast('Please allow popups in your browser to print the invoice.', 'error');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice_${receipt.invoice_number}</title>
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

        {/* Receipt Scroll Area */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto bg-slate-50/50">
          {/* On-Screen Invoice Preview Card: 100% Identical Replica for Screen, Print & PDF */}
          <div
            id="printable-supplement-invoice"
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
                  alt="Logo"
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
                    {gymName.toUpperCase()}
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
                  OFFICIAL RETAIL INVOICE
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginTop: '2px',
                }}>
                  {receipt.invoice_number}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#64748b',
                  marginTop: '2px',
                }}>
                  Date: {receipt.sale_date || receipt.date}
                </div>
              </div>
            </div>

            {/* Billed To & Payment Details */}
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
                  BILLED TO
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  {receipt.customer_name}
                </div>
                {receipt.member_id && (
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                    Member ID: <strong style={{ color: '#0f172a' }}>{receipt.member_id}</strong>
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                  Mobile: +91 {receipt.customer_phone || '—'}
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
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                  Cashier: {receipt.sold_by || 'Gokul Gugale'}
                </div>
                {receipt.notes && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Note: {receipt.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Itemized Products Table */}
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
                    ITEM DESCRIPTION
                  </th>
                  <th style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '10px 12px',
                    textAlign: 'center',
                    borderBottom: '1px solid #cbd5e1',
                    width: '60px',
                  }}>
                    QTY
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
                    width: '100px',
                  }}>
                    UNIT PRICE
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
                    width: '110px',
                  }}>
                    TOTAL (INR)
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, i) => (
                  <tr key={i}>
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#1e293b',
                    }}>
                      <strong style={{ color: '#0f172a' }}>{item.name}</strong>
                      {item.brand && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Brand: {item.brand}
                        </div>
                      )}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#1e293b',
                      textAlign: 'center',
                      fontWeight: 700,
                    }}>
                      {item.quantity}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#1e293b',
                      textAlign: 'right',
                    }}>
                      ₹{item.unit_price.toLocaleString('en-IN')}
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#1e293b',
                      textAlign: 'right',
                      fontWeight: 'bold',
                    }}>
                      ₹{item.subtotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
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
                  <span>Subtotal:</span>
                  <span>₹{receipt.subtotal.toLocaleString('en-IN')}</span>
                </div>

                {receipt.discount > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '4px 0',
                    color: '#15803d',
                    fontWeight: 600,
                  }}>
                    <span>Discount:</span>
                    <span>-₹{receipt.discount.toLocaleString('en-IN')}</span>
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
                  <span>₹{receipt.final_amount.toLocaleString('en-IN')}</span>
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
                  <span>₹{receipt.final_amount.toLocaleString('en-IN')}</span>
                </div>

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
                  Store Terms & Policies:
                </strong>
                1. Authentic fitness supplements guaranteed by {gymName}.<br />
                2. Opened or unsealed products are non-returnable.<br />
                3. Official computer-generated retail invoice for Morya Fitness, Sinnar.
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
