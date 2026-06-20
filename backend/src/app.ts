import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import caseRoutes from "./routes/case.routes";

const app = express();

// Security headers
app.use(helmet());

// CORS — only allow the configured frontend origin
app.use(cors({ origin: env.corsOrigin, credentials: true }));

// Request logging
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

// Body parsing
app.use(express.json({ limit: "5mb" }));

// Rate limiting — stricter on auth endpoints to slow brute-force attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/auth/login", authLimiter);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use("/api", generalLimiter);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/cases", caseRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
