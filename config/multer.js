const multer = require("multer");

// For in-memory upload (no saved files, useful for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
