const router = require("express").Router();
const controller = require("../controller/module.controller");

router.get("/", controller.getAllModule);
router.post("/", controller.createModule);
router.put("/:id", controller.updateModule);
router.delete("/:id", controller.deleteModule);

module.exports = router;
