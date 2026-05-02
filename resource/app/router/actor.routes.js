const router = require("express").Router();
const controller = require("../controller/actor.controller");

router.get("/", controller.getAllActor);
router.post("/", controller.createActor);
router.put("/:id", controller.updateActor);
router.delete("/:id", controller.deleteActor);

module.exports = router;
