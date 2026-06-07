import { FileText, Download, ArrowLeft } from 'lucide-react';
import { WaiverFormData } from '../types';
import { generateWaiverPDF } from '../utils/pdfGenerator';
import {publicAssetUrl} from '../utils/publicAsset';

interface SuccessPageProps {
  onReset: () => void;
  submittedData: WaiverFormData;
}

export default function SuccessPage({ onReset, submittedData }: SuccessPageProps) {
  
  const handleDownloadPDF = async () => {
    try {
      const { doc, filename } = await generateWaiverPDF(submittedData, submittedData.submittedAtISO);
      doc.save(filename);
    } catch (err) {
      console.error('Failed to generate/download PDF on success page:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 text-center">
      <div className="flex flex-col items-center gap-4 mb-6">
        {/* Brand Logo - High Resolution Formal */}
        <div className="relative">
          <img
            src={publicAssetUrl('saheli-spa-logo.png')}
            alt="Saheli Eyebrow Threading Centennial Logo" 
            className="w-20 h-20 rounded-full object-cover border border-neutral-200 shadow-sm grayscale-[20%]" 
            referrerPolicy="no-referrer" 
          />
        </div>
      </div>

      <h1 className="text-xl sm:text-2xl font-sans text-neutral-900 tracking-tight font-bold mb-2">
        Submission Complete
      </h1>
      
      <p className="text-xs sm:text-sm text-neutral-500 mb-8 max-w-sm mx-auto leading-relaxed font-light">
        Thank you. Your electronic liability release waiver is formally recorded for your upcoming session today.
      </p>

      {/* Copy of the PDF box */}
      <div className="bg-white border border-neutral-200/60 rounded-xl p-5 mb-8 text-left max-w-sm mx-auto shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2 border border-neutral-200 text-neutral-700 rounded-lg mt-0.5">
            <FileText size={18} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wide">Client Record File</h4>
            <p className="text-[11px] text-stone-500 mt-1 mb-3.5 leading-relaxed font-light">
              Your registered PDF is validated. You can download an offline duplicate for your personal records here.
            </p>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 px-3.5 py-2.5 rounded-lg cursor-pointer transition shadow-sm"
              id="download-backup-pdf-btn"
            >
              <Download size={13} />
              Download Copy (PDF File)
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 border border-transparent hover:border-stone-200 px-4 py-2 rounded-lg cursor-pointer transition"
          id="back-to-form-btn"
        >
          <ArrowLeft size={12} />
          Register Another Guest Waiver
        </button>
      </div>
    </div>
  );
}
