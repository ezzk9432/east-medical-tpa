import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "7d"),
  corsOrigin: optional("CORS_ORIGIN", "http://localhost:5173"),
  // Field-level encryption key (AES-256 — 32 bytes base64)
  encryptionKey: optional("ENCRYPTION_KEY", ""),
  // MFA issuer name shown in authenticator apps
  mfaIssuer: optional("MFA_ISSUER", "EastMedicalTPA"),
  // External integrations
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET", ""),
  paymobApiKey: optional("PAYMOB_API_KEY", ""),
  paymobHmacSecret: optional("PAYMOB_HMAC_SECRET", ""),  // Dashboard → Developers → HMAC Secret
  hospitalApiUrl: optional("HOSPITAL_API_URL", ""),
  hospitalApiKey: optional("HOSPITAL_API_KEY", ""),
  // Data retention (days after case closure before anonymisation)
  retentionDays: parseInt(optional("RETENTION_DAYS", "2555"), 10), // 7 years default
};
