import multer from 'multer';

/**
 * Multer config for bulk-import uploads.
 *
 * - In-memory storage: parser reads from buffer directly, no temp files on disk
 * - 5MB limit: more than enough for thousands of rows; keeps DOS surface small
 * - Whitelist .xlsx, .xls, .csv only (by extension AND mimetype) so users can't
 *   upload arbitrary binaries that happen to land in the parser
 */
const ALLOWED_EXTS = /\.(xlsx|xls|csv)$/i;
const ALLOWED_MIMETYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                          // .xls
  'text/csv',
  'application/csv',
  'text/plain',          // some browsers send this for .csv
  'application/octet-stream', // some browsers / curl fallback
]);

const fileFilter = (req, file, cb) => {
  const extOk = ALLOWED_EXTS.test(file.originalname);
  const mimeOk = ALLOWED_MIMETYPES.has(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Only .xlsx, .xls, or .csv files are allowed'));
};

export const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
}).single('file'); // form field name = "file"

/**
 * Wrap multer to convert its error format into our standard JSON error shape.
 * Without this, multer's MulterError would bubble up as a 500 from our error handler.
 */
export const uploadWithErrorHandling = (req, res, next) => {
  uploadSpreadsheet(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    next();
  });
};
