const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const ReffparamModel = new Schema(
  {
    key: { type: Number },
    value: {
      type: String,
      required: [true, "Value is required"],
      unique: true,
    },
    type: {
      type: String,
      required: [true, "Type is required"], // Sebelumnya "password harus diisi"
    },
    description: {
      type: String,
      required: [true, "Description is required"], // Sebelumnya "password harus diisi"
    },
    is_delete: { type: Boolean, default: false },
    icon_id: { type: Schema.Types.ObjectId, ref: "Image", default: null },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "ReffParameter",
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
    collection: "reff_parameters",
  },
);

module.exports = model("ReffParameter", ReffparamModel);
