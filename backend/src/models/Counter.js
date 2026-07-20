import mongoose from 'mongoose';

/** Atomic named sequences (e.g. per-year request references). */
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

/** Returns the next value for a named counter, creating it at 1 on first use. */
counterSchema.statics.next = async function next(name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
};

export const Counter = mongoose.model('Counter', counterSchema);
