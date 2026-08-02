const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '../rental-agreement-template.pdf');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// pdftotext bbox uses y=0 at top; pdf-lib uses y=0 at bottom.
// Conversion: pdf_y = PAGE_H - pdftotext_yMax
const PAGE_H = 792;
const py = (ptY) => PAGE_H - ptY;

const safePDFDate = (val) => {
  if (!val) return 'N/A';
  try {
    // DATE-only strings (YYYY-MM-DD) parsed as local noon to avoid UTC midnight drift
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(y, m - 1, d, 12, 0, 0);
      if (isNaN(date.getTime())) return 'N/A';
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day   = String(date.getDate()).padStart(2, '0');
      const year  = String(date.getFullYear()).slice(-2);
      return `${month}/${day}/${year}`;
    }
    const date = val instanceof Date ? val : new Date(String(val));
    if (isNaN(date.getTime())) return 'N/A';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    const year  = String(date.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
  } catch (e) {
    return 'N/A';
  }
};

const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const $ = (v) => (v != null && v !== '') ? Number(v).toFixed(2) : '';
const s = (v) => (v != null && v !== '') ? String(v) : '';

// ─── GENERATE FILLED AGREEMENT (pages 1+2 filled, pages 3-12 unchanged, page 13 blank) ───

async function generateRentalAgreement(booking, car) {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sz = 9;
  const black = rgb(0, 0, 0);

  const draw = (page, text, x, y, size = sz, color = black, fnt = font) => {
    if (!text) return;
    page.drawText(String(text), { x, y, size, font: fnt, color });
  };

  const pages = pdfDoc.getPages();
  const p1 = pages[0];
  const p2 = pages[1];

  // ── PAGE 1 ──────────────────────────────────────────────────────────────────

  // Row: Renter Name / Driver's License No. (pdftotext yMax=285.45 → pdf-lib y=506.55)
  draw(p1, booking.customer_full_name,  124, py(285.45));
  draw(p1, s(booking.dl_number),        416, py(285.45));

  // Row: License State / License Expiration / Date of Birth (yMax=314.45 → 477.55)
  draw(p1, s(booking.dl_state),                    125, py(314.45));
  draw(p1, safePDFDate(booking.dl_expiration),          273, py(314.45));
  draw(p1, safePDFDate(booking.customer_dob),           431, py(314.45));

  // Row: Address (yMax=343.45 → 448.55)
  draw(p1, s(booking.customer_address), 100, py(343.45));

  // Row: Phone / Email (yMax=372.47 → 419.53)
  draw(p1, s(booking.customer_phone),    91, py(372.47));
  draw(p1, s(booking.customer_email),   293, py(372.47));

  // Row: Vehicle / Year/Make/Model (yMax=401.47 → 390.53)
  draw(p1, `${car.make} ${car.model}`,   95, py(401.47));
  draw(p1, `${car.year} ${car.make} ${car.model}`, 369, py(401.47));

  // Row: License Plate / VIN (yMax=430.47 → 361.53)
  draw(p1, s(car.license_plate), 124, py(430.47));
  draw(p1, s(car.vin_number),    239, py(430.47));

  // Row: Rental Start Date/Time / Odometer Out (yMax=459.5 → 332.5)
  draw(p1, `${safePDFDate(booking.pickup_date)} ${fmtTime(booking.pickup_time)}`, 167, py(459.5));
  draw(p1, booking.odometer_at_pickup != null ? String(booking.odometer_at_pickup) : '', 398, py(459.5));

  // Row: Designated Return Date/Time / Fuel Level Out (yMax=488.5 → 303.5)
  draw(p1, `${safePDFDate(booking.return_date)} ${fmtTime(booking.return_time)}`, 200, py(488.5));
  draw(p1, s(booking.fuel_level_at_pickup), 433, py(488.5));

  // Row: Daily Rate / Mileage Cap / Overage Rate (yMax=517.52 → 274.48)
  draw(p1, $(booking.daily_rate),                110, py(517.52));
  draw(p1, car.mileage_cap_per_day ? String(car.mileage_cap_per_day) : '', 243, py(517.52));
  draw(p1, car.overage_rate_per_mile ? $(car.overage_rate_per_mile) : '', 423, py(517.52));

  // Row: Additional Driver Fee (yMax=546.52 → 245.48)
  draw(p1, car.additional_driver_fee_per_day ? $(car.additional_driver_fee_per_day) : '0.00', 161, py(546.52));

  // Row: Deposit Held / Payment Method (yMax=575.52 → 216.48)
  draw(p1, $(booking.deposit_amount), 122, py(575.52));
  draw(p1, 'Card',                    277, py(575.52));

  // Cancellation Policy line 2 — blank is for cancellation fee (yMax=627.55 → 164.45)
  draw(p1, car.cancellation_fee ? $(car.cancellation_fee) : '0.00', 232, py(627.55));

  // Insurance Company (yMax=698.575 → 93.43)
  draw(p1, s(booking.insurance_company), 156, py(698.575));

  // Policy No. (yMax=727.575 → 64.43)
  draw(p1, s(booking.insurance_policy_number), 109, py(727.575));

  // ── PAGE 2 ──────────────────────────────────────────────────────────────────

  // Row: Policy Expiration Date / Liability Limits (pdftotext yMax=65.63 → pdf-lib 726.37)
  draw(p2, safePDFDate(booking.insurance_policy_expiration), 166, py(65.63));
  draw(p2, s(booking.insurance_liability_limits),        334, py(65.63));

  // Row: Covers Rental Vehicles checkboxes (yMax=95.88 → 696.12)
  // Checkbox positions: Yes box at x≈173, No box at x≈210, Unknown box at x≈242
  const covers = (booking.insurance_covers_rental || '').toLowerCase();
  const coversY = py(95.88) + 1;
  if (covers === 'yes')         draw(p2, 'X', 175, coversY, 8);
  else if (covers === 'no')     draw(p2, 'X', 212, coversY, 8);
  else                          draw(p2, 'X', 244, coversY, 8);

  // ── SAVE ────────────────────────────────────────────────────────────────────

  const filename = `rental-agreement-${booking.id}.pdf`;
  const outputPath = path.join(UPLOADS_DIR, filename);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  return filename;
}

