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
  const numberSchema = (int ? z.number().int("Deve ser inteiro") : z.number()).min(min).max(max);
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  }, numberSchema.optional());
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

export const onboardingInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  segment: optionalText(80),
  city: optionalText(80),
  state: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return String(value).trim().toUpperCase();
  }, z.string().regex(/^[A-Z]{2}$/, "UF deve ter 2 letras").optional()),
  revenueMonthly: optionalNumber(0, 1_000_000_000),
  averageTicket: optionalNumber(0, 10_000_000),
  clientsPerMonth: optionalNumber(0, 10_000_000, true),
  teamSize: optionalNumber(0, 100000, true),
  channels: optionalText(500),
  estimatedRecurrence: optionalText(120),
  primaryObjective: optionalText(2000),
  perceivedBottleneck: optionalText(2000),
  notes: optionalText(4000),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

const dimensionScoreSchema = z.coerce
  .number()
  .int("A nota deve ser um número inteiro.")
  .min(1, "A nota mínima é 1.")
  .max(5, "A nota máxima é 5.");

export const diagnosisInputSchema = z.object({
  idempotencyKey: z.string().uuid("Identificador de envio inválido."),
  scores: z.object({
    attraction: dimensionScoreSchema,
    conversion: dimensionScoreSchema,
    averageTicket: dimensionScoreSchema,
    recurrence: dimensionScoreSchema,
    referral: dimensionScoreSchema,
    brandImage: dimensionScoreSchema,
    commercialImage: dimensionScoreSchema,
    operations: dimensionScoreSchema,
    finance: dimensionScoreSchema,
    managementData: dimensionScoreSchema,
  }),
});

export type DiagnosisInput = z.infer<typeof diagnosisInputSchema>;

const dimensionKeySchema = z.enum([
  "attraction",
  "conversion",
  "averageTicket",
  "recurrence",
  "referral",
  "brandImage",
  "commercialImage",
  "operations",
  "finance",
  "managementData",
]);

const scaleSchema = z.coerce
  .number()
  .int("Use um número inteiro de 1 a 5.")
  .min(1, "A escala mínima é 1.")
  .max(5, "A escala máxima é 5.");

export const opportunityStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "IN_PROGRESS",
  "VALIDATED",
  "REJECTED",
  "ARCHIVED",
]);

export const opportunityInputSchema = z.object({
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(160),
  problemStatement: z.string().trim().min(8, "Descreva o problema.").max(4000),
  hypothesis: z.string().trim().min(8, "Descreva a hipótese de ação.").max(4000),
  sourceDimension: dimensionKeySchema,
  expectedImpact: scaleSchema,
  urgency: scaleSchema,
  effort: scaleSchema,
  confidence: scaleSchema.optional().default(3),
  description: optionalText(4000),
  estimatedInvestment: optionalNumber(0, 1_000_000_000),
  estimatedHours: optionalNumber(0, 100_000),
  expectedMonthlyReturn: optionalNumber(0, 1_000_000_000),
  diagnosisId: z.string().cuid().optional(),
});

export type OpportunityInput = z.infer<typeof opportunityInputSchema>;

export const generateOpportunitiesSchema = z.object({
  diagnosisId: z.string().cuid("Diagnóstico inválido."),
  templateKeys: z.array(z.string().min(3)).min(1, "Selecione ao menos uma sugestão."),
});

export type GenerateOpportunitiesInput = z.infer<typeof generateOpportunitiesSchema>;

export const aiRequestSchema = z.object({
  message: z.string().trim().min(3).max(8000),
  conversationId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  useWebSearch: z.boolean().optional().default(false),
  researchDepth: z.enum(["quick", "deep"]).optional().default("deep"),
});
