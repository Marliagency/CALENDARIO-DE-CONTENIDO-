// Cargado vía dotenv-cli desde scripts/dev. En entornos sin wrapper, importar
// dotenv aquí no rompe nada si las variables ya están presentes.

export const config = {
  port: Number(process.env.API_PORT ?? 3000),
  host: process.env.API_HOST ?? "0.0.0.0",
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-jwt-secret-change-me",
  encryptionKey:
    process.env.ENCRYPTION_KEY ?? "dev-only-encryption-key-32bytes!!",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  env: process.env.NODE_ENV ?? "development",
};

export const isDev = config.env !== "production";
