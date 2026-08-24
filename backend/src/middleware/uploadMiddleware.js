import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".xlsx", ".xls"];

  const fileName = file.originalname.toLowerCase();

  const isAllowed = allowedExtensions.some((extension) =>
    fileName.endsWith(extension)
  );

  if (!isAllowed) {
    return cb(
      new Error("Only Excel files (.xlsx, .xls) are allowed")
    );
  }

  cb(null, true);
};

export const uploadExcel = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});