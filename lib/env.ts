import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET deve ter pelo menos 16 caracteres"),
  AUTH_URL: z.string().optional(),
  AUTH_EMAIL: z.string().email().optional(),
  AUTH_PASSWORD: z.string().min(8).optional(),
  AUTH_NAME: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  WEB_SEARCH_PROVIDER: z.string().default("none"),
  WEB_SEARCH_API_KEY: z.string().optional(),
  STORAGE_DRIVER: z.enum(["local", "vercel-blob"]).default("local"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  APP_ENV: z.string().default("development"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof schema>;

export function getEnv(): AppEnv {
  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_EMAIL: process.env.AUTH_EMAIL,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
    AUTH_NAME: process.env.AUTH_NAME,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    WEB_SEARCH_PROVIDER: process.env.WEB_SEARCH_PROVIDER ?? "none",
    WEB_SEARCH_API_KEY: process.env.WEB_SEARCH_API_KEY,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER ?? "local",
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    APP_ENV: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    NODE_ENV: process.env.NODE_ENV ?? "development",
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Variáveis de ambiente inválidas: ${details}`);
  }

  return parsed.data;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function isWebSearchConfigured(): boolean {
  const provider = process.env.WEB_SEARCH_PROVIDER ?? "none";
  return provider !== "none" && Boolean(process.env.WEB_SEARCH_API_KEY);
}