// ─── ADD CUSTOMER SIGNATURE TO PAGE 13 ───────────────────────────────────────

async function addCustomerSignature(bookingId, signatureName, signedAt) {
  const filename = `rental-agreement-${bookingId}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const existingBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(existingBytes);

  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const sigColor = rgb(0, 0, 0.45);
  const black    = rgb(0, 0, 0);

  const p13 = pdfDoc.getPages()[12];

  const dateStr = new Date(signedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  // Renter Signature — on the first underline (yMax=85.13 → pdf-lib y=706.87)
  p13.drawText(signatureName, { x: 56, y: py(85.13), size: 13, font: fontBold, color: sigColor });

  // Print Name — on the second underline (yMax=118.15 → pdf-lib y=673.85)
  p13.drawText(signatureName, { x: 56, y: py(118.15), size: 10, font, color: black });

  // Date — between "Date" label (ends 131.65) and "AUTHORIZED DRIVER" (starts 157.5)
  // Estimated graphical line at pdftotext y≈145
  p13.drawText(dateStr, { x: 56, y: py(148), size: 10, font, color: black });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
  return filename;
}

// ─── ADD ADMIN SIGNATURE TO PAGE 13 ─────────────────────────────────────────

async function addAdminSignature(bookingId, adminName, adminTitle, signedAt) {
  const filename = `rental-agreement-${bookingId}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const existingBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(existingBytes);

  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const sigColor = rgb(0, 0, 0.45);
  const black    = rgb(0, 0, 0);

  const p13 = pdfDoc.getPages()[12];

  const dateStr = new Date(signedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  // Company Rep Signature — on the first underline (yMax=339.2 → pdf-lib y=452.8)
  p13.drawText(adminName, { x: 56, y: py(339.2), size: 13, font: fontBold, color: sigColor });

  // Print Name & Title — on the second underline (yMax=372.22 → pdf-lib y=419.78)
  p13.drawText(`${adminName}, ${adminTitle}`, { x: 56, y: py(372.22), size: 10, font, color: black });

  // Date — on the third underline (yMax=405.22 → pdf-lib y=386.78)
  p13.drawText(dateStr, { x: 56, y: py(405.22), size: 10, font, color: black });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
  return filename;
}

module.exports = { generateRentalAgreement, addCustomerSignature, addAdminSignature };
