const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const LogActionModel = Schema(
  {
    type: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE"],
    },
    target_id: {
      type: Schema.Types.ObjectId,
    },
    source: {
      type: String,
      default: "",
    },
    before: {
      type: Schema.Types.Mixed,
    },
    after: {
      type: Schema.Types.Mixed,
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
    collection: "log_actions",
  },
);

module.exports = model("LogAction", LogActionModel);
