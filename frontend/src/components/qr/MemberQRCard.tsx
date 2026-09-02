import React from 'react';
import { Dumbbell, ShieldCheck, Printer, Calendar, User, Phone, MapPin } from 'lucide-react';

interface MemberQRCardProps {
  memberData: {
    id: number;
    member_id: string;
    full_name: string;
    phone: string;
    qr_token: string;
    current_plan?: string;
    expiry_date?: string;
    status?: string;
    gym_name?: string;
    address?: string;
  };
  onClose?: () => void;
}

export const MemberQRCard: React.FC<MemberQRCardProps> = ({ memberData, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    memberData.qr_token || memberData.member_id
  )}&color=0f172a&bgcolor=ffffff`;

  return (
    <div className="space-y-6">
      {/* Pass Card */}
      <div
        id="printable-receipt"
        className="max-w-sm mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-slate-800 relative"
      >
        {/* Pass Top Ribbon */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg">
              M
            </div>
            <div>
              <h4 className="font-black font-heading text-sm tracking-tight leading-none">
                {memberData.gym_name || 'MORYA FITNESS'}
              </h4>
              <span className="text-[10px] text-orange-100 uppercase tracking-widest font-semibold">
                Official Member Pass
              </span>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-orange-200" />
        </div>

        {/* Pass Body with Member Info & QR */}
        <div className="p-6 space-y-5 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-2xl font-heading border border-orange-200 shadow-sm flex-shrink-0">
              {memberData.full_name?.charAt(0) || 'M'}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 text-base font-heading truncate leading-tight">
                {memberData.full_name}
              </h3>
              <p className="font-mono text-xs font-bold text-orange-600 mt-0.5">
                {memberData.member_id}
              </p>
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                {memberData.phone}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200">
              <img
                src={qrUrl}
                alt="Member QR Pass"
                className="w-36 h-36 rounded-lg object-contain"
                crossOrigin="anonymous"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider font-semibold uppercase">
              Scan at Entrance Turnstile
            </span>
          </div>

          {/* Membership Info Table */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Plan</span>
              <span className="font-bold text-slate-800 truncate block">
                {memberData.current_plan || 'Active Membership'}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Validity</span>
              <span className="font-bold text-emerald-600 truncate block">
                {memberData.expiry_date
                  ? new Date(memberData.expiry_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Active'}
              </span>
            </div>
          </div>

          {/* Sinnar Location Footer */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 text-orange-500" />
            <span>Near Shiv Smarak, Sinnar, Nashik</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 no-print">
        <button
          onClick={handlePrint}
          className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print Member Pass</span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
