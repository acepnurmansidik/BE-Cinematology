const { Schema, model } = require("mongoose");

const PaymentHistorySchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscription_id: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    price: {
      type: Number, // Diubah dari varchar ke number
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending", "refunded"],
      default: "pending",
      required: true,
    },
    method: {
      type: String, // Contoh: 'credit_card', 'bank_transfer', 'e-wallet'
      required: true,
      default: "",
    },
    bank_name: {
      type: String,
      required: false,
      ddefault: "",
    },
    transaction_date: {
      type: Date,
      default: Date.now(),
    },
    expired_date: {
      type: Date,
      default: Date.now(),
    },
    payment_gateway_id: {
      type: String, // ID transaksi dari Midtrans/Stripe/Xendit
      default: null,
    },
    url_payment_success: {
      type: String, // ID transaksi dari Midtrans/Stripe/Xendit
      default: null,
    },
    url_payment_failed: {
      type: String, // ID transaksi dari Midtrans/Stripe/Xendit
      default: null,
    },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "payment_history",
  },
);

module.exports = model("PaymentHistory", PaymentHistorySchema);
