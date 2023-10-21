const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let BuildingSchema = new Schema({
  id: { type: String, required: true, index: true, unique: true },
  name: { type: String, required: true, minlength: 1, maxlength: 200 },
  occupancy: { type: Number, required: true, min: 1, max: 9999 },
  type: { type: String, required: true, enum: [
    'R-$', 'R-$$', 'R-$$$',
    'CS-$', 'CS-$$', 'CS-$$$',
    'CO-$$', 'CO-$$$',
    'I-AG', 'I-D', 'I-M', 'I-HT'
  ] },
  tiles: [{
    type: String, required: true, enum: [
      '1x1', '1x2', '1x3', '1x4',
      '2x1', '2x2', '2x3', '2x4',
      '3x1', '3x2', '3x3', '3x4',
      '4x1', '4x2', '4x3', '4x4'
    ]
  }],
  style: { type: String, required: true, enum: [
    'None', '1890 Chicago', '1940 New York', '1990 Houston', 'Euro Contemporary'
  ] },
  lastUpdated: { type: Date, default: Date.now() },
  image: { type: String, required: false, minlength: 0, maxlength: 1000000 }
});

let PendingDeletionSchema = new Schema({
  building: { type: Schema.Types.ObjectId, ref: 'Building' },
  name: { type: String, required: true, minlength: 1, maxlength: 200 },
  submittedDate: { type: Date, default: Date.now() }
});

module.exports = {
  building: BuildingSchema,
  pendingAddition: BuildingSchema,
  pendingDeletion: PendingDeletionSchema
};
