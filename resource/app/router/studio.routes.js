const router = require("express").Router();
const controller = require("../controller/studio.controller");

router.get("/", controller.getAllStudio);
router.post("/", controller.createStudio);
router.put("/:id", controller.updateStudio);
router.delete("/:id", controller.deleteStudio);

module.exports = router;
