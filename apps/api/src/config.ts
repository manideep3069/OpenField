export const config = {
  port: Number(process.env.PORT) || 4000,
  database: {
    connectionString:
      process.env.DATABASE_URL ||
      "postgres://openfield:openfield@localhost:5432/openfield",
  },
} as const;
