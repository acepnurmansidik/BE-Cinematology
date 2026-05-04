const { Schema, model } = require("mongoose");

const PlanSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Plan name is required"],
      unique: true,
      trim: true,
    },
    price: {
      type: Number, // Diubah dari varchar ke number untuk kalkulasi
      required: [true, "Price is required"],
      min: 0,
    },
    duration_days: {
      type: Number,
      required: [true, "Duration in days is required"],
    },
    features: {
      type: [String], // AOS (Array of Strings)
      default: [],
    },
    active_screens: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true, collection: "plans", versionKey: false },
);

module.exports = model("Plan", PlanSchema);
