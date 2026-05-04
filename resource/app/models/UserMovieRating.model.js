const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const UserMovieRatingSchema = new Schema(
  {
    is_guest: {
      type: Boolean,
      required: true,
      default: false,
    },
    rating: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 5,
    },
    // References
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    movie_id: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: [true, "Movie ID is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "user_movie_ratings",
  },
);

// Mencegah user yang sama memberikan like berulang kali pada movie yang sama (Unique Compound Index)
UserMovieRatingSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });

module.exports = model("UserMovieRating", UserMovieRatingSchema);
