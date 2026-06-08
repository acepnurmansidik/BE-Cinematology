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
const AuthorizeUserLogin = require("../resource/middleware/authentification");

router.use("/auth", authRouter);
router.use("/plans", planRouter);

router.use("/role", roleRouter);
router.use("/genre", genreRouter);
router.use("/actor", actorRouter);
router.use("/movie", movieRouter);
router.use("/module", moduleRouter);
router.use("/author", authorRouter);
router.use("/studio", studioRouter);
router.use("/ref-parameter", refparamRouter);
router.use(AuthorizeUserLogin);
router.use("/user", userRouter);

module.exports = router;
