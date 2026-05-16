const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const AuthModel = Schema(
  {
    username: {
      type: String,
      minlength: [3, "Panjang username minimal 3 karakter"],
      maxLength: [20, "Panjang username maksimal 20 karakter"],
      required: [true, "Username harus diisi"],
    },
    email: {
      type: String,
      minlength: [3, "Panjang email minimal 3 karakter"],
      required: [true, "Email harus diisi"],
    },
    password: {
      type: String,
      minlength: [3, "Panjang password minimal 3 karakter"],
      required: [true, "password harus diisi"],
    },
    is_delete: {
      type: Boolean,
      default: false,
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
    collection: "auth_users",
  },
);

module.exports = model("AuthUser", AuthModel);
