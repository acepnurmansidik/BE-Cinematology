const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const MovieSchema = new Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug is required!"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      minlength: [2, "Title must be at least 2 characters long"],
      required: [true, "Title is required!"],
      trim: true,
    },
    synopsis: {
      type: String,
      minlength: [
        10,
        "Synopsis should be at least 10 characters for better SEO",
      ],
      required: [true, "Synopsis is required!"],
    },
    status: {
      type: String,
      default: "released",
      enum: {
        // PERBAIKAN DI SINI: Tambahkan "released" ke dalam daftar enum values
        values: ["on-going", "completed", "released", "upcoming"],
        message: "{VALUE} is not a valid status",
      },
      required: [true, "Status is required!"],
    },
    type: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, "Type is required!"],
      enum: {
        values: ["movie", "manga", "series", "season"],
        message: "{VALUE} is not a valid type",
      },
    },
    is_adult: {
      type: Boolean,
      required: [true, "Adult content indicator is required!"],
      default: false,
    },
    continent: {
      type: String,
      required: [true, "Continent is required!"],
    },
    country: {
      type: String,
      required: [true, "Country is required!"],
    },
    code: {
      type: String,
      required: [false, "Code is required!"],
      uppercase: true,
      trim: false,
    },
    release_date: {
      type: Date,
      required: [true, "Release date is required!"],
    },
    thumbnail_id: {
      type: Schema.Types.ObjectId,
      ref: "Image",
      required: false,
      default: null,
    },
    cover_id: {
      type: Schema.Types.ObjectId,
      ref: "Image",
      required: false,
      default: null,
    },
    total_episode: { type: Number, default: 0, min: 0 },
    total_chapter: { type: Number, default: 0, min: 0 },
    total_volume: { type: Number, default: 0, min: 0 },
    total_likes: { type: Number, default: 0, min: 0 },
    total_unlikes: { type: Number, default: 0, min: 0 },
    total_watch: { type: Number, default: 0, min: 0 },
    vote_rating: { type: Number, default: 0, min: 0 },
    total_rating: { type: Number, default: 0, min: 0 },

    genres_name: {
      type: String,
      required: [true, "Genre names string is required!"],
    },
    genres: [
      {
        type: Schema.Types.ObjectId,
        ref: "Genre",
        required: true,
      },
    ],
    authors_name: {
      type: String,
      required: [true, "Author names string is required!"],
    },
    authors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Author",
        required: true,
      },
    ],
    actors_name: {
      type: String,
      required: [true, "Actor names string is required!"],
    },
    actors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Actor",
        required: true,
      },
    ],
    studio_name: {
      type: String,
      required: [true, "Studio names string is required!"],
    },
    studios: [
      {
        type: Schema.Types.ObjectId,
        ref: "Studio",
        required: true,
      },
    ],
    is_delete: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
    collection: "movies",
  },
);

/**
 * 🔥 Perbaikan ERR_REQUIRE_ESM
 * Menggunakan Dynamic Import agar CommonJS dapat membaca package ESM
 */
import("mongoose-unique-validator")
  .then((module) => {
    const uniqueValidator = module.default;
    MovieSchema.plugin(uniqueValidator, {
      message: "Movie title must be unique!",
    });
  })
  .catch((err) => {
    console.error("❌ Gagal memuat mongoose-unique-validator:", err);
  });

MovieSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = globalService.createSlug(this.title);
  }
});

module.exports = model("Movie", MovieSchema);
