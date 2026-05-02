const router = require("express").Router();
const controller = require("../controller/plan.controller");

router.get("/", controller.getAllPlans);
router.post("/", controller.createPlan);
router.put("/:id", controller.updatePlan);
router.delete("/:id", controller.deletePlan);

module.exports = router;
