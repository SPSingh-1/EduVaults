const mongoose = require('mongoose');

const DocumentMetadataSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  ownerId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  contentType: { type: String, required: true },
  filePath: { type: String, required: true }, // Local or Cloud Storage URI
  documentType: { type: String, enum: ['REPORT_CARD_PDF', 'HOMEWORK_SUBMISSION', 'ADMISSION_DOC'], required: true },
  uploadDate: { type: Date, default: Date.now }
});

DocumentMetadataSchema.index({ ownerId: 1, documentType: 1 });

module.exports = mongoose.model('DocumentMetadata', DocumentMetadataSchema);
