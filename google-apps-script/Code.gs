/**
 * Saheli Centennial — Waiver webhook (Google Apps Script)
 *
 * Deploy: Deploy → New deployment → Web app
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * IMPORTANT: After ANY edit here, use Deploy → Manage deployments → Edit → New version → Deploy.
 *
 * Waiver email is sent with MailApp (more reliable with large PDFs). Labeling uses GmailApp + a
 * unique (ref …) token in the subject so the thread can be found and tagged, then archived out
 * of Primary Inbox when GMAIL_WAIVER_MOVE_OUT_OF_INBOX is true (waivers show under your label).
 *
 * NOTIFICATION_EMAIL: receives each waiver (HTML + PDF). This is NOT the same as Google's
 * "Security alert" email when you authorize the script — that one is automatic from Google.
 *
 * SPREADSHEET_ID: optional. Leave '' if this project was created from the Sheet (Extensions → Apps Script).
 */
var NOTIFICATION_EMAIL = 'sahelieyebrowco@gmail.com';
var SPREADSHEET_ID = '';
/**
 * Gmail label for each waiver notification. Name appears in your Labels list once a message is tagged.
 * Script searches Inbox first, then Sent (same Google account as Web App "Execute as: Me").
 * If NOTIFICATION_EMAIL is a different account, that inbox cannot be labeled by this script — use a filter there instead.
 */
var GMAIL_LABEL_WAIVER = 'Centennial Location';
/**
 * If true, after labeling the waiver thread it is removed from the Inbox (archived).
 * Mail stays under your custom label + "All Mail" — Primary inbox stays cleaner.
 * Set false if you want waivers to stay in Inbox AND show the label.
 */
var GMAIL_WAIVER_MOVE_OUT_OF_INBOX = true;

