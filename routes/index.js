const express = require("express");
const router = express.Router();

const authRouter = require("../resource/app/router/auth.routes");
const planRouter = require("../resource/app/router/plan.routes");
const roleRouter = require("../resource/app/router/role.routes");
const userRouter = require("../resource/app/router/user.routes");
const movieRouter = require("../resource/app/router/movie.routes");
const genreRouter = require("../resource/app/router/genre.routes");
const actorRouter = require("../resource/app/router/actor.routes");
const authorRouter = require("../resource/app/router/author.route");
const studioRouter = require("../resource/app/router/studio.routes");
const moduleRouter = require("../resource/app/router/module.routes");
const refparamRouter = require("../resource/app/router/reffParam.routes");
const scheduleRouter = require("../resource/app/router/schedule-movie.routes");
const {
  AuthorizeUserLogin,
} = require("../resource/middleware/authentification");

router.use("/auth", authRouter);
router.use("/plans", planRouter);

router.use("/role", roleRouter);
router.use("/schedule", scheduleRouter);
router.use("/genre", genreRouter);
router.use("/actor", actorRouter);
router.use("/movie", movieRouter);
router.use("/module", moduleRouter);
router.use("/author", authorRouter);
router.use("/studio", studioRouter);
router.use("/ref-parameter", refparamRouter);
router.use("/user", userRouter);
router.use(AuthorizeUserLogin);

module.exports = router;
