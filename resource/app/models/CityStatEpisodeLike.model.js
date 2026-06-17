const mongoose = require("mongoose");
const { model, Schema } = mongoose;

const CityStatEpisodeLikeSchema = new Schema(
  {
    movie_id: {
      type: Schema.Types.ObjectId,
      ref: "Movie",
      required: [true, "Movie ID wajib diisi"],
    },
    episode_id: {
      type: Schema.Types.ObjectId,
      ref: "Episode",
      required: [true, "Movie ID wajib diisi"],
    },
    movie_name: {
      type: String,
      required: [true, "Nama film wajib diisi"],
      trim: true,
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

    total_users_likes: {
      type: Number,
      default: 0,
    },
    total_users_unlikes: {
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
    collection: "city_stat_episode_likes",
  },
);

// Compound Index: Unik berdasarkan film, provinsi (region), dan kota.
// Ini sangat penting agar statistik tidak duplikat untuk kota yang sama.
CityStatEpisodeLikeSchema.index(
  { movie_id: 1, regionName: 1, city: 1, date_format: 1 },
  { unique: true },
);

module.exports = model("CityStatEpisodeLike", CityStatEpisodeLikeSchema);
