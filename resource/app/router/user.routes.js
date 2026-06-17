const router = require("express").Router();
const controller = require("../controller/users.controller");
const {
  AuthorizeUserLogin,
  AuthorizeOptionalLogin,
} = require("../../middleware/authentification");

router.use(AuthorizeOptionalLogin);
// user make actions with movies
router.get("/rating-movie", controller.userMovieRating);
router.put("/like-movie", controller.userMovieLike);
router.put("/watch-movie", controller.userMovieWatchHistory);

router.use(AuthorizeUserLogin);
// uesr make transactions
router.get("/transactions", controller.getAllTransaction);
router.post("/:planId/transaction", controller.createUserTransaction);
router.put("/:gatewayId/payment", controller.userPayment);
router.get("/history-transaction", controller.getUserTransaction);

// history action user with movies
router.get("/history-watch-movie", controller.getAllMovieHistoryUser);

// FOR ADMIN ONLY =========================================================
// demographic analytic
router.get("/demographic-genre", controller.getAllDemographicGenre);
router.get("/demographic-like", controller.getAllDemographicLike);
router.get("/demographic-watch", controller.getAllDemographicWatch);
router.get("/demographic-rating", controller.getAllDemographicRating);

// CRUD USER WITH ADMIN
router.get("/", controller.getAllUser);
router.post("/", controller.createUser);
router.put("/:id", controller.updateUser);
router.delete("/:id", controller.deleteUser);

module.exports = router;
