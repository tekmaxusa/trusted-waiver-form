import { useState, FormEvent, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { WaiverFormData, WaiverSubmissionPayload } from '../types';
import SignaturePad from './SignaturePad';
import { generateWaiverPDF } from '../utils/pdfGenerator';
import {resolveGasWebAppUrl} from '../utils/resolveGasWebAppUrl';

interface WaiverFormProps {
  onSubmitSuccess: (data: WaiverFormData) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

type TextField =
  | 'clientName'
  | 'phoneNumber'
  | 'email'
  | 'dateOfBirth'
  | 'address'
  | 'emergencyContactName'
  | 'emergencyContactPhone';

export default function WaiverForm({ onSubmitSuccess }: WaiverFormProps) {
  const [formData, setFormData] = useState<WaiverFormData>(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState('');

  const formatToReadableDateTime = (dateTimeString: string): string => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) return dateTimeString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  useEffect(() => {
    void resolveGasWebAppUrl();
  }, []);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const initialDateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;

    setSelectedDateTime(initialDateTimeLocal);

    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setFormData((prev) => ({
      ...prev,
      signatureDate: formattedDate,
    }));
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
      newErrors.clientName = 'Full name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (countPhoneDigits(formData.phoneNumber) < 10) {
      newErrors.phoneNumber = 'Enter a valid phone number (at least 10 digits)';
    }

    if (formData.email.trim() && !EMAIL_RE.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
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
      newErrors.signatureImage = 'Draw your signature and tap Save signature';
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

    setIsSubmitting(true);

    const submittedAtISO = new Date().toISOString();

    try {
      const { doc, filename } = await generateWaiverPDF(formData, submittedAtISO);
      const pdfBytes = doc.output('datauristring');
      const base64PdfPart = pdfBytes.split('base64,')[1];

      const submissionPayload: WaiverSubmissionPayload = {
        ...formData,
        submittedAtISO,
        pdfBase64: base64PdfPart,
        pdfFilename: filename,
      };

      const gasUrl = await resolveGasWebAppUrl();
      if (gasUrl) {
        const payload = JSON.stringify(submissionPayload);
        const body = new URLSearchParams();
        body.set('payload', payload);
        // form body is reliable for Google Apps Script web apps (e.parameter.payload)
        await fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: body.toString(),
        });
        if (import.meta.env.DEV) {
          console.info('[waiver] POST sent to Apps Script, ~' + Math.round(payload.length / 1024) + ' KB');
        }
      } else {
        console.warn(
          'Waiver PDF generated locally. Set GitHub Actions secret VITE_GAS_WEBAPP_URL, add VITE_GAS_WEBAPP_URL to .env.local, copy public/gas-webapp.example.json to public/gas-webapp.json, or set localStorage key saheli_waiver_gas_url to your Apps Script /exec URL.'
        );
        alert(
          'Walang naka-link na Google Apps Script URL ang site na ito, kaya hindi naipadala ang waiver sa server at walang email na lalabas.\n\n' +
            'Sa GitHub: Settings → Secrets and variables → Actions → idagdag ang VITE_GAS_WEBAPP_URL (buong /exec URL).\n\n' +
            'Pagkatapos, i-redeploy ang Pages. I-check din sa browser ang …/gas-webapp.json — dapat may laman ang gasWebAppUrl.\n\n' +
            'This site has no Apps Script URL configured, so nothing was posted and no email will be sent. Add the VITE_GAS_WEBAPP_URL secret and redeploy.'
        );
      }

      onSubmitSuccess({
        ...formData,
        submittedAtISO,
      });
    } catch (err) {
      console.error('Waiver submission failure:', err);
      alert(
        'We saved your waiver on this device but the server connection had a problem. Tap OK to continue; you can download your PDF from the next screen.'
      );
      onSubmitSuccess({
        ...formData,
        submittedAtISO,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" id="saheli-waiver-form" noValidate>
      <section
        className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/60 shadow-sm space-y-5"
        id="section-customer-profile"
        aria-labelledby="section-customer-profile-heading"
      >
        <div className="border-b border-neutral-100 pb-4">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block mb-1">
            Section I
          </span>
          <h2
            id="section-customer-profile-heading"
            className="text-base font-semibold text-neutral-900 tracking-tight"
          >
            Client information
          </h2>
          <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
            Legal name and contact details for your visit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div id="err-container-clientName" className="space-y-1.5 sm:col-span-2">
            <label htmlFor="clientName" className="block text-xs font-medium text-neutral-600">
              Full name <span className="text-red-500">*</span>
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
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 ${
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

          <div id="err-container-phoneNumber" className="space-y-1.5">
            <label htmlFor="phoneNumber" className="block text-xs font-medium text-neutral-600">
              Phone <span className="text-red-500">*</span>
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
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.phoneNumber
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-neutral-200 focus:border-neutral-900 focus:ring-neutral-100'
              }`}
              placeholder="(720) 123-4567"
            />
            {errors.phoneNumber ? (
              <p className="text-xs text-red-600" id="phoneNumber-error" role="alert">
                {errors.phoneNumber}
              </p>
            ) : null}
          </div>

          <div id="err-container-email" className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-neutral-600">
              Email <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => handleTextChange('email', e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.email
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-neutral-200 focus:border-neutral-900 focus:ring-neutral-100'
              }`}
              placeholder="you@example.com"
            />
            {errors.email ? (
              <p className="text-xs text-red-600" id="email-error" role="alert">
                {errors.email}
              </p>
            ) : (
              <p className="text-xs text-neutral-400">If provided, we validate the format.</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="dateOfBirth" className="block text-xs font-medium text-neutral-600">
              Date of birth <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <div className="flex flex-col gap-2 max-w-lg">
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={
                  /^\d{4}-\d{2}-\d{2}$/.test(formData.dateOfBirth.trim())
                    ? formData.dateOfBirth.trim().slice(0, 10)
                    : ''
                }
                onChange={(e) => handleTextChange('dateOfBirth', e.target.value)}
                className="w-full max-w-xs px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:border-neutral-900"
              />
              <input
                type="text"
                id="dateOfBirthText"
                name="dateOfBirthText"
                autoComplete="bday"
                value={formData.dateOfBirth}
                onChange={(e) => handleTextChange('dateOfBirth', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:border-neutral-900"
                placeholder="Or type your date (e.g. Jan 15, 1990, 03/15/1990, or any format you prefer)"
              />
            </div>
            <p className="text-xs text-neutral-400">
              Use the calendar to pick year/month/day, or type freely in the second field.
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="address" className="block text-xs font-medium text-neutral-600">
              Address <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={formData.address}
              onChange={(e) => handleTextChange('address', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:border-neutral-900 resize-y min-h-[88px]"
              placeholder="Street, city, state, ZIP"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="emergencyContactName" className="block text-xs font-medium text-neutral-600">
              Emergency contact name <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              id="emergencyContactName"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={(e) => handleTextChange('emergencyContactName', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:border-neutral-900"
              placeholder="Contact name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="emergencyContactPhone" className="block text-xs font-medium text-neutral-600">
              Emergency contact phone <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              inputMode="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => handleTextChange('emergencyContactPhone', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:border-neutral-900"
              placeholder="Phone"
            />
          </div>
        </div>
      </section>

      <section
        className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/60 shadow-sm space-y-5"
        id="section-treatment-selections"
        aria-labelledby="section-treatment-heading"
      >
        <div className="border-b border-neutral-100 pb-4">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block mb-1">
            Section II
          </span>
          <h2 id="section-treatment-heading" className="text-base font-semibold text-neutral-900 tracking-tight">
            Treatment type
          </h2>
          <p className="text-sm text-neutral-500 mt-1 leading-relaxed">Check all that apply.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none transition-colors ${
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
                  className="w-4 h-4 rounded border-neutral-300 accent-neutral-900 cursor-pointer shrink-0"
                />
                <span className="text-sm leading-snug">{service.label}</span>
              </label>
            );
          })}

          <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-3 pt-1">
            <label
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none self-start transition-colors ${
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
            {formData.services.others ? (
              <input
                type="text"
                id="services-others-details"
                value={formData.services.othersDetail}
                onChange={(e) => handleServiceChange('othersDetail', e.target.value)}
                placeholder="Please add detail for others"
                className="flex-1 px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 bg-white"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/60 shadow-sm space-y-5"
        id="section-skin-status"
        aria-labelledby="section-skin-heading"
      >
        <div className="border-b border-neutral-100 pb-4">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block mb-1">
            Section III
          </span>
          <h2 id="section-skin-heading" className="text-base font-semibold text-neutral-900 tracking-tight">
            Skin conditions
          </h2>
          <p className="text-sm text-neutral-500 mt-1 leading-relaxed">Check any that apply.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none transition-colors ${
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
                  className="w-4 h-4 rounded border-neutral-300 accent-neutral-900 cursor-pointer shrink-0"
                  id={`skin-cond-${cond.id}`}
                />
                <span className="text-sm leading-snug">{cond.label}</span>
              </label>
            );
          })}

          <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col sm:flex-row gap-3 pt-1">
            <label
              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none self-start transition-colors ${
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
            {formData.skinConditions.others ? (
              <input
                type="text"
                value={formData.skinConditions.othersDetail}
                onChange={(e) => handleSkinConditionChange('othersDetail', e.target.value)}
                placeholder="Please add detail for others"
                className="flex-1 px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 bg-white"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section
        className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/60 shadow-sm space-y-6"
        id="section-medical-questions"
        aria-labelledby="section-medical-heading"
      >
        <div className="border-b border-neutral-100 pb-4">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block mb-1">
            Section IV
          </span>
          <h2 id="section-medical-heading" className="text-base font-semibold text-neutral-900 tracking-tight">
            Medical disclosures
          </h2>
        </div>

        <div className="space-y-6">
          <fieldset id="err-container-medicalQuestions-takingMedications" className="space-y-3 border-0 p-0 m-0">
            <legend className="text-sm font-medium text-neutral-800 leading-relaxed px-0">
              Are you currently taking any medications (including topical)? <span className="text-red-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Medications">
              <button
                type="button"
                onClick={() => handleMedicalQuestionChange('takingMedications', true)}
                className={`px-5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
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
                className={`px-5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  formData.medicalQuestions.takingMedications === false
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                No
              </button>
            </div>
            {errors['medicalQuestions.takingMedications'] ? (
              <p className="text-xs text-red-600" role="alert">
                {errors['medicalQuestions.takingMedications']}
              </p>
            ) : null}
          </fieldset>

          <fieldset
            id="err-container-medicalQuestions-takingRetinolAccutane"
            className="space-y-3 border-0 p-0 m-0 pt-6 border-t border-neutral-100"
          >
            <legend className="text-sm font-medium text-neutral-800 leading-relaxed px-0">
              Are you currently taking any Retinol, Accutane, or Hydroquinone? <span className="text-red-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Retinol Accutane Hydroquinone">
              <button
                type="button"
                onClick={() => handleMedicalQuestionChange('takingRetinolAccutane', true)}
                className={`px-5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
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
                className={`px-5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  formData.medicalQuestions.takingRetinolAccutane === false
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                }`}
              >
                No
              </button>
            </div>
            {errors['medicalQuestions.takingRetinolAccutane'] ? (
              <p className="text-xs text-red-600" role="alert">
                {errors['medicalQuestions.takingRetinolAccutane']}
              </p>
            ) : null}
          </fieldset>
        </div>
      </section>

      <section
        className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/60 shadow-sm space-y-5"
        id="section-liability-terms"
        aria-labelledby="section-consent-heading"
      >
        <div className="border-b border-neutral-100 pb-4">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block mb-1">
            Section V
          </span>
          <h2 id="section-consent-heading" className="text-base font-semibold text-neutral-900 tracking-tight">
            Consent & acknowledgment
          </h2>
        </div>

        <blockquote className="border border-neutral-200 bg-neutral-50 rounded-xl p-4 sm:p-5 text-sm text-neutral-700 leading-relaxed not-italic">
          I understand that skincare treatments carry potential risks including, but not limited to, redness,
          irritation, and allergic reaction. I confirm that the above information is accurate to the best of my
          knowledge. I consent to the treatment(s) discussed and release the provider of any liability.
        </blockquote>

        <div id="err-container-acceptedTerms" className="space-y-2">
          <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-xl bg-white hover:bg-neutral-50/80 transition-colors cursor-pointer">
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
            <span className="text-sm font-medium text-neutral-800 leading-relaxed">
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
        className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/60 shadow-sm space-y-6"
        id="section-signature-seal"
        aria-labelledby="section-signature-heading"
      >
        <div className="border-b border-neutral-100 pb-4">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400 block mb-1">
            Section VI
          </span>
          <h2 id="section-signature-heading" className="text-base font-semibold text-neutral-900 tracking-tight">
            Signature & date
          </h2>
          <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
            Sign below, save your signature, then confirm the date and time.
          </p>
        </div>

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

        <div className="space-y-1.5 max-w-md">
          <label htmlFor="signature-date-picker" className="block text-xs font-medium text-neutral-600">
            Date / time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            id="signature-date-picker"
            value={selectedDateTime}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedDateTime(val);
              setFormData((prev) => ({
                ...prev,
                signatureDate: formatToReadableDateTime(val),
              }));
            }}
            className="w-full px-3.5 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-100 focus:border-neutral-900"
          />
        </div>
      </section>

      <div className="pt-2 flex flex-col items-stretch sm:items-center gap-3 max-w-md mx-auto w-full">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full text-center inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          id="submit-waiver-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin text-white" size={18} aria-hidden />
              Submitting…
            </>
          ) : (
            'Submit waiver'
          )}
        </button>
        <p className="text-xs text-neutral-500 text-center leading-relaxed">
          Submitting creates a PDF record and sends it when Google Apps Script is configured.
        </p>
      </div>
    </form>
  );
}
