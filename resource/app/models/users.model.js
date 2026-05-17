const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const SysUserModel = Schema(
  {
    auth_id: {
      type: mongoose.Types.ObjectId,
      ref: "sys_auth_user",
      require: true,
      unique: true,
    },
    name: {
      type: String,
      minlength: [3, "Panjang name minimal 3 karakter"],
      required: [true, "Name can't be empty"],
    },

    role_id: {
      type: mongoose.Types.ObjectId,
      ref: "Role",
      require: true,
    },
    device_token: {
      type: String,
      required: [false, "Device token can't be empty"],
      default: "",
    },

    // Menyimpan ringkasan status langganan saat ini untuk akses cepat
    subscription_info: {
      subscription_id: { type: Schema.Types.ObjectId, ref: "Subscription" },
      plan_id: { type: Schema.Types.ObjectId, ref: "Plan" },
      status: {
        type: String,
        enum: ["active", "expired", "none"],
        default: "none",
      },
      end_date: { type: Date, required: false },
    },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
    collection: "users",
  },
);

module.exports = model("User", SysUserModel);
