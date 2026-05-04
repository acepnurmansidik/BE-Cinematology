const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const EpisodeSchema = new Schema(
  {
    movie_id: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
    season_id: { type: Schema.Types.ObjectId, ref: "Season", required: true },
    slug: { type: String, required: true, unique: true, trim: true },
    episode_number: { type: Number, required: true },
    title: { type: String, required: true },
    release_date: { type: Date, required: true },
    duration: { type: Number, default: 0 }, // in seconds
    total_likes: { type: Number, default: 0 },
    total_unlikes: { type: Number, default: 0 },
    videos: [
      {
        provider: { type: String, required: true }, // e.g., 'Gdrive', 'S3'
        url: { type: String, required: true },
        quality: { type: String, required: true }, // e.g., '720p', '1080p'
        // Penambahan field Subtitle
        subtitles: [
          {
            lang: { type: String, required: true }, // e.g., 'English', 'Indonesian'
            url: { type: String, required: true },
            format: { type: String, default: "vtt" }, // vtt or srt
            _id: false,
          },
        ],
        _id: false,
      },
    ],
  },
  { timestamps: true, collection: "movie_episodes", versionKey: false },
);

// --- OTOMATISASI SLUG DARI TITLE ---
EpisodeSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = globalService.createSlug(this.title); // Pastikan fungsi createSlug mengembalikan slug yang benar
  }
  next();
});

// Indexing untuk pencarian cepat berdasarkan movie dan urutan episode
EpisodeSchema.index({ movie_id: 1, episode_number: 1 });

module.exports = model("Episode", EpisodeSchema);