function escapeHtml_(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function yn_(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '—';
}

function emergencyLine_(postData) {
  var name = (postData.emergencyContactName || '').trim();
  var phone = (postData.emergencyContactPhone || '').trim();
  if (!name && !phone) return '';
  if (name && phone) return name + ' — ' + phone;
  return name || phone;
}

function locationLineFromMeta_(postData) {
  var m = postData.waiverMeta || {};
  if (!m.locationShortName && !m.locationAddress) return '—';
  var s = m.locationShortName || '';
  if (m.locationAddress) s = (s ? s + ' — ' : '') + m.locationAddress;
  if (m.locationPhone) s += (s ? ' • ' : '') + m.locationPhone;
  return s || '—';
}

function humanServices_(svc) {
  if (!svc) return '—';
  var L = {
    threadingTinting: 'Threading and Tinting',
    facial: 'Facial',
    chemicalPeel: 'Chemical Peel',
    waxing: 'Waxing',
    eyelashExtensions: 'Eyelash Extensions',
    browLamination: 'Brow Lamination',
    microblading: 'Microblading',
    powderBrow: 'Powder Brow',
    lipBlush: 'Lip Blush',
    lashEnhancement: 'Lash Enhancement',
  };
  var parts = [];
  for (var k in L) {
    if (Object.prototype.hasOwnProperty.call(L, k) && svc[k] === true) {
      parts.push(L[k]);
    }
  }
  if (svc.others === true) {
    parts.push(svc.othersDetail ? 'Others: ' + svc.othersDetail : 'Others');
  }
  return parts.length ? parts.join(', ') : '—';
}

function humanSkin_(sc) {
  if (!sc) return '—';
  var L = {
    acne: 'Acne',
    rosacea: 'Rosacea',
    eczema: 'Eczema',
    psoriasis: 'Psoriasis',
    hyperpigmentation: 'Hyperpigmentation',
    sensitiveSkin: 'Sensitive Skin',
    none: 'None',
  };
  var parts = [];
  for (var k in L) {
    if (Object.prototype.hasOwnProperty.call(L, k) && sc[k] === true) {
      parts.push(L[k]);
    }
  }
  if (sc.others === true) {
    parts.push(sc.othersDetail ? 'Others: ' + sc.othersDetail : 'Others');
  }
  return parts.length ? parts.join(', ') : '—';
}

/**
 * Tags the waiver thread using (ref TOKEN) in the subject. Works after MailApp or GmailApp send.
 * Returns true if labeled. When GMAIL_WAIVER_MOVE_OUT_OF_INBOX is true, removes thread from Inbox
 * so it appears under your custom label (and All Mail), not only Primary inbox.
 */
function applyWaiverGmailLabel_(waiverRef) {
  var labelName = GMAIL_LABEL_WAIVER || 'Centennial Location';
  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }

  function maybeArchiveThread_(thread) {
    if (typeof GMAIL_WAIVER_MOVE_OUT_OF_INBOX === 'undefined' || !GMAIL_WAIVER_MOVE_OUT_OF_INBOX) {
      return;
    }
    try {
      thread.moveToArchive();
    } catch (archErr) {
      Logger.log('moveToArchive: ' + archErr);
    }
    try {
      var inboxLab = GmailApp.getInboxLabel();
      if (inboxLab) {
        thread.removeLabel(inboxLab);
      }
    } catch (inbErr) {
      Logger.log('removeLabel Inbox: ' + inbErr);
    }
    Logger.log('Waiver thread removed from Primary Inbox (still under label + All Mail).');
  }

  var token = String(waiverRef || '').replace(/[^a-zA-Z0-9]/g, '');
  if (!token) {
    Logger.log('applyWaiverGmailLabel_: empty waiverRef');
    return false;
  }

  var needle = '(ref ' + token + ')';
  var toAddr = String(NOTIFICATION_EMAIL || '')
    .split(',')[0]
    .trim()
    .replace(/"/g, '');
  var queries = [];
  if (toAddr) {
    queries.push('to:' + toAddr + ' newer_than:1d "' + needle + '"');
  }
  queries.push('in:inbox newer_than:1d "' + needle + '"');
  queries.push('in:anywhere newer_than:1d "' + needle + '"');
  queries.push('newer_than:1d "' + needle + '"');

  for (var attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) {
      Utilities.sleep(2000);
    } else {
      Utilities.sleep(2200);
    }
    for (var q = 0; q < queries.length; q++) {
      var threads = GmailApp.search(queries[q], 0, 25);
      var bestThread = null;
      var bestTime = 0;
      for (var i = 0; i < threads.length; i++) {
        var msgs = threads[i].getMessages();
        for (var j = 0; j < msgs.length; j++) {
          var subj = msgs[j].getSubject() || '';
          if (subj.indexOf(needle) === -1) {
            continue;
          }
          var tm = msgs[j].getDate().getTime();
          if (tm >= bestTime) {
            bestTime = tm;
            bestThread = threads[i];
          }
        }
      }
      if (bestThread) {
        bestThread.addLabel(label);
        Logger.log('Gmail label applied for ' + labelName + ' ref=' + token + ' attempt=' + (attempt + 1));
        maybeArchiveThread_(bestThread);
        return true;
      }
    }
  }

  Logger.log(
    'Gmail label FAILED for ref=' +
      token +
      ' — Run saheliGmailLabelSmokeTest in editor (Gmail permission), redeploy web app, then check Executions.'
  );
  return false;
}

/** Sheet tab to log rows to. */
function getTargetSheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'No spreadsheet: create this script from your Google Sheet (Extensions → Apps Script), ' +
        'or set SPREADSHEET_ID at the top of Code.gs to your Sheet ID.'
    );
  }
  return ss.getActiveSheet();
}

/**
 * Run once from the Apps Script editor to trigger Gmail permission and create the waiver label.
 * After Run, check Gmail → Labels (or Settings → Labels) for "Centennial Location".
 */
