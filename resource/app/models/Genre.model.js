const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const GenreSchema = new Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug is required!"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Name is required!"],
      trim: true,
    },
    is_new: {
      type: Boolean,
      default: false,
    },
    is_adult: {
      type: Boolean,
      default: false,
    },
    is_delete: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Menggunakan timestamps: true akan otomatis membuat createdAt dan updatedAt
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
    collection: "genres",
  },
);

/**
 * 🔥 Perbaikan ERR_REQUIRE_ESM
 * Menggunakan Dynamic Import agar CommonJS dapat membaca package ESM
 */
import("mongoose-unique-validator")
  .then((module) => {
    const uniqueValidator = module.default;
    GenreSchema.plugin(uniqueValidator, {
      message: "Name must be unique!",
    });
  })
  .catch((err) => {
    console.error("❌ Gagal memuat mongoose-unique-validator:", err);
  });

// --- MIDDLEWARE / HOOKS ---
// Digunakan untuk otomatisasi pembuatan slug sebelum validasi data
GenreSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    // Memastikan globalService.createSlug tersedia dan bekerja dengan baik
    this.slug = globalService.createSlug(this.name);
  }
  next();
});

// --- EXPORT MODEL ---
// Cukup ekspor satu kali saja
module.exports = model("Genre", GenreSchema);
