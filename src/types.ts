export interface ServiceSelection {
  threadingTinting: boolean;
  facial: boolean;
  chemicalPeel: boolean;
  waxing: boolean;
  eyelashExtensions: boolean;
  browLamination: boolean;
  microblading: boolean;
  powderBrow: boolean;
  lipBlush: boolean;
  lashEnhancement: boolean;
  others: boolean;
  othersDetail: string;
}

export interface SkinConditions {
  acne: boolean;
  rosacea: boolean;
  eczema: boolean;
  psoriasis: boolean;
  hyperpigmentation: boolean;
  sensitiveSkin: boolean;
  none: boolean;
  others: boolean;
  othersDetail: string;
}

export interface MedicalQuestions {
  takingMedications: boolean | null;
  takingRetinolAccutane: boolean | null;
}

/** Sent to Google Apps Script with each waiver POST (server can route email / Sheets). */
export interface WaiverSubmissionMeta {
  merchantSlug: string;
  waiverPageSlug: string;
  locationShortName: string;
  locationAddress: string;
  locationPhone: string;
  routePath: string;
}

/** Payload sent to Google Apps Script (includes PDF + metadata). */
export interface WaiverSubmissionPayload extends WaiverFormData {
  pdfBase64: string;
  pdfFilename: string;
  submittedAtISO: string;
  waiverMeta: WaiverSubmissionMeta;
}

export interface WaiverFormData {
  clientName: string;
  phoneNumber: string;
  email: string;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  services: ServiceSelection;
  skinConditions: SkinConditions;
  medicalQuestions: MedicalQuestions;
  acceptedTerms: boolean;
  signatureDate: string;
  /** PNG data URL (base64) — set after the client taps “Save signature”. */
  signatureImage: string;
  /** Set after successful submit (used for PDF download on success page). */
  submittedAtISO?: string;
}
