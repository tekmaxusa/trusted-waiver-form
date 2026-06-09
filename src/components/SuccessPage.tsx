import { ArrowLeft } from 'lucide-react';
import { publicAssetUrl } from '../utils/publicAsset';
import type { WaiverLocationConfig } from '../merchants/types';

interface SuccessPageProps {
  onReset: () => void;
  location: WaiverLocationConfig;
}

export default function SuccessPage({ onReset, location }: SuccessPageProps) {
  return (
    <div className="max-w-md mx-auto py-12 px-4 text-center">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative">
          <img
            src={publicAssetUrl('saheli-spa-logo.png')}
            alt="Saheli Eyebrow Threading"
            className="w-20 h-20 rounded-full object-cover border border-neutral-200 shadow-sm grayscale-[20%]"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <h1 className="text-xl sm:text-2xl font-sans text-neutral-900 tracking-tight font-bold mb-3">
        Completed
      </h1>

      <p className="text-xs sm:text-sm text-neutral-500 mb-6 max-w-sm mx-auto leading-relaxed font-light">
        Thank you. Your waiver for {location.locationDisplayName} was submitted. A copy was emailed to the salon.
      </p>

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
