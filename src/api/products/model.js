import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reviewSchema = new Schema({
  comment: { type: String, required: true },
  rate: { type: Number, required: true, max: 5 },
});

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    imageUrl: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },

    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
);

export default model("Product", productSchema);
