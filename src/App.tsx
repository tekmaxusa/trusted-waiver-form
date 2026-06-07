import { useState } from 'react';
import { Check } from 'lucide-react';
import { WaiverFormData } from './types';
import WaiverForm from './components/WaiverForm';
import SuccessPage from './components/SuccessPage';
import {publicAssetUrl} from './utils/publicAsset';

export default function App() {
  const [submittedData, setSubmittedData] = useState<WaiverFormData | null>(null);

  const handleSubmissionSuccess = (data: WaiverFormData) => {
    setSubmittedData(data);
  };

  const handleReset = () => {
    setSubmittedData(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-800 antialiased selection:bg-neutral-200">
      
      {/* Universal Soft Decorative Header */}
      <header className="bg-white border-b border-neutral-200/70 sticky top-0 z-40 select-none">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Elegant Official Logo */}
            <img
              src={publicAssetUrl('saheli-spa-logo.png')}
              alt="Saheli Eyebrow Threading Logo" 
              className="w-9 h-9 rounded-full object-cover border border-neutral-200/80 grayscale-[30%] shadow-sm" 
              referrerPolicy="no-referrer" 
            />
            <div>
              <span className="font-bold text-neutral-900 tracking-widest text-[12px] uppercase block font-sans">
                Saheli Eyebrow Threading
              </span>
              <span className="text-[9px] text-neutral-400 font-medium tracking-wider uppercase block font-sans">
                Centennial • Interactive Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {submittedData && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <Check size={11} className="text-emerald-600" />
                Submitted Securely
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 px-4 sm:py-12 max-w-4xl w-full mx-auto">
        {submittedData ? (
          <SuccessPage 
            submittedData={submittedData} 
            onReset={handleReset} 
          />
        ) : (
          <div className="space-y-6">
            {/* Elegant, Simple, Formal Header Section */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/60 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 block">
                    Customer Safety & Consent
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-sans text-neutral-900 tracking-tight font-semibold leading-none">
                    Client Waiver Form
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed max-w-xl font-normal">
                    Saheli Centennial. Please complete the professional intake and consent questionnaire below prior to your beauty treatment.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1 p-3 bg-neutral-50 border border-neutral-100 rounded-lg text-xs text-neutral-600 min-w-[210px]">
                  <span className="font-bold text-neutral-800 uppercase tracking-wider text-[9px]">Salon Address</span>
                  <span className="text-neutral-500">📍 10909 E Arapahoe Pl, Centennial</span>
                  <span className="text-neutral-500">📞 (720) 630-8549</span>
                </div>
              </div>
              <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-neutral-400">
                <div className="flex items-center gap-1.5 font-medium text-neutral-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Secure connection active</span>
                </div>
                <span>Required fields (<span className="text-red-500">*</span>)</span>
              </div>
            </div>

            <WaiverForm onSubmitSuccess={handleSubmissionSuccess} />
          </div>
        )}
      </main>

      {/* Footer Branding Area */}
      <footer className="bg-white border-t border-neutral-200 py-6 text-center select-none">
        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold font-sans">
          Saheli Eyebrow Threading Centennial
        </p>
        <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
          © {new Date().getFullYear()} All Rights Reserved. Thank you for choosing Saheli.
        </p>
      </footer>

    </div>
  );
}
