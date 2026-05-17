const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const UserMovieActivitySchema = Schema(
  {
    user_id: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      require: true,
      unique: true,
    },

    genre_watch_stats: {
      type: Schema.Types.Mixed,
      default: {},
    },

    genre_like_stats: {
      type: Schema.Types.Mixed,
      default: {},
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
    collection: "user_movie_activities",
  },
);

module.exports = model("UserMovieActivity", UserMovieActivitySchema);
