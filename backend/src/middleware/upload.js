import multer from 'multer';
import { storageLimits } from '../adapters/storage.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Buffers a single upload in memory, then the storage adapter validates and
 * persists it. Kept in memory (not on disk) so the app never trusts a path and
 * nothing lands on the local filesystem.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: storageLimits.maxSizeBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    // First gate; the adapter re-checks authoritatively before storing.
    if (storageLimits.allowedMime.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('UNSUPPORTED_FILE_TYPE', `Type not allowed: ${file.mimetype}`));
  },
});

export function singleFile(field = 'file') {
  const handler = upload.single(field);

  return (req, res, next) =>
    handler(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('FILE_TOO_LARGE', 'File exceeds the 5 MB limit'));
      }
      next(err);
    });
}
