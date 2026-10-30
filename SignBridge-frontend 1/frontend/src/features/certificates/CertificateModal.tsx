import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Certificate } from '../../types';
import { SignBridgeLogo } from '../../components/common/SignBridgeLogo';

interface CertificateModalProps {
  certificate: Certificate;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  const publicOrigin = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
  const verifyUrl = `${publicOrigin}/verify/${certificate.certificateNumber || certificate.id}`;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [verifyUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const qr = qrDataUrl ? `<img src=\"${qrDataUrl}\" alt=\"Certificate verification QR code\" style=\"width:150px;height:150px\" />` : '';
    const issueDate = new Date(certificate.issueDate || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>SignBridge Certificate - ${certificate.certificateNumber || certificate.id}</title><style>body{margin:0;background:#f5f1ea;font-family:Arial,sans-serif;color:#152238}.sheet{box-sizing:border-box;width:1000px;max-width:calc(100vw - 40px);margin:30px auto;padding:70px 80px;border:8px solid #d4a72c;background:#fffdf8;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.12)}.logo{font-size:30px;font-weight:800;color:#0891b2}.sub{letter-spacing:3px;color:#64748b;font-size:12px;font-weight:700}.title{margin-top:55px;letter-spacing:4px;color:#64748b;font-weight:700}.name{font-size:44px;font-weight:900;margin:20px 0 35px;border-bottom:3px solid #d4a72c;display:inline-block;padding:0 10px 10px}.course{margin:28px auto;padding:22px;border:1px solid #e5e7eb;border-radius:16px;max-width:620px}.course h2{color:#0891b2;margin:0 0 10px}.score{font-weight:800;color:#059669}.meta{display:flex;justify-content:space-between;text-align:left;border-top:1px solid #e5e7eb;padding-top:22px;margin-top:35px;font-size:13px}.verify{margin-top:35px;display:flex;justify-content:center;align-items:center;gap:30px;font-size:11px;color:#64748b}.footer{margin-top:35px;color:#64748b;font-size:11px}</style></head><body><main class=\"sheet\"><div class=\"logo\">SignBridge AI</div><div class=\"sub\">INDIAN SIGN LANGUAGE LEARNING & PRACTICAL ASSESSMENT</div><div class=\"title\">CERTIFICATE OF PRACTICAL ACHIEVEMENT</div><div>This is to certify that</div><div class=\"name\">${escapeHtml(certificate.userName || 'Verified Learner')}</div><div>has successfully demonstrated practical performance in the camera-evaluated assessment.</div><div class=\"course\"><h2>${escapeHtml(certificate.courseTitle || `Level ${certificate.levelNumber} Certification`)}</h2><div class=\"score\">Score Achieved: ${certificate.score}%</div></div><div class=\"meta\"><div><b>CERTIFICATE ID</b><br>${escapeHtml(certificate.certificateNumber || certificate.id)}</div><div style=\"text-align:right\"><b>DATE OF ISSUE</b><br>${issueDate}</div></div><div class=\"verify\">${qr}<div>Scan or open to verify this certificate:<br><b>${escapeHtml(verifyUrl)}</b></div></div><div class=\"footer\">Issued by the SignBridge AI assessment system • Verification is checked against the SignBridge certificate registry.</div></main></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SignBridge-${certificate.certificateNumber || certificate.id}.html`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' } as Record<string,string>)[ch]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl);
    alert('Verification link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 animate-fade-in relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
        >
          ✕
        </button>

        {/* Printable Certificate Sheet */}
        <div
          id="printable-certificate"
          className="bg-amber-50/40 dark:bg-slate-950 border-4 border-amber-500/70 rounded-2xl p-8 text-center space-y-6 shadow-inner relative overflow-hidden"
        >
          {/* Subtle Decorative Borders */}
          <div className="absolute top-2 left-2 right-2 bottom-2 border border-amber-500/30 rounded-xl pointer-events-none" />

          <div className="space-y-1">
            <div className="flex justify-center"><SignBridgeLogo showTagline={false} /></div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
              Indian Sign Language Learning & Practical Assessment
            </p>
          </div>

          <div className="py-2">
            <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-widest">
              Certificate of Practical Achievement
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">This certificate confirms that</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 underline decoration-amber-500 decoration-2 underline-offset-8">
              {certificate.userName || 'Verified Learner'}
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            has demonstrated practical proficiency and successfully passed the formal camera-evaluated examination for
          </p>

          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 max-w-sm mx-auto space-y-1 shadow-sm">
            <div className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-400">
              {certificate.courseTitle || `Level ${certificate.levelNumber} Certification`}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
              Score Achieved: {certificate.score}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-left">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Certificate Identifier</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                {certificate.certificateNumber || certificate.id}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Date of Issue</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {new Date(certificate.issueDate || Date.now()).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            {qrDataUrl && <img src={qrDataUrl} alt="Certificate verification QR code" className="w-28 h-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1" />}
            <div className="text-center sm:text-left text-[10px] text-slate-500 dark:text-slate-400 font-mono break-all max-w-sm">
              Scan or open to verify this certificate publicly:<br />{verifyUrl}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-3 justify-end items-center pt-2">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1.5"
          >
            <span>🔗</span>
            <span>Copy Verification Link</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/30 transition flex items-center space-x-1.5"
          >
            <span>⬇️</span><span>Download Certificate</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold shadow-md shadow-cyan-600/30 transition flex items-center space-x-1.5"
          >
            <span>🖨️</span><span>Print / Save as PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
