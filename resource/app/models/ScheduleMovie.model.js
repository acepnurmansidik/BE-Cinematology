const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const ScheduleMovieSchema = new Schema(
  {
    on_model: {
      type: String,
      required: true,
      enum: ["Movie", "Season"],
    },
    movie_id: {
      type: Schema.Types.ObjectId,
      refPath: "on_model", // 🔥 PERBAIKAN 1: Menggunakan refPath agar dinamis mengikuti field on_model
      required: [true, "Movie ID wajib diisi"],
    },
    time: {
      type: String,
      required: true,
      default: "00.00",
    },
    start_date: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    due_date: {
      type: Date,
      required: true,
    },

    day: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      required: true,
      default: "Monday", // Sesuaikan hari default yang kamu inginkan
    }, // Menggunakan String agar nama hari tersimpan dengan jelas

    is_delete: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
    collection: "schedule_movie",
  },
);

ScheduleMovieSchema.index({ movie_id: 1, on_model: 1 }, { unique: true });

module.exports = model("ScheduleMovie", ScheduleMovieSchema);
