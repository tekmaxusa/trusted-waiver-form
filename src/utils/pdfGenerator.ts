import { jsPDF } from 'jspdf';
import { WaiverFormData } from '../types';
import {publicAssetUrl} from './publicAsset';

type LogoLoad = { data: string; format: 'PNG' | 'JPEG' } | null;

/** Spa logo from `public/saheli-spa-logo.png` (same-origin; avoids CORS on GitHub Pages). */
async function loadPdfLogo_(): Promise<LogoLoad> {
  const urls = [publicAssetUrl('saheli-spa-logo.png')];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const ct = blob.type || '';
      const format: 'PNG' | 'JPEG' =
        ct.includes('jpeg') || ct.includes('jpg') ? 'JPEG' : 'PNG';
      const data = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = () => reject(new Error('read'));
        fr.readAsDataURL(blob);
      });
      return { data, format };
    } catch {
      continue;
    }
  }
  return null;
}

function safePdfFilenamePart(name: string): string {
  const t = (name || 'Client').trim() || 'Client';
  return t.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-') || 'Client';
}

export async function generateWaiverPDF(
  data: WaiverFormData,
  submittedAtISO?: string
): Promise<{ doc: jsPDF; filename: string }> {
  const logo = await loadPdfLogo_();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  let currentY = 20;

  const submitted = submittedAtISO
    ? new Date(submittedAtISO).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  const drawHeader = () => {
    const boxMm = 28;
    const boxTop = currentY;
    const boxLeft = marginX;

    doc.setFillColor(0, 0, 0);
    doc.rect(boxLeft, boxTop, boxMm, boxMm, 'F');

    if (logo) {
      try {
        const pad = 2.5;
        const inner = boxMm - pad * 2;
        doc.addImage(logo.data, logo.format, boxLeft + pad, boxTop + pad, inner, inner);
      } catch (e) {
        console.warn('PDF logo skipped', e);
      }
    }

    const textX = boxLeft + boxMm + 5;
    let textY = boxTop + 6;
    const textRight = pageWidth - marginX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(0, 0, 0);
    doc.text('Saheli Eyebrow Threading', textX, textY, { maxWidth: textRight - textX });
    textY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(178, 138, 71);
    doc.text('CLIENT INTAKE & LIABILITY WAIVER (CENTENNIAL)', textX, textY, { maxWidth: textRight - textX });
    textY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 113, 108);
    doc.text('10909 E Arapahoe Pl, Centennial, CO  |  (720) 630-8549', textX, textY, {
      maxWidth: textRight - textX,
    });
    textY += 5;

    const headerBottom = Math.max(boxTop + boxMm, textY) + 2;
    currentY = headerBottom;

    doc.setDrawColor(214, 211, 209);
    doc.setLineWidth(0.5);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 8;
  };

  drawHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CLIENT INFORMATION', marginX, currentY);
  currentY += 5;

  const labelX = marginX + 6;
  const valX = marginX + 34;
  const valW = pageWidth - 2 * marginX - (valX - marginX) - 6;
  const lh = 4.2;

  let ty = currentY + 6;
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(87, 80, 75);
    doc.text(label, labelX, ty);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(28, 25, 23);
    const lines = doc.splitTextToSize(value || '—', valW);
    doc.text(lines, valX, ty);
    ty += lines.length * lh + 3;
  };

  row('Full name:', data.clientName);
  row('Phone:', data.phoneNumber);
  row('Email:', data.email);
  row('DOB:', data.dateOfBirth);

  currentY = ty;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 80, 75);
  doc.text('Address:', marginX + 6, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(28, 25, 23);
  const addrLines = doc.splitTextToSize(data.address || '—', pageWidth - 2 * marginX - 28);
  doc.text(addrLines, marginX + 28, currentY);
  currentY += addrLines.length * lh + 4;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(87, 80, 75);
  doc.text('Emergency contact:', marginX + 6, currentY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(28, 25, 23);
  const ec =
    [data.emergencyContactName, data.emergencyContactPhone].filter(Boolean).join('  •  ') || '—';
  const ecLines = doc.splitTextToSize(ec, pageWidth - 2 * marginX - 42);
  doc.text(ecLines, marginX + 42, currentY);
  currentY += ecLines.length * lh + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. TREATMENT SELECTION', marginX, currentY);
  currentY += 5;

  const selectedServices: string[] = [];
  if (data.services.threadingTinting) selectedServices.push('Threading and Tinting');
  if (data.services.facial) selectedServices.push('Facial');
  if (data.services.chemicalPeel) selectedServices.push('Chemical Peel');
  if (data.services.waxing) selectedServices.push('Waxing');
  if (data.services.eyelashExtensions) selectedServices.push('Eyelash Extensions');
  if (data.services.browLamination) selectedServices.push('Brow Lamination');
  if (data.services.microblading) selectedServices.push('Microblading');
  if (data.services.powderBrow) selectedServices.push('Powder Brow');
  if (data.services.lipBlush) selectedServices.push('Lip Blush');
  if (data.services.lashEnhancement) selectedServices.push('Lash Enhancement');
  if (data.services.others) {
    selectedServices.push(`Others: ${data.services.othersDetail || 'Yes'}`);
  }
  if (selectedServices.length === 0) selectedServices.push('None selected');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(44, 40, 37);
  let sX = marginX + 5;
  let sY = currentY;
  selectedServices.forEach((service, idx) => {
    doc.text(`[X]  ${service}`, sX, sY);
    if ((idx + 1) % 2 === 0) {
      sX = marginX + 5;
      sY += 5;
    } else {
      sX = marginX + 85;
    }
  });
  currentY = sY + (selectedServices.length % 2 !== 0 ? 8 : 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. SKIN CONDITIONS', marginX, currentY);
  currentY += 5;

  const activeSkin: string[] = [];
  if (data.skinConditions.acne) activeSkin.push('Acne');
  if (data.skinConditions.rosacea) activeSkin.push('Rosacea');
  if (data.skinConditions.eczema) activeSkin.push('Eczema');
  if (data.skinConditions.psoriasis) activeSkin.push('Psoriasis');
  if (data.skinConditions.hyperpigmentation) activeSkin.push('Hyperpigmentation');
  if (data.skinConditions.sensitiveSkin) activeSkin.push('Sensitive Skin');
  if (data.skinConditions.none) activeSkin.push('None');
  if (data.skinConditions.others) {
    activeSkin.push(`Others: ${data.skinConditions.othersDetail || 'Yes'}`);
  }
  if (activeSkin.length === 0) activeSkin.push('None specified');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(44, 40, 37);
  let cX = marginX + 5;
  let cY = currentY;
  activeSkin.forEach((cond, idx) => {
    doc.text(`[X]  ${cond}`, cX, cY);
    if ((idx + 1) % 2 === 0) {
      cX = marginX + 5;
      cY += 5;
    } else {
      cX = marginX + 85;
    }
  });
  currentY = cY + (activeSkin.length % 2 !== 0 ? 8 : 4);

  if (currentY > pageHeight - 95) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. MEDICAL DISCLOSURES', marginX, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 80, 75);
  const q1 = 'Currently taking any medications (including topical)?';
  doc.text(q1, marginX + 5, currentY);
  doc.setFont('helvetica', 'bold');
  if (data.medicalQuestions.takingMedications === true) {
    doc.setTextColor(180, 83, 9);
    doc.text('[ YES ]', pageWidth - marginX - 18, currentY);
  } else if (data.medicalQuestions.takingMedications === false) {
    doc.setTextColor(22, 101, 52);
    doc.text('[ NO ]', pageWidth - marginX - 18, currentY);
  } else {
    doc.setTextColor(120, 113, 108);
    doc.text('[ UNANSWERED ]', pageWidth - marginX - 30, currentY);
  }

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(87, 80, 75);
  const q2 = 'Currently taking Retinol, Accutane, or Hydroquinone?';
  doc.text(q2, marginX + 5, currentY);
  doc.setFont('helvetica', 'bold');
  if (data.medicalQuestions.takingRetinolAccutane === true) {
    doc.setTextColor(180, 83, 9);
    doc.text('[ YES ]', pageWidth - marginX - 18, currentY);
  } else if (data.medicalQuestions.takingRetinolAccutane === false) {
    doc.setTextColor(22, 101, 52);
    doc.text('[ NO ]', pageWidth - marginX - 18, currentY);
  } else {
    doc.setTextColor(120, 113, 108);
    doc.text('[ UNANSWERED ]', pageWidth - marginX - 30, currentY);
  }
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('5. CONSENT & ACKNOWLEDGMENT', marginX, currentY);
  currentY += 5;

  const termsText =
    'I understand that skincare treatments carry potential risks including, but not limited to, ' +
    'redness, irritation, and allergic reaction. I confirm that the above information is accurate ' +
    'to the best of my knowledge. I consent to the treatment(s) discussed and release the provider of any liability.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(68, 64, 60);
  const splitTerms = doc.splitTextToSize(termsText, pageWidth - 2 * marginX);
  doc.text(splitTerms, marginX, currentY);
  currentY += splitTerms.length * 4.2 + 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(data.acceptedTerms ? 'Client accepted: YES' : 'Client accepted: NO', marginX, currentY);
  currentY += 8;

  doc.setDrawColor(231, 229, 228);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('6. SIGNATURE & SUBMISSION', marginX, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 80, 75);
  doc.text('Submission recorded:', marginX + 5, currentY);
  doc.setTextColor(28, 25, 23);
  doc.text(submitted, marginX + 42, currentY);
  currentY += 5;
  doc.setTextColor(87, 80, 75);
  doc.text('Verification date & time (client-selected):', marginX + 5, currentY);
  doc.setTextColor(28, 25, 23);
  const sigDateLines = doc.splitTextToSize(data.signatureDate || '—', pageWidth - marginX - 62);
  doc.text(sigDateLines, marginX + 62, currentY);
  currentY += Math.max(5, sigDateLines.length * 4.2);
  currentY += 2;

  if (data.signatureImage) {
    try {
      doc.setFillColor(250, 249, 246);
      doc.roundedRect(marginX + 5, currentY, 80, 32, 1, 1, 'F');
      doc.addImage(data.signatureImage, 'PNG', marginX + 7, currentY + 2, 76, 28);
    } catch (e) {
      console.error('Signature drawing exception:', e);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text('[Signature image could not be embedded]', marginX + 10, currentY + 15);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text('[ Signature missing ]', marginX + 10, currentY + 15);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 80, 75);
  doc.text('Printed name:', marginX + 96, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(28, 25, 23);
  doc.text(data.clientName || '—', marginX + 118, currentY + 10);

  currentY += 40;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(168, 162, 158);
  doc.text(
    'Electronic intake record — Centennial location. Filename uses the client name for filing.',
    marginX,
    pageHeight - 12
  );

  const filename = `Saheli-Waiver-Centennial-${safePdfFilenamePart(data.clientName)}.pdf`;

  return { doc, filename };
}
