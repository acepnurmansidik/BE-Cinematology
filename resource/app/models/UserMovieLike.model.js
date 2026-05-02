const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const UserMovieLikeSchema = new Schema(
  {
    is_guest: {
      type: Boolean,
      required: true,
      default: false,
    },
    status_like: {
      type: String,
      enum: {
        values: ["like", "dislike", "none"],
        message: "{VALUE} is not a valid status",
      },
      required: [true, "Status is required!"],
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
    collection: "user_movie_likes",
  },
);

// Mencegah user yang sama memberikan like berulang kali pada movie yang sama (Unique Compound Index)
UserMovieLikeSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });

module.exports = model("UserMovieLike", UserMovieLikeSchema);
