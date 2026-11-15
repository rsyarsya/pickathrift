const router = require("express").Router();
const { authenticateToken } = require("../middleware/auth");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");

router.use(authenticateToken);
router.get("/me", (req, res) => res.json({ success: true, data: serialize.user(req.account) }));
router.patch("/me", async (req, res) => {
  validate.fields(req.body, ["name", "phone", "address"]);
  if (!Object.keys(req.body).length) validate.invalid("body", "Isi minimal satu field.");
  for (const [key, value] of Object.entries(req.body)) {
    if (key === "address") {
      req.account.address = require("../lib/address").addressInput(value);
      continue;
    }
    req.account[key] = validate.text(value, key, {
      max: key === "name" ? 100 : key === "phone" ? 30 : 1000,
      required: key === "name",
    });
  }
  await req.account.save();
  res.json({ success: true, data: serialize.user(req.account) });
});

module.exports = router;
