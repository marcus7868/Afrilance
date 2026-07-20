import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware, requireAuth } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import configRouter from "./routes/config";
import publicRouter from "./routes/public";
import paymentsWebhookRouter from "./routes/payments-webhook";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.urlencoded({ extended: true }));

// Public routes (no Clerk auth) — registered before clerkMiddleware
app.use("/api", configRouter);
app.use("/api", publicRouter);
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentsWebhookRouter,
);

app.use(express.json());

app.use(
  clerkMiddleware(() => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })),
);

app.use((req, _res, next) => {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    req.headers.authorization = req.headers.authorization;
  }
  next();
});

app.use("/api", router);

export default app;
