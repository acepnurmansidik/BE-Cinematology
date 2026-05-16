const router = require("express").Router();
const controller = require("../controller/author.controller");

router.get("/", controller.getAllAuthor);
router.post("/", controller.createAuthor);
router.put("/:id", controller.updateAuthor);
router.delete("/:id", controller.deleteAuthor);

module.exports = router;
