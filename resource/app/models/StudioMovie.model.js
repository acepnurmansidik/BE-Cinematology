const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const StudioMovieSchema = new Schema(
  {
    studio_id: {
      type: Schema.Types.ObjectId,
      ref: "Studio",
      required: true,
    },
    movie_id: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
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
    collection: "studio_movies",
  },
);

module.exports = model("StudioMovie", StudioMovieSchema);
