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
  /** One id per submit attempt; Apps Script ignores duplicate POSTs with the same id (stops double emails). */
  submissionId: string;
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
  /** Human-readable submission time (set when the waiver is submitted). */
  signatureDate: string;
  /** PNG data URL (base64); updated automatically as the client signs. */
  signatureImage: string;
  /** Set after successful submit (success screen / records). */
  submittedAtISO?: string;
}
