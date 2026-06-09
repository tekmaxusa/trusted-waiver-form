import { useState } from 'react';
import { Check } from 'lucide-react';
import { WaiverFormData } from './types';
import WaiverForm from './components/WaiverForm';
import SuccessPage from './components/SuccessPage';
import { publicAssetUrl } from './utils/publicAsset';
import type { WaiverLocationConfig } from './merchants/types';

interface AppProps {
  location: WaiverLocationConfig;
}

export default function App({ location }: AppProps) {
  const [submittedData, setSubmittedData] = useState<WaiverFormData | null>(null);

  const handleSubmissionSuccess = (data: WaiverFormData) => {
    setSubmittedData(data);
  };

  const handleReset = () => {
    setSubmittedData(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-800 antialiased selection:bg-neutral-200">
      <header className="bg-white border-b border-neutral-200/70 sticky top-0 z-40 select-none">
        <div className="max-w-4xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={publicAssetUrl('saheli-spa-logo.png')}
              alt="Saheli Eyebrow Threading Logo"
              className="w-8 h-8 rounded-full object-cover border border-neutral-200/80 grayscale-[30%] shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="font-bold text-neutral-900 tracking-widest text-[12px] uppercase block font-sans">
                Saheli Eyebrow Threading
              </span>
              <span className="text-[9px] text-neutral-400 font-medium tracking-wider uppercase block font-sans">
                {location.headerTagline}
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

      <main className="flex-1 py-4 px-3 sm:py-6 sm:px-4 max-w-4xl w-full mx-auto">
        {submittedData ? (
          <SuccessPage onReset={handleReset} location={location} />
        ) : (
          <div className="space-y-3">
            <h1 className="text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight">
              Waiver Form for {location.locationDisplayName}
            </h1>
            <p className="text-xs text-neutral-500">
              {location.addressLine} · {location.phone}
            </p>
            <WaiverForm onSubmitSuccess={handleSubmissionSuccess} location={location} />
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-neutral-200 py-3 text-center select-none">
        <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold font-sans">
          {location.footerLocationLine}
        </p>
        <p className="text-[10px] text-neutral-400 font-sans mt-0.5">
          © {new Date().getFullYear()} All Rights Reserved. Thank you for choosing Saheli.
        </p>
      </footer>
    </div>
  );
}
