const globalService = require("../../helper/global-func");

const SeasonSchema = new Schema(
  {
    movie_id: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: [true, "Movie ID is required"],
    },
    title: {
      type: String,
      required: [true, "Season title is required"],
      trim: true,
    },
    season_number: {
      type: Number,
      required: [true, "Season number is required"],
    },
    episode_count: {
      type: Number,
      default: 0,
    },
    release_date: {
      type: Date,
      required: [true, "Release date is required"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "movie_seasons",
  },
);

// Auto-generate slug for Season
SeasonSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = globalService.createSlug(this.title); // Pastikan fungsi createSlug mengembalikan slug yang benar
  }
});

module.exports = model("Season", SeasonSchema);
