import { useState, FormEvent, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { WaiverFormData, WaiverSubmissionMeta, WaiverSubmissionPayload } from '../types';
import SignaturePad from './SignaturePad';
import { generateWaiverPDF, pdfBrandingForLocation } from '../utils/pdfGenerator';
import { getPdfBase64FromJsPDF, yieldToMainThread } from '../utils/pdfBase64';
import { resolveGasWebAppUrl } from '../utils/resolveGasWebAppUrl';
import type { WaiverLocationConfig } from '../merchants/types';

interface WaiverFormProps {
  onSubmitSuccess: (data: WaiverFormData) => void;
  location: WaiverLocationConfig;
}

function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, '').length;
}

const getInitialFormData = (): WaiverFormData => ({
  clientName: '',
  phoneNumber: '',
  email: '',
  dateOfBirth: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  services: {
    threadingTinting: false,
    facial: false,
    chemicalPeel: false,
    waxing: false,
    eyelashExtensions: false,
    browLamination: false,
    microblading: false,
    powderBrow: false,
    lipBlush: false,
    lashEnhancement: false,
    others: false,
    othersDetail: '',
  },
  skinConditions: {
    acne: false,
    rosacea: false,
    eczema: false,
    psoriasis: false,
    hyperpigmentation: false,
    sensitiveSkin: false,
    none: false,
    others: false,
    othersDetail: '',
  },
  medicalQuestions: {
    takingMedications: null,
    takingRetinolAccutane: null,
  },
  acceptedTerms: false,
  signatureDate: '',
  signatureImage: '',
});

type TextField = 'clientName' | 'phoneNumber';

