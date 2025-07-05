import mongoose from 'mongoose';

const SubtypeSchema = new mongoose.Schema({
  _id: mongoose.Types.ObjectId,
  createdBy: String,

  subtypeName: String,
  testType: String,

  tests: Array,
  deletedTests: Array,

  createdAt: Number,
  updatedAt: Number,
  isDeleted: Boolean,
  // userId: { type: String, required: true },
  // typeOfTest: { type: String, required: true },
  // subtype: { type: String, required: true },
  // createdAt: { type: Number, required: true },
  // updatedAt: { type: Number, required: true },
  // isDeleted: { type: Boolean, required: true },
});

// const SUBTYPE_MODEL = 'subtype_tests';

// export { SUBTYPE_MODEL, SubtypeSchema };
