/**
 * One waiver entry point (e.g. TrustedWaiver-style path segment).
 * Merchants add new rows here or in their own module + registry.
 */
export interface WaiverLocationConfig {
  /** URL path segment, e.g. `sahelieyebrow` */
  merchantSlug: string;
  /** Second path segment, e.g. `waiver-from-centennial-location` */
  waiverPageSlug: string;
  /** Human label, e.g. "Centennial Location" (TrustedWaiver page titles) */
  locationDisplayName: string;
  /** Used in email subject: "New Waiver Submission - [this] - Name" */
  emailSubjectLocation: string;
  addressLine: string;
  phone: string;
  /** <title> and browser tab */
  documentTitle: string;
  /** One line under the main H1 (plain text) */
  formIntroLine: string;
  /** Small line under brand in sticky header */
  headerTagline: string;
  /** Footer line above copyright */
  footerLocationLine: string;
}