export default function WaiverForm({ onSubmitSuccess, location }: WaiverFormProps) {
  const [formData, setFormData] = useState<WaiverFormData>(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Blocks double-submit before React re-renders disabled state (common cause of duplicate emails). */
  const submitGuardRef = useRef(false);
  /** Lets the button show why the wait feels long (PDF vs network). */
  const [submitUiPhase, setSubmitUiPhase] = useState<'pdf' | 'send'>('pdf');

  useEffect(() => {
    void resolveGasWebAppUrl();
  }, []);

  const clearFieldError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleTextChange = (field: TextField, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    clearFieldError(field);
  };

  const handleServiceChange = (field: keyof WaiverFormData['services'], value: boolean | string) => {
    setFormData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        [field]: value,
      },
    }));
  };

  const handleSkinConditionChange = (
    field: keyof WaiverFormData['skinConditions'],
    value: boolean | string
  ) => {
    setFormData((prev) => {
      const updatedConditions = { ...prev.skinConditions };

      if (field === 'none' && value === true) {
        Object.keys(updatedConditions).forEach((key) => {
          const k = key as keyof WaiverFormData['skinConditions'];
          updatedConditions[k] = k === 'none' ? true : k === 'othersDetail' ? '' : false;
        });
      } else {
        updatedConditions.none = false;
        (updatedConditions as Record<string, boolean | string>)[field] = value;
      }

      return {
        ...prev,
        skinConditions: updatedConditions,
      };
    });
  };

  const handleMedicalQuestionChange = (
    field: 'takingMedications' | 'takingRetinolAccutane',
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      medicalQuestions: {
        ...prev.medicalQuestions,
        [field]: value,
      },
    }));
    clearFieldError(`medicalQuestions.${field}`);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (countPhoneDigits(formData.phoneNumber) < 10) {
      newErrors.phoneNumber = 'Enter a valid phone number (at least 10 digits)';
    }

    if (formData.medicalQuestions.takingMedications === null) {
      newErrors['medicalQuestions.takingMedications'] = 'Please answer this question';
    }

    if (formData.medicalQuestions.takingRetinolAccutane === null) {
      newErrors['medicalQuestions.takingRetinolAccutane'] = 'Please answer this question';
    }

    if (!formData.acceptedTerms) {
      newErrors.acceptedTerms = 'You must accept the waiver to continue';
    }

    if (!formData.signatureImage) {
      newErrors.signatureImage = 'Draw your signature in the signature box';
    }

    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const id = errorKeys[0].replace(/\./g, '-');
      const firstErrorElement =
        document.getElementById(`err-container-${id}`) || document.getElementById(errorKeys[0]);
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return errorKeys.length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    if (submitGuardRef.current) {
      return;
    }
    submitGuardRef.current = true;

    setIsSubmitting(true);
    setSubmitUiPhase('pdf');
    await yieldToMainThread();

    const submittedAtISO = new Date().toISOString();
    const submissionId = crypto.randomUUID();
    const submittedAt = new Date(submittedAtISO);
    const signatureDate = submittedAt.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const formDataForSubmit: WaiverFormData = { ...formData, signatureDate };

    try {
      const branding = pdfBrandingForLocation(location);
      const [gasUrl, pdfParts] = await Promise.all([
        resolveGasWebAppUrl(),
        (async () => {
          const { doc, filename } = await generateWaiverPDF(formDataForSubmit, submittedAtISO, branding);
          const base64PdfPart = await getPdfBase64FromJsPDF(doc);
          return { filename, base64PdfPart };
        })(),
      ]);

      const waiverMeta: WaiverSubmissionMeta = {
        merchantSlug: location.merchantSlug,
        waiverPageSlug: location.waiverPageSlug,
        locationShortName: location.emailSubjectLocation,
        locationAddress: location.addressLine,
        locationPhone: location.phone,
        routePath: location.publicRouteSlug,
      };

      const submissionPayload: WaiverSubmissionPayload = {
        ...formDataForSubmit,
        submittedAtISO,
        pdfBase64: pdfParts.base64PdfPart,
        pdfFilename: pdfParts.filename,
        waiverMeta,
        submissionId,
      };

      setSubmitUiPhase('send');
      if (gasUrl) {
        const payload = JSON.stringify(submissionPayload);
        const body = new URLSearchParams();
        body.set('payload', payload);
        const ctrl = new AbortController();
        const postTimer = setTimeout(() => ctrl.abort(), 90000);
        try {
          // form body is reliable for Google Apps Script web apps (e.parameter.payload)
          await fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: body.toString(),
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(postTimer);
        }
        if (import.meta.env.DEV) {
          console.info('[waiver] POST sent to Apps Script, ~' + Math.round(payload.length / 1024) + ' KB');
        }
      } else {
        console.warn(
          'Waiver PDF generated locally. Set GitHub Actions secret VITE_GAS_WEBAPP_URL, add VITE_GAS_WEBAPP_URL to .env.local, copy public/gas-webapp.example.json to public/gas-webapp.json, or set localStorage key saheli_waiver_gas_url to your Apps Script /exec URL.'
        );
        alert(
          'This site has no Google Apps Script URL configured, so your waiver was not sent to the server and no notification email will be sent.\n\n' +
            'Fix: In GitHub go to Settings → Secrets and variables → Actions and add VITE_GAS_WEBAPP_URL with your full web app URL (must start with https://script.google.com/ and end with /exec). Then redeploy GitHub Pages.\n\n' +
            'Verify: Open https://<user>.github.io/<repo>/gas-webapp.json in your browser — gasWebAppUrl should contain your /exec URL, not an empty string.'
        );
      }

      onSubmitSuccess({
        ...formDataForSubmit,
        submittedAtISO,
      });
    } catch (err) {
      console.error('Waiver submission failure:', err);
      alert(
        'We could not finish sending your waiver. Please check your connection and try again. If it keeps failing, contact the salon.'
      );
    } finally {
      submitGuardRef.current = false;
      setIsSubmitting(false);
      setSubmitUiPhase('pdf');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl mx-auto" id="saheli-waiver-form" noValidate>
      <section
        className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200/60 shadow-sm space-y-3"
        id="section-customer-profile"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
          <div id="err-container-clientName" className="space-y-1 sm:col-span-2">
            <label htmlFor="clientName" className="block text-xs font-medium text-neutral-600">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="clientName"
              name="clientName"
              autoComplete="name"
              value={formData.clientName}
              onChange={(e) => handleTextChange('clientName', e.target.value)}
              aria-invalid={!!errors.clientName}
              aria-describedby={errors.clientName ? 'clientName-error' : undefined}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.clientName
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-neutral-200 focus:border-neutral-900 focus:ring-neutral-100'
              }`}
              placeholder="First and last name"
            />
            {errors.clientName ? (
              <p className="text-xs text-red-600" id="clientName-error" role="alert">
                {errors.clientName}
              </p>
            ) : null}
          </div>

          <div id="err-container-phoneNumber" className="space-y-1 sm:col-span-2">
            <label htmlFor="phoneNumber" className="block text-xs font-medium text-neutral-600">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              autoComplete="tel"
              inputMode="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleTextChange('phoneNumber', e.target.value)}
              aria-invalid={!!errors.phoneNumber}
              aria-describedby={errors.phoneNumber ? 'phoneNumber-error' : undefined}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.phoneNumber
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-neutral-200 focus:border-neutral-900 focus:ring-neutral-100'
              }`}
              placeholder="(555) 000-0000"
            />
            {errors.phoneNumber ? (
              <p className="text-xs text-red-600" id="phoneNumber-error" role="alert">
                {errors.phoneNumber}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200/60 shadow-sm space-y-3"
        id="section-treatment-selections"
        aria-labelledby="section-treatment-heading"
      >
        <h2 id="section-treatment-heading" className="text-sm font-semibold text-neutral-900">
          Treatment Type <span className="text-neutral-500 font-normal">(check all that apply)</span>
        </h2>

        <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
          {(
            [
              { id: 'threadingTinting', label: 'Threading and Tinting' },
              { id: 'facial', label: 'Facial' },
              { id: 'chemicalPeel', label: 'Chemical Peel' },
              { id: 'waxing', label: 'Waxing' },
              { id: 'eyelashExtensions', label: 'Eyelash Extensions' },
              { id: 'browLamination', label: 'Brow Lamination' },
              { id: 'microblading', label: 'Microblading' },
              { id: 'powderBrow', label: 'Powder Brow' },
              { id: 'lipBlush', label: 'Lip Blush' },
              { id: 'lashEnhancement', label: 'Lash Enhancement' },
            ] as const
          ).map((service) => {
            const isChecked = !!(formData.services as Record<string, boolean>)[service.id];
            return (
              <label
                key={service.id}
                className={`flex min-w-0 items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer select-none transition-colors ${
                  isChecked
                    ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    handleServiceChange(service.id as keyof WaiverFormData['services'], e.target.checked)
                  }
                  className="w-4 h-4 shrink-0 rounded border-neutral-300 accent-neutral-900 cursor-pointer"
                />
                <span className="text-sm leading-snug whitespace-nowrap">{service.label}</span>
              </label>
            );
          })}

          <div className="col-span-full pt-0.5">
            <label
              className={`inline-flex items-center gap-2 p-2 border rounded-lg cursor-pointer select-none transition-colors ${
                formData.services.others
                  ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600'
              }`}
            >
              <input
                type="checkbox"
                id="services-others-check"
                checked={formData.services.others}
                onChange={(e) => handleServiceChange('others', e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 accent-neutral-900 cursor-pointer shrink-0"
              />
              <span className="text-sm">Others</span>
            </label>
          </div>
        </div>
      </section>

      <section
        className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200/60 shadow-sm space-y-3"
        id="section-skin-status"
        aria-labelledby="section-skin-heading"
      >
        <h2 id="section-skin-heading" className="text-sm font-semibold text-neutral-900">
          Skin Conditions <span className="text-neutral-500 font-normal">(check any that apply)</span>
        </h2>

        <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(11.75rem,1fr))]">
          {(
            [
              { id: 'acne', label: 'Acne' },
              { id: 'rosacea', label: 'Rosacea' },
              { id: 'eczema', label: 'Eczema' },
              { id: 'psoriasis', label: 'Psoriasis' },
              { id: 'hyperpigmentation', label: 'Hyperpigmentation' },
              { id: 'sensitiveSkin', label: 'Sensitive Skin' },
              { id: 'none', label: 'None' },
            ] as const
          ).map((cond) => {
            const isChecked = !!formData.skinConditions[cond.id];
            return (
              <label
                key={cond.id}
                className={`flex min-w-0 items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer select-none transition-colors ${
                  isChecked
                    ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    handleSkinConditionChange(cond.id as keyof WaiverFormData['skinConditions'], e.target.checked)
                  }
                  className="w-4 h-4 shrink-0 rounded border-neutral-300 accent-neutral-900 cursor-pointer"
                  id={`skin-cond-${cond.id}`}
                />
                <span className="text-sm leading-snug whitespace-nowrap">{cond.label}</span>
              </label>
            );
          })}

          <div className="col-span-full pt-0.5">
            <label
              className={`inline-flex items-center gap-2 p-2 border rounded-lg cursor-pointer select-none transition-colors ${
                formData.skinConditions.others
                  ? 'border-neutral-900 bg-neutral-50 text-neutral-900'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.skinConditions.others}
                onChange={(e) => handleSkinConditionChange('others', e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 accent-neutral-900 cursor-pointer shrink-0"
              />
              <span className="text-sm">Others</span>
            </label>
          </div>
        </div>
      </section>

      <section
        className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200/60 shadow-sm space-y-3"
        id="section-medical-questions"
      >
        <div className="flex flex-col gap-4 sm:gap-5">
          <div
            id="err-container-medicalQuestions-takingMedications"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 sm:px-3.5 sm:py-3"
          >
            <p className="text-xs font-medium leading-snug text-neutral-800" id="medical-q-medications-label">
              Are you currently taking any medications (including topical)?{' '}
              <span className="text-red-500">*</span>
            </p>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-labelledby="medical-q-medications-label"
            >
              <button
                type="button"
                onClick={() => handleMedicalQuestionChange('takingMedications', true)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                  formData.medicalQuestions.takingMedications === true
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleMedicalQuestionChange('takingMedications', false)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                  formData.medicalQuestions.takingMedications === false
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                No
              </button>
            </div>
            {errors['medicalQuestions.takingMedications'] ? (
              <p className="mt-1.5 text-xs text-red-600" role="alert">
                {errors['medicalQuestions.takingMedications']}
              </p>
            ) : null}
          </div>

          <div
            id="err-container-medicalQuestions-takingRetinolAccutane"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 sm:px-3.5 sm:py-3"
          >
            <p className="text-xs font-medium leading-snug text-neutral-800" id="medical-q-retinol-label">
              Are you currently taking any Retinol, Accutane, Hydroquinone?{' '}
              <span className="text-red-500">*</span>
            </p>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-labelledby="medical-q-retinol-label"
            >
              <button
                type="button"
                onClick={() => handleMedicalQuestionChange('takingRetinolAccutane', true)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                  formData.medicalQuestions.takingRetinolAccutane === true
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleMedicalQuestionChange('takingRetinolAccutane', false)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                  formData.medicalQuestions.takingRetinolAccutane === false
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                No
              </button>
            </div>
            {errors['medicalQuestions.takingRetinolAccutane'] ? (
              <p className="mt-1.5 text-xs text-red-600" role="alert">
                {errors['medicalQuestions.takingRetinolAccutane']}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200/60 shadow-sm space-y-3"
        id="section-liability-terms"
        aria-labelledby="section-consent-heading"
      >
        <h2 id="section-consent-heading" className="text-sm font-semibold text-neutral-900">
          Consent & Acknowledgment
        </h2>

        <blockquote className="border border-neutral-200 bg-neutral-50 rounded-lg p-3 text-xs text-neutral-700 leading-snug not-italic">
          I understand that skincare treatments carry potential risks including, but not limited to, redness,
          irritation, and allergic reaction. I confirm that the above information is accurate to the best of my
          knowledge. I consent to the treatment(s) discussed and release the provider of any liability.
        </blockquote>

        <div id="err-container-acceptedTerms" className="space-y-1.5">
          <label className="flex items-start gap-2 p-2.5 border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50/80 transition-colors cursor-pointer">
            <input
              type="checkbox"
              id="acceptedTerms"
              checked={formData.acceptedTerms}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  acceptedTerms: e.target.checked,
                }));
                if (e.target.checked) clearFieldError('acceptedTerms');
              }}
              className="w-4 h-4 rounded border-neutral-300 accent-neutral-900 cursor-pointer mt-0.5 shrink-0"
            />
            <span className="text-xs font-medium text-neutral-800 leading-snug">
              I have read and agree to the statement above. <span className="text-red-500">*</span>
            </span>
          </label>
          {errors.acceptedTerms ? (
            <p className="text-xs text-red-600" role="alert">
              {errors.acceptedTerms}
            </p>
          ) : null}
        </div>
      </section>

      <section
        className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200/60 shadow-sm space-y-3"
        id="section-signature-seal"
      >
        <div id="err-container-signatureImage" className="w-full">
          <SignaturePad
            committedSignature={formData.signatureImage}
            error={errors.signatureImage}
            onSave={(base64) => {
              setFormData((prev) => ({
                ...prev,
                signatureImage: base64,
              }));
              clearFieldError('signatureImage');
            }}
            onClear={() => {
              setFormData((prev) => ({
                ...prev,
                signatureImage: '',
              }));
            }}
          />
        </div>
      </section>

      <div className="pt-1 flex flex-col items-stretch sm:items-center gap-2 max-w-md mx-auto w-full">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full text-center inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          id="submit-waiver-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin text-white" size={18} aria-hidden />
              {submitUiPhase === 'send' ? 'Sending…' : 'Building PDF…'}
            </>
          ) : (
            'Submit waiver'
          )}
        </button>
        <p className="text-xs text-neutral-500 text-center leading-relaxed">
          Submitting builds your waiver PDF and emails it to the salon when Apps Script is configured.
        </p>
      </div>
    </form>
  );
}
