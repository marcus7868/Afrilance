import { Router } from "express";

const router = Router();

router.get("/config/public", (_req, res) => {
  res.json({
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? "",
  });
});

export default router;
