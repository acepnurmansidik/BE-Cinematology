const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { default: uniqueValidator } = require("mongoose-unique-validator");
const { model, Schema } = mongoose;

const AuthorSchema = new Schema(
  {
    slug: {
      type: String,
      minlength: [3, "Slug must be at least 3 characters long"],
      required: [true, "Slug is required!"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    avatar_id: {
      type: Schema.Types.ObjectId,
      ref: "Image",
      required: [false, "Avatar ID is required!"],
      default: null,
    },
    name: {
      type: String,
      minlength: [3, "Name must be at least 3 characters long"],
      required: [true, "Name is required!"],
      trim: true,
    },
    birth_date: {
      type: Date,
      required: [false, "Birth date is required!"],
    },
    country: { type: String, required: [false, "Country is required!"] },
    continent: { type: String, required: [false, "Continent is required!"] },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: false,
      default: "Other",
    }, // Boolean diubah ke String agar lebih jelas
    is_new: {
      type: Boolean,
      default: false,
    },
    is_delete: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
    collection: "authors", // Sebelumnya "genre"
  },
);

AuthorSchema.plugin(uniqueValidator, {
  message: "Author name must be unique!",
});

AuthorSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = globalService.createSlug(this.name);
  }
});

module.exports = model("Author", AuthorSchema); // Sebelumnya "Genre"
