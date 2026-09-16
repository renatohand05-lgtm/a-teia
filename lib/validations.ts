import { z } from "zod";

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length ? v : undefined));
}

function optionalNumber(min: number, max: number, int = false) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().min(min).max(max).optional().refine((n) => (n === undefined || !int ? true : Number.isInteger(n)), "Deve ser inteiro"));
}

export const companyInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  segment: optionalText(80),
  units: optionalNumber(0, 10000, true),
  revenueMonthly: optionalNumber(0, 1_000_000_000),
  marginPercent: optionalNumber(-100, 100),
  teamSize: optionalNumber(0, 100000, true),
  channels: optionalText(500),
  objectives: optionalText(2000),
  perceivedBottlenecks: optionalText(2000),
  notes: optionalText(4000),
  isDemo: z.boolean().optional().default(false),
});

export type CompanyInput = z.infer<typeof companyInputSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export const aiRequestSchema = z.object({
  message: z.string().trim().min(3).max(8000),
  conversationId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  useWebSearch: z.boolean().optional().default(false),
  researchDepth: z.enum(["quick", "deep"]).optional().default("deep"),
});
