const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const MovieSchema = new Schema(
  {
    slug: {
      type: String,
      minlength: [3, "Slug must be at least 3 characters long"],
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
      enum: {
        values: ["on-going", "completed"],
        message: "{VALUE} is not a valid status",
      },
      required: [true, "Status is required!"],
    },
    type: {
      type: String,
      enum: {
        values: ["movie", "manga", "series"],
        message: "{VALUE} is not a valid type",
      },
      required: [true, "Type is required!"],
    },
    // is_series: {
    //   type: Boolean,
    //   required: [true, "Series indicator is required!"],
    //   default: false,
    // },
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
      required: [true, "Code is required!"],
      uppercase: true,
      trim: true,
    },
    release_date: {
      type: Date,
      required: [true, "Release date is required!"],
    },

    // Fixed typo: 'require' should be 'required'
    thumbnail_id: {
      type: Schema.Types.ObjectId,
      ref: "Image",
      required: [true, "Thumbnail is required!"],
    },
    cover_id: {
      type: Schema.Types.ObjectId,
      ref: "Image",
      required: [true, "Cover image is required!"],
    },

    // Counting fields - Use Number type validation
    total_episode: { type: Number, default: 0, min: 0 },
    total_chapter: { type: Number, default: 0, min: 0 },
    total_volume: { type: Number, default: 0, min: 0 },
    total_likes: { type: Number, default: 0, min: 0 },
    total_unlikes: { type: Number, default: 0, min: 0 },
    total_views: { type: Number, default: 0, min: 0 },
    total_watch: { type: Number, default: 0, min: 0 },
    total_rating: { type: Number, default: 0, min: 0 },
    total_users_rating: { type: Number, default: 0, min: 0 },

    // References - Fixed 'require' typo
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
    timestamps: true,
    versionKey: false,
    collection: "movies",
  },
);

// Indexing for faster searches
MovieSchema.index({ title: "text", genres_name: "text" });

// Pre-save hook
MovieSchema.pre("validate", function (next) {
  // Jika slug tidak diisi, buat dari title
  if (!this.slug && this.title) {
    this.slug = globalService.createSlug(this.title); // Pastikan fungsi createSlug mengembalikan slug yang benar
  }
  next();
});

module.exports = model("Movie", MovieSchema);
