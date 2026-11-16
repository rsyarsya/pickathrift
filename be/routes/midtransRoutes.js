const router = require("express").Router();
router.post("/notification", async (req, res) => {
  res.set("Cache-Control", "no-store");
  await require("../services/payment-sync").notification(req.body, req.app.locals.config);
  res.json({ success: true, data: { received: true } });
});
module.exports = router;
