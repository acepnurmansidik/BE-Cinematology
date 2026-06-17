const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const CityStatMovieGenreSchema = new Schema(
  {
    genre_id: {
      type: Schema.Types.ObjectId,
      ref: "Genre",
      required: [true, "Genre ID wajib diisi"],
    },

    // Field lokasi yang dipetakan dari API
    continent: { type: String, default: null },
    continentCode: { type: String, default: null },
    country: { type: String, default: "Indonesia" },
    countryCode: { type: String, default: "ID" },
    region: { type: String, default: null }, // Contoh: Jakarta
    regionName: { type: String, default: null }, // Contoh: Jakarta
    city: { type: String, required: [true, "City wajib diisi"] }, // Contoh: North Jakarta
    timezone: { type: String, default: "Asia/Jakarta" },
    date_format: { type: String, default: "" },

    // Metadata tambahan jika diperlukan (opsional)
    location_raw: {
      type: Schema.Types.Mixed,
      default: {},
    },

    total_genre_likes: {
      type: Number,
      default: 0,
    },
    total_genre_unlikes: {
      type: Number,
      default: 0,
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
    collection: "city_stat_movie_genres",
  },
);

// Compound Index: Unik berdasarkan film, provinsi (region), dan kota.
// Ini sangat penting agar statistik tidak duplikat untuk kota yang sama.
CityStatMovieGenreSchema.index(
  { movie_id: 1, regionName: 1, city: 1, date_format: 1 },
  { unique: true },
);

module.exports = model("CityStatMovieGenre", CityStatMovieGenreSchema);
