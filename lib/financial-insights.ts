import {
  type DreResult,
  type FinancialRatios,
  type TargetComparison,
  isInformed,
} from "@/lib/financial-engine";

export type KnowledgeStep = {
  kind: "DADO" | "INFERÊNCIA" | "HIPÓTESE" | "TESTE";
  title: string;
  body: string;
};

export function buildFinancialInsights(input: {
  ratios: FinancialRatios;
  dre: DreResult;
  comparisons: {
    revenue?: TargetComparison;
    ebitda?: TargetComparison;
    ebitdaPercent?: TargetComparison;
    cogsPercent?: TargetComparison;
    payrollPercent?: TargetComparison;
  };
}): KnowledgeStep[] {
  const steps: KnowledgeStep[] = [];
  const cogs = input.comparisons.cogsPercent;
  if (cogs && isInformed(cogs.actual) && isInformed(cogs.target) && cogs.status === "Acima da meta") {
    steps.push(
      {
        kind: "DADO",
        title: "CMV informado",
        body: `CMV ${cogs.actual}% neste período.`,
      },
      {
        kind: "INFERÊNCIA",
        title: "CMV acima da meta",
        body: `O CMV está acima da meta configurada de ${cogs.target}%. Isso é comparação matemática, não causa comprovada.`,
      },
      {
        kind: "HIPÓTESE",
        title: "Revisar compras e ficha técnica",
        body: "Revisar ficha técnica e compras pode reduzir o CMV. Hipótese financeira — ainda não é evidência.",
      },
      {
        kind: "TESTE",
        title: "Medir de novo",
        body: "Registrar CMV das próximas 4 semanas após o ajuste. Sem medição, a hipótese permanece hipótese.",
      },
    );
  }

  const payroll = input.comparisons.payrollPercent;
  if (payroll && isInformed(payroll.actual) && isInformed(payroll.target) && payroll.status === "Acima da meta") {
    steps.push(
      {
        kind: "DADO",
        title: "Folha informada",
        body: `Folha ${payroll.actual}% da receita líquida.`,
      },
      {
        kind: "INFERÊNCIA",
        title: "Folha acima da meta",
        body: `A folha está acima da meta de ${payroll.target}%. Não se afirma ociosidade ou erro de escala sem evidência.`,
      },
      {
        kind: "HIPÓTESE",
        title: "Revisar produtividade e escala",
        body: "Ajustar escala, turnos ou mix de funções pode aproximar a folha da meta. Hipótese — não evidência.",
      },
    );
  }

  const ebitda = input.comparisons.ebitdaPercent;
  if (ebitda && isInformed(ebitda.actual) && isInformed(ebitda.target) && ebitda.status === "Abaixo da meta") {
    steps.push(
      {
        kind: "DADO",
        title: "EBITDA % informado",
        body: `EBITDA ${ebitda.actual}% neste período.`,
      },
      {
        kind: "INFERÊNCIA",
        title: "Resultado abaixo da meta",
        body: `O EBITDA % ficou abaixo da meta de ${ebitda.target}%. A conta não identifica sozinha se a causa é receita, CMV ou custo fixo.`,
      },
      {
        kind: "HIPÓTESE",
        title: "Isolar a linha que mais pressiona",
        body: "Comparar CMV, folha e custos fixos contra o mês anterior pode indicar onde testar primeiro.",
      },
    );
  }

  if (!isInformed(input.dre.grossRevenue)) {
    steps.push({
      kind: "DADO",
      title: "Receita ainda não informada",
      body: "Não há receita bruta neste período. Indicadores e ponto de equilíbrio ficam vazios até o usuário registrar o DRE.",
    });
  }

  return steps;
}
