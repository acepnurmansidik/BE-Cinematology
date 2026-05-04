const Authchema = require("./auth.schema");
const RefParameterSchema = require("./reffParameter.schema");
const RoleSchema = require("./role.schema");
const ActorSchema = require("./actor.schema");
const GenreSchema = require("./genre.schema");
const StudioSchema = require("./studio.schema");
const PlanSchema = require("./plan.schema");
const UserSchema = require("./user.schema");
const MovieSchema = require("./movie.schema");

const GlobalSchema = {
  ...Authchema.Register,
  ...Authchema.Login,
  ...Authchema.ForgotPassword,
  ...RefParameterSchema,
  ...RoleSchema,
  ...ActorSchema,
  ...GenreSchema,
  ...StudioSchema,
  ...PlanSchema,
  ...UserSchema,
  ...MovieSchema,
};

module.exports = GlobalSchema;
