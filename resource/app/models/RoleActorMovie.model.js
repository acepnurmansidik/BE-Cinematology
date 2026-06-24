const mongoose = require("mongoose");
const globalService = require("../../helper/global-func");
const { model, Schema } = mongoose;

const RoleActorMovieSchema = new Schema(
  {
    act_as: {
      type: String,
      required: [true, "Character name (Act As) is required!"],
    },
    is_default_avatar: { type: Boolean, default: false },
    actor_id: { type: Schema.Types.ObjectId, ref: "Actor", required: true },
    movie_id: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
    avatar_id: { type: Schema.Types.ObjectId, ref: "Image", required: true },
  },
  {
    // PERBAIKAN DI SINI:
    // Mengubah default nama timestamps Mongoose menjadi snake_case
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    versionKey: false,
    collection: "role_actor_movies",
  },
);

module.exports = model("RoleActorMovie", RoleActorMovieSchema);
