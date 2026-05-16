const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const ActorMovieSchema = new Schema(
  {
    actor_id: {
      type: Schema.Types.ObjectId,
      ref: "Actor",
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
    collection: "actor_movies",
  },
);

module.exports = model("ActorMovie", ActorMovieSchema);
