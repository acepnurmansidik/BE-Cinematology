const router = require("express").Router();
const controller = require("../controller/movie.controller");

router.get("/", controller.getAllMovieAdminOnly);
router.post("/", controller.createMovieAdminOnly);
router.put("/:id", controller.updateMovieAdminOnly);
router.delete("/:id", controller.deleteMovieAdminOnly);

// Demographic User
router.get("/demographic/users/like", controller.getUserDemographicMovieLike);
router.get("/demographic/users/watch", controller.getUserDemographicMovieWatch);
router.get("/demographic/users/genre", controller.getDemographicMovieGenreUser);
router.get(
  "/demographic/users/rating",
  controller.getDemographicMovieUserRating,
);

module.exports = router;
