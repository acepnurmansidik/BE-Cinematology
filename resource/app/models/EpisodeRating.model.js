const { Schema, model } = require("mongoose");

const EpisodeRatingSchema = new Schema(
  {
    episode_id: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      required: [true, "Episode ID is required"],
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    rating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },
    is_guest: {
      type: Boolean,
      default: false,
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
    collection: "user_episode_ratings",
  },
);

module.exports = model("EpisodeRating", EpisodeRatingSchema);
