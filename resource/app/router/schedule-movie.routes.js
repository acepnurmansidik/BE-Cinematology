const router = require("express").Router();
const controller = require("../controller/schedule-movie.controller");

router.get("/group", controller.getAllScheduleGroup);
router.get("/", controller.getAllSchedule);
router.post("/", controller.createSchedule);
router.put("/:id", controller.updateSchedule);
router.delete("/:id", controller.deleteSchedule);

module.exports = router;
