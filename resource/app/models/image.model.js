const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const ImageModel = Schema(
  {
    path: {
      type: String,
      required: [true, "Value harus diisi"],
    },
    status: {
      type: Boolean,
      default: false,
    },
    source_name: {
      type: String,
      required: [false, "Value harus diisi"],
    },
    source_id: {
      type: mongoose.Types.ObjectId,
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
    versionKey: false,
    collection: "images",
  },
);

module.exports = model("Image", ImageModel);
