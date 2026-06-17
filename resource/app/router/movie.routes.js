const router = require("express").Router();
const controller = require("../controller/movie.controller");
const { AuthorizeUserLogin } = require("../../middleware/authentification");

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

// Movie Trending
router.get("/movie-trending", controller.getMovieCurrentTrending);
// Movie Popular
router.get("/movie-populer", controller.getMovieCurrentPopular);

// New Episode
router.get("/new-episode", controller.getNewReleaseEpisode);
// Episode Trending
router.get("/episode-trending", controller.getTrendingEpisode);
// Episode Trending
router.get("/episode-popular", controller.getPopularEpisode);

router.use(AuthorizeUserLogin);
// Movie Recommendation
router.get("/recommendation", controller.getMovieRecommendation);

module.exports = router;
