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

    movie_like_stats: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "user_movie_activities",
  },
);

module.exports = model("UserMovieActivity", UserMovieActivitySchema);
