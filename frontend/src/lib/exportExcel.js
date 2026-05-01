import * as XLSX from 'xlsx';

/**
 * Export an array of objects to an Excel file and trigger a download.
 *
 * Why this lives in /lib instead of in each page:
 * Three pages need export, each with different columns. Centralizing here means
 * one consistent UX (filename pattern, sheet styling, error handling) and one
 * place to fix bugs. Pages just declare their columns and pass the data.
 *
 * @param {Object} options
 * @param {string} options.filename       — base name (without extension); a date suffix is appended
 * @param {string} options.sheetName      — Excel sheet tab name (max 31 chars per Excel limits)
 * @param {Array}  options.rows           — array of source records
 * @param {Array}  options.columns        — column definitions:
 *                                          [{ header: 'Name', accessor: 'name' | (row) => value, width?: number }]
 *
 * Examples of accessor:
 *   accessor: 'name'                       → row.name
 *   accessor: (r) => r.team?.name || ''    → safe nested lookup
 *   accessor: (r) => formatCurrency(r.fee) → formatted output
 */
export const exportToExcel = ({ filename, sheetName = 'Sheet1', rows, columns }) => {
  if (!rows || rows.length === 0) {
    throw new Error('No data to export');
  }

  // Build the data matrix: first row is headers, rest are values
  const headers = columns.map((c) => c.header);

  const data = rows.map((row) =>
    columns.map((col) => {
      const value =
        typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor];
      // Excel doesn't like undefined/null — coerce to empty string
      if (value === null || value === undefined) return '';
      // Date objects → keep as Date so Excel renders them as dates, not strings
      if (value instanceof Date) return value;
      // Numbers stay numeric so Excel can sum/average them
      if (typeof value === 'number') return value;
      return String(value);
    })
  );

  // Convert to sheet
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Apply column widths — either explicit or auto from longest cell
  sheet['!cols'] = columns.map((col, i) => {
    if (col.width) return { wch: col.width };
    const longest = Math.max(
      col.header.length,
      ...data.map((r) => String(r[i] ?? '').length)
    );
    return { wch: Math.min(Math.max(longest + 2, 10), 40) };
  });

  // Sheet name has a 31-char limit
  const safeSheetName = sheetName.slice(0, 31);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName);

  // Build filename: dashboard-registrations-2026-04-30.xlsx
  const dateSuffix = new Date().toISOString().split('T')[0];
  const finalName = `${filename}-${dateSuffix}.xlsx`;

  // writeFile triggers browser download in the SPA context
  XLSX.writeFile(workbook, finalName);

  return finalName;
};