function saheliGmailLabelSmokeTest() {
  var name = GMAIL_LABEL_WAIVER || 'Centennial Location';
  var L = GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
  Logger.log('Gmail label ready: ' + L.getName());
}

function doGet() {
  return ContentService.createTextOutput('Saheli waiver webhook: OK (use POST from the form).').setMimeType(
    ContentService.MimeType.TEXT
  );
}

/**
 * HTML body: waiver summary + optional inline signature via data URL (works with MailApp).
 * If signature is missing or too large for email clients, we show "see PDF" instead.
 */
function buildWaiverSummaryHtml_(postData, servicesLine, skinLine, mq, signatureDataUrl) {
  var consent =
    'I understand that skincare treatments carry potential risks including, but not limited to, redness, irritation, and allergic reaction. I confirm that the above information is accurate to the best of my knowledge. I consent to the treatment(s) discussed and release the provider of any liability.';

  var row = function (label, value) {
    return (
      '<tr><td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top;width:42%">' +
      '<strong style="color:#111;font-size:14px">' +
      escapeHtml_(label) +
      '</strong></td><td style="padding:10px 0;border-bottom:1px solid #eee;color:#444;font-size:14px">' +
      escapeHtml_(value) +
      '</td></tr>'
    );
  };

  var maxInline = 100000;
  var s = signatureDataUrl ? String(signatureDataUrl) : '';
  var useSig = s.length > 30 && s.length < maxInline && s.indexOf('base64') !== -1;

  var sigBlock = useSig
    ? '<tr><td colspan="2" style="padding:16px 0 8px"><strong style="color:#111;font-size:14px">Client signature</strong><br/>' +
      '<img src="' +
      s.replace(/"/g, '') +
      '" alt="Client signature" style="margin-top:10px;max-width:360px;height:auto;display:block;border:1px solid #ddd;border-radius:8px;background:#fafafa"/>' +
      '</td></tr>'
    : '<tr><td colspan="2" style="padding:12px 0;color:#666;font-size:13px">Signature is included in the attached PDF.</td></tr>';

  var extraRows = '';
  if ((postData.email || '').trim()) {
    extraRows += row('Email', postData.email);
  }
  if ((postData.dateOfBirth || '').trim()) {
    extraRows += row('Date of birth', postData.dateOfBirth);
  }
  if ((postData.address || '').trim()) {
    extraRows += row('Address', postData.address);
  }
  var ec = emergencyLine_(postData);
  if (ec) {
    extraRows += row('Emergency contact', ec);
  }

  var meta = postData.waiverMeta || {};
  var locShort = meta.locationShortName || 'Saheli salon';

  return (
    '<div style="font-family:Georgia,Times,serif;max-width:560px;margin:0 auto;padding:24px;color:#222">' +
    '<div style="text-align:center;margin-bottom:20px">' +
    '<p style="margin:0;font-size:20px;font-weight:600;letter-spacing:0.02em">Saheli Eyebrow Threading</p>' +
    '<p style="margin:4px 0 0;font-size:12px;color:#666">' +
    escapeHtml_(locShort) +
    ' — Client waiver</p></div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
    row('Client name', postData.clientName || '—') +
    row('Phone number', postData.phoneNumber || '—') +
    row('Salon / location', locationLineFromMeta_(postData)) +
    extraRows +
    row('Treatment type (check all that apply)', servicesLine) +
    row('Skin conditions (check any that apply)', skinLine) +
    row('Are you currently taking any medications (including topical)?', yn_(mq.takingMedications)) +
    row('Are you currently taking any Retinol, Accutane, Hydroquinone?', yn_(mq.takingRetinolAccutane)) +
    '<tr><td colspan="2" style="padding:16px 0 8px"><strong style="font-size:14px">Consent &amp; acknowledgment</strong></td></tr>' +
    '<tr><td colspan="2" style="padding:0 0 12px;color:#444;font-size:13px;line-height:1.5">' +
    escapeHtml_(consent) +
    '</td></tr>' +
    sigBlock +
    row('Date / time', postData.signatureDate || '—') +
    '</table>' +
    '<p style="margin-top:24px;font-size:11px;color:#999;text-align:center">Sent from Saheli Eyebrow waiver portal</p>' +
    '</div>'
  );
}

function doPost(e) {
  try {
    var postData;
    if (e && e.parameter && e.parameter.payload) {
      postData = JSON.parse(e.parameter.payload);
    } else if (e && e.postData && e.postData.contents) {
      var raw = String(e.postData.contents);
      if (raw.indexOf('payload=') === 0) {
        postData = JSON.parse(decodeURIComponent(raw.substring('payload='.length)));
      } else {
        postData = JSON.parse(raw);
      }
    } else {
      throw new Error('Empty POST body. Redeploy web app and use the latest waiver form.');
    }
    Logger.log('doPost ok parse client=' + (postData.clientName || '?'));

    var timestamp = new Date().toISOString();
    var clientName = postData.clientName || '';
    var phoneNumber = postData.phoneNumber || '';
    var email = postData.email || '';
    var dob = postData.dateOfBirth || '';
    var address = postData.address || '';
    var emergency = emergencyLine_(postData);

    var sheetWarn = '';
    try {
      var sheet = getTargetSheet_();

      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp',
          'Location',
          'Full Name',
          'Phone',
          'Email',
          'Date of Birth',
          'Address',
          'Emergency Contact',
          'Submission Status',
        ]);
      }

      var locCell = postData.waiverMeta && postData.waiverMeta.locationShortName ? postData.waiverMeta.locationShortName : '';

      sheet.appendRow([
        timestamp,
        locCell,
        clientName,
        phoneNumber,
        email,
        dob,
        address,
        emergency || '—',
        'Submitted',
      ]);
    } catch (sheetErr) {
      Logger.log('Sheet append failed (email will still try): ' + sheetErr);
      sheetWarn = '\n\n[Sheet error: ' + String(sheetErr) + ']';
    }

    var svc = postData.services || {};
    var sc = postData.skinConditions || {};
    var servicesLine = humanServices_(svc);
    var skinLine = humanSkin_(sc);
    var mq = postData.medicalQuestions || {};

    var waiverRef = Utilities.getUuid().replace(/-/g, '').substring(0, 14);
    var meta = postData.waiverMeta || {};
    var locForSubject = meta.locationShortName || 'Unknown Location';
    var subject = 'New Waiver Submission - ' + locForSubject + ' - ' + clientName + ' (ref ' + waiverRef + ')';

    var pdfBlob = null;
    if (postData.pdfBase64) {
      try {
        pdfBlob = Utilities.newBlob(
          Utilities.base64Decode(postData.pdfBase64),
          'application/pdf',
          postData.pdfFilename || 'Saheli-Waiver.pdf'
        );
      } catch (pdfErr) {
        Logger.log('PDF decode failed: ' + pdfErr);
      }
    }

    // Do not embed signature as data-URL in HTML (too large / Gmail may drop the message). PDF has the image.
    var htmlBody = buildWaiverSummaryHtml_(postData, servicesLine, skinLine, mq, '');

    var plainBody =
      'New waiver (' +
      locForSubject +
      ')\nClient: ' +
      clientName +
      '\nPhone: ' +
      phoneNumber +
      '\nTreatments: ' +
      servicesLine +
      '\nSkin: ' +
      skinLine +
      '\nSubmitted: ' +
      (postData.submittedAtISO || timestamp) +
      (pdfBlob ? '\n\nPDF is attached.' : '\n\n(PDF missing — check Apps Script execution log.)') +
      sheetWarn;

    var attachments = [];
    if (pdfBlob) {
      attachments.push(pdfBlob);
    }

    Logger.log('Sending waiver email (MailApp) to ' + NOTIFICATION_EMAIL + ' attachments=' + attachments.length + ' ref=' + waiverRef);

    var mailOpts = {
      to: NOTIFICATION_EMAIL,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: 'Saheli Eyebrow Waivers',
    };
    if (attachments.length) {
      mailOpts.attachments = attachments;
    }

    var mailSent = false;
    var sentSubject = subject;
    try {
      MailApp.sendEmail(mailOpts);
      mailSent = true;
    } catch (mailErr) {
      Logger.log('MailApp.sendEmail failed: ' + mailErr + ' — trying GmailApp');
      try {
        var gOpts = { htmlBody: htmlBody, name: 'Saheli Eyebrow Waivers' };
        if (attachments.length) {
          gOpts.attachments = attachments;
        }
        GmailApp.sendEmail(NOTIFICATION_EMAIL, subject, plainBody, gOpts);
        mailSent = true;
      } catch (gErr) {
        Logger.log('GmailApp.sendEmail failed: ' + gErr);
        try {
          sentSubject =
            'New Waiver Submission - Centennial - ' + clientName + ' (retry, no PDF) (ref ' + waiverRef + ')';
          MailApp.sendEmail({
            to: NOTIFICATION_EMAIL,
            subject: sentSubject,
            body: plainBody + '\n\nMail error: ' + String(mailErr) + ' | ' + String(gErr),
            name: 'Saheli Eyebrow Waivers',
          });
          mailSent = true;
        } catch (mailErr2) {
          throw new Error('Send failed (MailApp + GmailApp + retry): ' + String(mailErr2));
        }
      }
    }

    var labeled = false;
    if (mailSent) {
      try {
        labeled = applyWaiverGmailLabel_(waiverRef);
      } catch (labelErr) {
        Logger.log('applyWaiverGmailLabel_ failed (non-fatal): ' + labelErr + ' ' + (labelErr.stack || ''));
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        status: 'success',
        message: 'Logged and emailed.',
        labeled: labeled,
        waiverRef: waiverRef,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Run from the editor: verifies MailApp can reach NOTIFICATION_EMAIL.
 */
function saheliSendTestEmail() {
  MailApp.sendEmail({
    to: NOTIFICATION_EMAIL,
    subject: 'Saheli waiver — TEST',
    body: 'If you received this, MailApp is working. Also run saheliGmailLabelSmokeTest for Gmail/labels.',
    name: 'Saheli Eyebrow Waivers',
  });
}

/**
 * Paste your deployed Web App URL (ends with /exec), Run, then check inbox + Sheet + Executions.
 */
function saheliWebhookSelfTest() {
  /** Same URL as Web App deployment (update if you redeploy). */
  var url =
    'https://script.google.com/macros/s/AKfycbyqBl1-IxpJSOzzHEhwODgjiKleYsgtHQ-QRIyYA8Jye6Ogdjhx9C5Acy2nSgRGRU0U/exec';
  if (!url || url.indexOf('script.google.com') === -1) {
    throw new Error('Set var url in saheliWebhookSelfTest to your /exec URL.');
  }
  var minimal = {
    clientName: 'Webhook self-test',
    phoneNumber: '3035550199',
    email: '',
    dateOfBirth: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    services: {
      threadingTinting: false,
      facial: false,
      chemicalPeel: false,
      waxing: true,
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
      none: true,
      others: false,
      othersDetail: '',
    },
    medicalQuestions: { takingMedications: false, takingRetinolAccutane: false },
    acceptedTerms: true,
    signatureDate: String(new Date()),
    signatureImage: '',
    submittedAtISO: new Date().toISOString(),
  };
  var body = 'payload=' + encodeURIComponent(JSON.stringify(minimal));
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: body,
    muteHttpExceptions: true,
  });
  Logger.log('HTTP ' + resp.getResponseCode());
  Logger.log(resp.getContentText());
}

function doOptions() {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}
