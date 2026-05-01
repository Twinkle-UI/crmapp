import * as XLSX from 'xlsx';

/**
 * Parses an uploaded file buffer (xlsx, xls, or csv) into an array of plain objects.
 *
 * SheetJS handles both Excel and CSV with a single API — we just read the buffer,
 * pick the first sheet, and convert to JSON. This keeps the parsing layer uniform
 * regardless of source format, which means the rest of the import pipeline doesn't
 * need to care.
 *
 * Returns: { headers: string[], rows: object[] }
 *   - headers: column names exactly as they appear in row 1
 *   - rows: each row as { [header]: value }; empty rows are dropped
 *
 * Throws if the file is unparseable or empty.
 */
export const parseSpreadsheet = (buffer) => {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    throw new Error('Could not parse file. Please upload a valid .xlsx, .xls, or .csv file.');
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('File is empty — no sheets found.');

  const sheet = workbook.Sheets[firstSheetName];

  // defval: '' makes empty cells consistent (no `undefined` surprises later)
  // raw: false coerces dates and numbers to readable strings where appropriate
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (rows.length === 0) {
    throw new Error('File has no data rows. Make sure row 1 has headers and rows below have data.');
  }

  // Drop completely empty rows (every value is '' or whitespace)
  const filtered = rows.filter((row) =>
    Object.values(row).some((v) => String(v).trim() !== '')
  );

  if (filtered.length === 0) {
    throw new Error('All rows are empty after the header.');
  }

  const headers = Object.keys(filtered[0]);
  return { headers, rows: filtered };
};

/**
 * Generates a downloadable Excel template buffer with the given headers
 * and (optionally) one row of example values. Used by the "Download Template"
 * button on each bulk-import modal.
 */
export const generateTemplate = (headers, exampleRow = {}) => {
  const wb = XLSX.utils.book_new();
  const data = [headers];
  if (Object.keys(exampleRow).length > 0) {
    data.push(headers.map((h) => exampleRow[h] ?? ''));
  }
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Make header row visually distinct via column widths roughly proportional to header length
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Normalize a header string for fuzzy matching.
 * "Full Name " → "fullname", "phone_number" → "phonenumber"
 */
export const normalizeHeader = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[\s_\-.()]/g, '')
    .trim();

/**
 * Build a lookup that maps any of several header variants → canonical field name.
 * Used so the importer accepts "Phone", "phone", "Phone Number", "phone_number" all
 * as the same field.
 *
 * Usage:
 *   const map = buildHeaderMap({ name: ['Name', 'Full Name'], phone: ['Phone', 'Mobile'] });
 *   map.get(normalizeHeader('Mobile'))  // → 'phone'
 */
export const buildHeaderMap = (fieldVariants) => {
  const map = new Map();
  for (const [canonical, variants] of Object.entries(fieldVariants)) {
    for (const v of variants) {
      map.set(normalizeHeader(v), canonical);
    }
    // Also map the canonical key itself
    map.set(normalizeHeader(canonical), canonical);
  }
  return map;
};

/**
 * Convert a parsed row from raw spreadsheet keys → canonical field keys.
 * Unknown headers are ignored.
 */
export const remapRow = (row, headerMap) => {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = headerMap.get(normalizeHeader(key));
    if (canonical) out[canonical] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
};
