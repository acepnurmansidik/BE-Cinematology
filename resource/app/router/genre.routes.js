const router = require("express").Router();
const controller = require("../controller/genre.controller");

router.get("/", controller.getAllGenre);
router.post("/", controller.createGenre);
router.put("/:id", controller.updateGenre);
router.delete("/:id", controller.deleteGenre);

module.exports = router;
