const router = require("express").Router();
const multer = require("multer");
const mongoose = require("mongoose");
const { authenticateToken, requireBuyer, requireAdmin } = require("../middleware/auth");
const { ApiError } = require("../lib/errors");
const validate = require("../lib/validation");
const serialize = require("../lib/serializers");
const files = require("../services/files");
const payments = require("../services/payments");
const { expireOrders } = require("../services/orders");
function upload(field, count) {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: count, fields: 0, parts: count },
  }).array(field, count);
  return (req, res, next) => {
    if (!req.is("multipart/form-data"))
      return next(new ApiError(422, "INVALID_FILE", "Gunakan multipart/form-data."));
    parser(req, res, (error) =>
      next(
        error
          ? new ApiError(422, "INVALID_FILE", "Format/jumlah/ukuran berkas tidak sesuai.")
          : undefined,
      ),
    );
  };
}
router.post(
  "/orders/:id/payment-proof",
  authenticateToken,
  requireBuyer,
  validate.idParam("id"),
  async (req, res, next) => {
    await payments.ownedOrder(req.params.id, req.account);
    await expireOrders(new Date(), req.app.locals.config);
    const order = await payments.ownedOrder(req.params.id, req.account);
    if (order.payment)
      throw new ApiError(409, "PAYMENT_METHOD_CONFLICT", "Gunakan pembayaran Midtrans.");
    if (!["MENUNGGU_PEMBAYARAN", "PERLU_UNGGAH_ULANG"].includes(order.status))
      throw new ApiError(409, "INVALID_TRANSITION", "Pesanan tidak menerima unggahan.");
    req.expectedProofId = String(order.proof?.id ?? "");
    next();
  },
  upload("file", 1),
  async (req, res) => {
    const config = req.app.locals.config;
    const image = await files.saveImage(config, "proofs", req.files?.[0]);
    try {
      const result = await payments.uploadProof(
        req.params.id,
        req.account,
        { ...image, id: new mongoose.Types.ObjectId().toString() },
        req.expectedProofId,
      );
      if (result.expired)
        throw new ApiError(409, "PAYMENT_EXPIRED", "Batas pembayaran sudah habis.");
      res.json({ success: true, data: serialize.order(result.order) });
    } catch (error) {
      await files.removeImage(config, "proofs", image.filename);
      throw error;
    }
  },
);
router.get(
  "/orders/:id/payment-proof",
  authenticateToken,
  validate.idParam("id"),
  async (req, res, next) => {
    const order = await payments.ownedOrder(req.params.id, req.account);
    if (!order.proof) throw new ApiError(404, "NOT_FOUND", "Bukti belum tersedia.");
    res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res
      .type(order.proof.mime)
      .sendFile(files.filePath(req.app.locals.config, "proofs", order.proof.filename), (error) => {
        if (!error) return;
        if (res.headersSent) return next(error);
        res
          .status(error.code === "ENOENT" ? 404 : 500)
          .type("application/json")
          .json({
            success: false,
            code: "FILE_UNAVAILABLE",
            message: "Bukti tidak dapat dibaca.",
          });
      });
  },
);
router.post(
  "/admin/product-images",
  authenticateToken,
  requireAdmin,
  upload("images", 4),
  async (req, res) => {
    if (!req.files?.length) throw new ApiError(422, "INVALID_FILE", "Tambahkan minimal satu foto.");
    const images = [];
    try {
      for (const file of req.files)
        images.push(await files.saveImage(req.app.locals.config, "products", file));
      res.status(201).json({
        success: true,
        data: images.map((image) => "/uploads/products/" + image.filename),
      });
    } catch (error) {
      for (const image of images)
        await files.removeImage(req.app.locals.config, "products", image.filename);
      throw error;
    }
  },
);
module.exports = router;
