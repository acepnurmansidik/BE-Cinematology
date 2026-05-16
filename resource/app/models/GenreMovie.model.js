const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

// GenreMovie.js
const GenreMovieSchema = new Schema(
  {
    genre_id: { type: Schema.Types.ObjectId, ref: "Genre", required: true },
    movie_id: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "genre_movies",
  },
);

module.exports = model("GenreMovie", GenreMovieSchema);
