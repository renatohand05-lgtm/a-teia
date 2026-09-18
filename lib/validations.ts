import { z } from "zod";

function optionalText(max: number) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(max).optional());
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

export const executionPlanInputSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  opportunityId: z.string().cuid("Oportunidade inválida."),
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(160),
  summary: optionalText(4000),
  goal30: z.string().trim().min(8, "Descreva o horizonte de 0–30 dias.").max(4000),
  goal60: z.string().trim().min(8, "Descreva o horizonte de 31–60 dias.").max(4000),
  goal90: z.string().trim().min(8, "Descreva o horizonte de 61–90 dias.").max(4000),
});

export type ExecutionPlanInput = z.infer<typeof executionPlanInputSchema>;

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]);

function optionalMoney() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  }, z.number().min(0, "Valor não pode ser negativo.").finite().optional());
}

function optionalPercent() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  }, z.number().min(0, "Percentual mínimo é 0.").max(100, "Percentual máximo é 100.").finite().optional());
}

function requiredMoney() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return Number.NaN;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  }, z.number().min(0, "Valor não pode ser negativo.").finite());
}

function requiredPercent() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return Number.NaN;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  }, z.number().min(0).max(100).finite());
}

export const periodSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  periodMonth: z.coerce.number().int().min(1, "Mês deve ser 1 a 12.").max(12, "Mês deve ser 1 a 12."),
  periodYear: z.coerce.number().int().min(2000, "Ano inválido.").max(2100, "Ano inválido."),
});

export const dreInputSchema = periodSchema.extend({
  grossRevenue: optionalMoney(),
  deductions: optionalMoney(),
  cogs: optionalMoney(),
  payroll: optionalMoney(),
  rent: optionalMoney(),
  water: optionalMoney(),
  energy: optionalMoney(),
  internet: optionalMoney(),
  marketing: optionalMoney(),
  delivery: optionalMoney(),
  accounting: optionalMoney(),
  maintenance: optionalMoney(),
  otherOpex: optionalMoney(),
  salesCount: optionalNumber(0, 100_000_000, true),
  notes: optionalText(4000),
});

export type DreFormInput = z.infer<typeof dreInputSchema>;

export const financialGoalSchema = periodSchema.extend({
  revenueTarget: optionalMoney(),
  ebitdaTarget: optionalMoney(),
  ebitdaPercentTarget: optionalPercent(),
  cogsPercentTarget: optionalPercent(),
  payrollPercentTarget: optionalPercent(),
});

export type FinancialGoalInput = z.infer<typeof financialGoalSchema>;

export const cashFlowInputSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  direction: z.enum(["INFLOW", "OUTFLOW"]),
  category: z.string().trim().min(2, "Informe a categoria.").max(80),
  amount: requiredMoney(),
  occurredAt: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }, z.date()),
  description: optionalText(4000),
});

export type CashFlowInput = z.infer<typeof cashFlowInputSchema>;

export const requiredRevenueSchema = z.object({
  desiredProfit: requiredMoney(),
  cogsPercent: requiredPercent(),
  taxPercent: requiredPercent(),
  deliveryPercent: requiredPercent(),
  otherVariablePercent: requiredPercent(),
  fixedCosts: requiredMoney(),
});

export type RequiredRevenueFormInput = z.infer<typeof requiredRevenueSchema>;

export const executionFinanceSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  planId: z.string().cuid("Plano inválido."),
  realizedCost: optionalMoney(),
  realizedReturn: optionalMoney(),
});

export type ExecutionFinanceInput = z.infer<typeof executionFinanceSchema>;

function optionalFinite() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  }, z.number().finite().optional());
}

function requiredFinite() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return Number.NaN;
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    return Number.isFinite(n) ? n : Number.NaN;
  }, z.number().finite());
}

function optionalDate() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }, z.date().optional());
}

export const experimentInputSchema = z
  .object({
    companyId: z.string().cuid("Empresa inválida."),
    opportunityId: z.string().cuid().optional(),
    actionPlanId: z.string().cuid().optional(),
    strategyId: z.string().cuid().optional(),
    title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(160),
    hypothesis: z.string().trim().min(8, "Descreva a hipótese a ser testada.").max(4000),
    kpi: z.string().trim().min(2, "Informe o KPI principal.").max(80),
    kpiCustom: optionalText(80),
    kpiUnit: optionalText(40),
    direction: z.enum(["HIGHER_IS_BETTER", "LOWER_IS_BETTER"]),
    baseline: optionalFinite(),
    target: optionalFinite(),
    startedAt: optionalDate(),
    plannedEndAt: optionalDate(),
    investment: optionalMoney(),
    testDescription: optionalText(4000),
    successCriteria: optionalText(4000),
    notes: optionalText(4000),
  })
  .superRefine((value, ctx) => {
    if (value.startedAt && value.plannedEndAt && value.plannedEndAt.getTime() < value.startedAt.getTime()) {
      ctx.addIssue({ code: "custom", message: "A data final prevista deve ser igual ou posterior à inicial.", path: ["plannedEndAt"] });
    }
    if (value.kpi === "custom" && !value.kpiCustom) {
      ctx.addIssue({ code: "custom", message: "Informe o KPI customizado.", path: ["kpiCustom"] });
    }
  })
  .transform((value) => ({
    ...value,
    kpi: value.kpi === "custom" ? value.kpiCustom ?? value.kpi : value.kpi,
  }));

export type ExperimentInput = z.infer<typeof experimentInputSchema>;

export const experimentMeasurementSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  experimentId: z.string().cuid("Experimento inválido."),
  measuredValue: requiredFinite(),
  recordedAt: optionalDate(),
  notes: optionalText(4000),
});

export type ExperimentMeasurementInput = z.infer<typeof experimentMeasurementSchema>;

export const experimentResultSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  experimentId: z.string().cuid("Experimento inválido."),
  finalValue: requiredFinite(),
  realizedInvestment: optionalMoney(),
  realizedReturn: optionalMoney(),
  revenueBase: optionalMoney(),
  notes: optionalText(4000),
});

export type ExperimentResultInput = z.infer<typeof experimentResultSchema>;

export const experimentIdSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  experimentId: z.string().cuid("Experimento inválido."),
});

export const memoryProposeSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  evidenceId: z.string().cuid("Evidência inválida."),
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(160),
  lesson: z.string().trim().min(8, "Descreva a lição aprendida.").max(4000),
  context: optionalText(4000),
  limitations: optionalText(4000),
  conditions: optionalText(4000),
});

export type MemoryProposeInput = z.infer<typeof memoryProposeSchema>;

export const memoryObservationSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  origin: z.enum(["OBSERVATION", "MANUAL_LESSON"]),
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(160),
  lesson: z.string().trim().min(8, "Descreva a observação ou lição.").max(4000),
  context: optionalText(4000),
  segment: optionalText(80),
  kpi: optionalText(80),
  family: optionalText(80),
  baseline: optionalFinite(),
  target: optionalFinite(),
  measuredResult: optionalFinite(),
  limitations: optionalText(4000),
  conditions: optionalText(4000),
});

export type MemoryObservationInput = z.infer<typeof memoryObservationSchema>;

export const memoryIdSchema = z.object({
  companyId: z.string().cuid("Empresa inválida."),
  memoryId: z.string().cuid("Memória inválida."),
});

export const aiRequestSchema = z.object({
  message: z.string().trim().min(3).max(8000),
  conversationId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional(),
  useWebSearch: z.boolean().optional().default(false),
  researchDepth: z.enum(["quick", "deep"]).optional().default("deep"),
});
