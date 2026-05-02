const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const WatchHistorySchema = new Schema(
  {
    is_guest: {
      type: Boolean,
      default: false,
    },
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
    episode_id: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      default: null,
    },
    // PERBAIKAN: Menggunakan Number untuk Unix Timestamp
    last_watched_at: {
      type: Number,
      default: () => Date.now(), // Menggunakan arrow function agar mendapatkan timestamp saat ini
    },
    progress_seconds: {
      type: Number,
      default: 0,
      min: [0, "Progress cannot be negative"],
    },
    duration_seconds: {
      type: Number,
      default: 0,
    },
    is_completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "watch_histories",
  },
);

// Index agar query riwayat berdasarkan waktu (terbaru) menjadi cepat
WatchHistorySchema.index({ user_id: 1, last_watched_at: -1 });

module.exports = model("WatchHistory", WatchHistorySchema);
