import { describe, expect, it } from "vitest";
import {
  addDays,
  countOverdueTasks,
  executionProgress,
  executionStatusLabel,
  isTaskOverdue,
} from "@/lib/execution";
import { canAccessCompany } from "@/lib/access-policy";
import { executionPlanInputSchema, taskStatusSchema } from "@/lib/validations";

describe("progresso 30/60/90", () => {
  it("calcula percentual de tarefas concluídas", () => {
    expect(executionProgress(["TODO", "TODO", "TODO"])).toBe(0);
    expect(executionProgress(["DONE", "TODO", "TODO"])).toBe(33);
    expect(executionProgress(["DONE", "DONE", "DONE"])).toBe(100);
  });

  it("ignora canceladas no denominador", () => {
    expect(executionProgress(["DONE", "DONE", "CANCELLED"])).toBe(100);
    expect(executionProgress(["CANCELLED"])).toBe(0);
  });
});

describe("tarefas atrasadas", () => {
  const now = new Date("2026-09-17T12:00:00.000Z");

  it("marca atraso só quando o prazo passou e a tarefa está aberta", () => {
    expect(isTaskOverdue("2026-09-16T12:00:00.000Z", "TODO", now)).toBe(true);
    expect(isTaskOverdue("2026-09-18T12:00:00.000Z", "TODO", now)).toBe(false);
    expect(isTaskOverdue("2026-09-16T12:00:00.000Z", "DONE", now)).toBe(false);
    expect(isTaskOverdue(null, "TODO", now)).toBe(false);
  });

  it("conta atrasos da carteira", () => {
    expect(
      countOverdueTasks(
        [
          { dueAt: "2026-09-16T12:00:00.000Z", status: "TODO" },
          { dueAt: "2026-09-16T12:00:00.000Z", status: "DONE" },
          { dueAt: "2026-09-20T12:00:00.000Z", status: "IN_PROGRESS" },
        ],
        now,
      ),
    ).toBe(1);
  });
});

describe("horizontes e validação", () => {
  it("avança 30/60/90 dias", () => {
    const start = new Date(2026, 0, 1);
    expect(addDays(start, 30).getDate()).toBe(31);
    expect(addDays(start, 60).getMonth()).toBe(2);
  });

  it("valida plano com os três horizontes", () => {
    const parsed = executionPlanInputSchema.safeParse({
      companyId: "clxxxxxxxxxxxxxxxxxxxx",
      opportunityId: "clyyyyyyyyyyyyyyyyyyyy",
      title: "Plano 90 dias",
      goal30: "Medir baseline e dono.",
      goal60: "Ajustar KPI com resultado real.",
      goal90: "Escalar só com evidência.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejeita horizonte curto e status inválido", () => {
    expect(
      executionPlanInputSchema.safeParse({
        companyId: "clxxxxxxxxxxxxxxxxxxxx",
        opportunityId: "clyyyyyyyyyyyyyyyyyyyy",
        title: "Plano",
        goal30: "curto",
        goal60: "Ajustar KPI com resultado real.",
        goal90: "Escalar só com evidência.",
      }).success,
    ).toBe(false);
    expect(taskStatusSchema.safeParse("DONE").success).toBe(true);
    expect(taskStatusSchema.safeParse("INVALID").success).toBe(false);
  });

  it("mantém rótulos e isolamento", () => {
    expect(executionStatusLabel("IN_PROGRESS")).toBe("Em execução");
    expect(canAccessCompany("owner-a", "owner-b")).toBe(false);
  });
});
