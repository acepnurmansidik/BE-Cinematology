const { Schema, model } = require("mongoose");

const SubscriptionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan ID is required"],
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "pending"],
      required: true,
      default: "pending",
    },
    start_date: {
      type: Date,
      required: false,
    },
    end_date: {
      type: Date,
      required: false,
    },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "subscriptions",
  },
);

module.exports = model("Subscription", SubscriptionSchema);
