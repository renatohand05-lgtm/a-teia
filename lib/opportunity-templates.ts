import { DIAGNOSTIC_DIMENSIONS, type DiagnosticDimensionKey } from "@/lib/diagnostic";

export const LOW_DIMENSION_MAX = 3;

export type OpportunityTemplate = {
  key: string;
  dimension: DiagnosticDimensionKey;
  title: string;
  problemStatement: string;
  hypothesis: string;
  description: string;
  expectedImpact: number;
  effort: number;
  confidence: number;
};

function t(
  dimension: DiagnosticDimensionKey,
  suffix: string,
  title: string,
  problemStatement: string,
  hypothesis: string,
  expectedImpact: number,
  effort: number,
): OpportunityTemplate {
  const label = DIAGNOSTIC_DIMENSIONS.find((item) => item.key === dimension)?.label ?? dimension;
  return {
    key: `${dimension}-${suffix}`,
    dimension,
    title,
    problemStatement,
    hypothesis,
    description: `Hipótese de ação para ${label}. Não é causa comprovada nem evidência validada.`,
    expectedImpact,
    effort,
    confidence: 3,
  };
}

export const OPPORTUNITY_TEMPLATES: OpportunityTemplate[] = [
  t("attraction", "aquisicao", "Estruturar aquisição contínua de clientes", "O fluxo de novos clientes é irregular e não sustenta a meta comercial.", "Se a empresa padronizar um canal de aquisição, o volume de entradas fica menos dependente de acaso.", 4, 3),
  t("attraction", "midia-local", "Ativar mídia local com oferta clara", "A presença na região é fraca e o público próximo não é estimulado a entrar.", "Se houver mídia local com oferta objetiva, a atração de curto prazo pode subir sem prova ainda de ROI.", 4, 2),
  t("attraction", "parceria", "Abrir parcerias de indicação B2B", "Há poucas pontes com negócios complementares que poderiam enviar demanda.", "Se parcerias locais forem formalizadas, uma parte da atração passa a chegar por terceiros.", 3, 3),
  t("attraction", "indicacao", "Criar rotina de pedido de indicação", "Clientes atuais não são sistematicamente convidados a indicar.", "Se cada atendimento encerrar com um pedido simples de indicação, a atração orgânica pode crescer.", 4, 2),
  t("attraction", "digital", "Fortalecer presença digital de captação", "A empresa é pouco encontrada online no momento da busca do cliente.", "Se perfil, Google e WhatsApp estiverem consistentes, parte da demanda reprimida aparece.", 4, 3),

  t("conversion", "script", "Implantar script comercial padrão", "A conversão depende do improviso de quem atende.", "Se houver um roteiro de perguntas e fechamento, a taxa de conversão tende a variar menos.", 5, 2),
  t("conversion", "treinamento", "Treinar o time de atendimento e venda", "Há perda de oportunidade por insegurança ou falta de técnica no contato.", "Se o time praticar objeções e próximo passo, mais orçamentos viram venda.", 4, 3),
  t("conversion", "followup", "Criar follow-up obrigatório de orçamentos", "Leads e orçamentos esfriam sem retomada programada.", "Se todo orçamento tiver follow-up em 24–72h, parte da conversão perdida volta.", 5, 2),
  t("conversion", "velocidade", "Reduzir tempo de resposta ao lead", "A demora no primeiro contato derruba a chance de fechar.", "Se o SLA de resposta cair para minutos, a conversão de entrada tende a subir.", 4, 3),
  t("conversion", "resposta", "Aumentar a taxa de resposta comercial", "Muitos contatos entram e não recebem retorno completo.", "Se cada lead tiver dono e checklist de resposta, menos oportunidades morrem no silêncio.", 4, 2),

  t("averageTicket", "upsell", "Treinar upsell no ponto de venda", "O ticket para no item pedido, sem oferta complementar.", "Se o time oferecer um upgrade relevante em toda venda, o ticket médio pode subir.", 4, 2),
  t("averageTicket", "cross-sell", "Montar cross-sell de itens associados", "Produtos e serviços relacionados não são apresentados juntos.", "Se combinações naturais forem sugeridas, o valor por atendimento aumenta.", 4, 2),
  t("averageTicket", "combos", "Criar combos com margem protegida", "O cliente escolhe avulso e a empresa não dirige o mix.", "Se combos bem precificados existirem, parte das vendas migra para um ticket maior.", 3, 3),
  t("averageTicket", "pacotes", "Oferecer pacotes de recorrência / volume", "A venda é transacional e o cliente não vê razão para comprar mais de uma vez.", "Se pacotes mensais ou de manutenção existirem, o ticket e a previsibilidade sobem juntos.", 4, 3),
  t("averageTicket", "premium", "Introduzir linha ou mix premium", "Não há alternativa de maior valor percebido para quem pagaria mais.", "Se uma opção premium for clara, uma fatia das vendas pode migrar para cima.", 3, 4),

  t("recurrence", "crm", "Registrar clientes em rotina de CRM simples", "A base não é acompanhada e o retorno depende de memória.", "Se houver cadastro e próximo contato, a recompra deixa de ser acidental.", 5, 3),
  t("recurrence", "recompra", "Disparar campanhas de recompra no prazo certo", "O cliente some depois da primeira compra sem convite para voltar.", "Se o retorno for pedido no ciclo natural do serviço, a recorrência pode subir.", 4, 2),
  t("recurrence", "fidelizacao", "Criar mecanismo simples de fidelização", "Não há motivo estruturado para o cliente preferir voltar.", "Se um benefício por frequência existir, parte da base vira recompra.", 4, 3),
  t("recurrence", "posvenda", "Implantar pós-venda em 48 horas", "O relacionamento acaba na entrega, sem checagem de satisfação.", "Se o pós-venda for padrão, reclamações e recompras aparecem mais cedo.", 4, 2),
  t("recurrence", "retorno", "Programar campanhas de retorno por segmento", "Toda a base recebe a mesma mensagem — ou nenhuma.", "Se o recado for por tipo de serviço e data da última visita, o retorno tende a melhorar.", 3, 3),

  t("referral", "programa", "Lançar programa formal de indicação", "Indicação acontece só por acaso, sem regra nem recompensa.", "Se houver um programa simples, mais clientes ativos passam a indicar.", 5, 3),
  t("referral", "embaixadores", "Identificar embaixadores da carteira", "Os melhores clientes não são tratados como canal.", "Se os promotores forem nutridos, a indicação se concentra em quem já confia.", 3, 3),
  t("referral", "beneficio", "Oferecer benefício claro por indicação", "Não há troca objetiva que justifique o esforço de indicar.", "Se o benefício for fácil de explicar, o pedido de indicação ganha tração.", 4, 2),
  t("referral", "pedido", "Padronizar o pedido de indicação no atendimento", "A equipe não pede indicação no momento de maior satisfação.", "Se o pedido for roteiro, a taxa de indicações deixa de depender de personalidade.", 4, 1),
  t("referral", "prova", "Usar casos e depoimentos para estimular indicação", "O cliente não tem material para recomendar com segurança.", "Se houver prova social pronta, indicar a empresa fica mais fácil.", 3, 2),

  t("brandImage", "posicionamento", "Clarificar o posicionamento da marca", "O mercado não entende o que diferencia a empresa.", "Se a promessa for única e repetida, a imagem deixa de competir só por preço.", 4, 3),
  t("brandImage", "identidade", "Alinhar identidade visual e verbal", "A comunicação é inconsistente entre canal, loja e material.", "Se a identidade for única, a percepção de profissionalismo sobe.", 3, 4),
  t("brandImage", "prova-social", "Ampliar prova social visível", "Há pouca evidência pública de que a empresa entrega o que promete.", "Se avaliações e casos ficarem visíveis, a confiança de entrada aumenta.", 4, 2),
  t("brandImage", "avaliacoes", "Pedir e publicar avaliações com rotina", "As avaliações existem, mas não são pedidas nem organizadas.", "Se toda entrega pedir avaliação, a imagem pública acompanha o serviço real.", 4, 2),
  t("brandImage", "reputacao", "Tratar reputação e reclamações em SLA", "Críticas ficam sem resposta e contaminam a percepção.", "Se a resposta for rápida e pública quando couber, a imagem se recupera.", 3, 3),

  t("commercialImage", "apresentacao", "Redesenhar a apresentação comercial", "O primeiro contato não transmite clareza nem valor.", "Se a apresentação for padronizada, a imagem comercial fica menos pessoal e mais profissional.", 4, 3),
  t("commercialImage", "proposta", "Padronizar propostas e orçamentos", "Cada proposta nasce diferente, com ruído de preço e escopo.", "Se o modelo for único, o cliente compara menos e entende melhor o que compra.", 4, 2),
  t("commercialImage", "catalogo", "Organizar cardápio / catálogo / portfólio", "A oferta é difícil de navegar e o time vende o que lembra.", "Se o catálogo for claro, a conversão e o ticket se apoiam na mesma clareza.", 4, 3),
  t("commercialImage", "materiais", "Criar materiais de apoio à venda", "O vendedor não tem peça para explicar benefício e prova.", "Se houver um kit simples, a imagem comercial fica consistente em qualquer boca.", 3, 3),
  t("commercialImage", "argumentos", "Definir argumentos de valor (não só preço)", "A conversa cai em desconto porque o valor não está articulado.", "Se os 3 argumentos principais forem treinados, a imagem deixa de ser commodity.", 4, 2),

  t("operations", "processo", "Mapear e padronizar o processo crítico", "A entrega muda conforme o dia e a pessoa.", "Se o processo-chave tiver padrão, retrabalho e quebra de promessa caem.", 5, 3),
  t("operations", "sla", "Definir SLA de entrega e comunicação", "O cliente não sabe quando recebe e a operação não sabe o combinado.", "Se o SLA for explícito, a operação consegue ser cobrada e o cliente espera certo.", 4, 2),
  t("operations", "produtividade", "Medir produtividade do gargalo operacional", "Não se sabe onde o tempo se perde na entrega.", "Se o gargalo for medido, o esforço de melhoria deixa de ser chute.", 4, 3),
  t("operations", "escala", "Preparar capacidade antes de acelerar atração", "Vender mais hoje quebraria a entrega.", "Se a capacidade for dimensionada, crescimento não destrói a operação.", 4, 4),
  t("operations", "padrao", "Criar checklist de qualidade da entrega", "A consistência depende de memória e boa vontade.", "Se o checklist for obrigatório, o padrão sobe mesmo com time rotativo.", 4, 2),

  t("finance", "dre", "Implantar DRE mensal simples", "O resultado aparece tarde demais, ou não aparece.", "Se houver DRE no fechamento do mês, decisões deixam de ser no escuro.", 5, 3),
  t("finance", "margem", "Proteger margem por produto/serviço", "A empresa fatura, mas não sabe o que de fato sobra.", "Se a margem por linha for visível, o mix pode ser corrigido.", 5, 3),
  t("finance", "cmv", "Revisar CMV e estrutura de custos variáveis", "Custo da mercadoria/serviço come o resultado sem alarme.", "Se o CMV for acompanhado, desperdício e precificação ruim aparecem.", 4, 3),
  t("finance", "folha", "Enquadrar folha na realidade de caixa", "A folha cresce desconectada da geração de caixa.", "Se a folha for lida contra faturamento e caixa, o risco fica explícito.", 4, 4),
  t("finance", "caixa", "Separar caixa, capital de giro e resultado", "Lucro no papel convive com aperto de caixa.", "Se o caixa for projetado em 4–8 semanas, a empresa antecipa sufoco.", 5, 3),

  t("managementData", "kpis", "Definir 5 KPIs inegociáveis", "Sobram opiniões e faltam indicadores que guiem a semana.", "Se 5 números forem lidos sempre, a gestão deixa de operar no feeling.", 5, 2),
  t("managementData", "metas", "Traduzir objetivo em metas semanais", "O objetivo anual não desce para o time.", "Se a meta da semana for única, execução e diagnóstico se encontram.", 4, 2),
  t("managementData", "rotina", "Criar rotina semanal de gestão", "Os números existem, mas ninguém senta para decidir com eles.", "Se houver uma reunião curta com pauta, o dado vira decisão.", 4, 2),
  t("managementData", "dashboard", "Montar dashboard mínimo da operação", "A informação está espalhada em planilha, WhatsApp e memória.", "Se o painel único existir, o atraso de reação diminui.", 4, 3),
  t("managementData", "governanca", "Registrar decisões e donos", "Combinados se perdem e ninguém é cobrado.", "Se cada decisão tiver dono e prazo, a gestão ganha rastro — ainda como hipótese de rotina.", 3, 3),
];

export function templatesForDimension(dimension: DiagnosticDimensionKey): OpportunityTemplate[] {
  return OPPORTUNITY_TEMPLATES.filter((item) => item.dimension === dimension);
}

export function templateByKey(key: string): OpportunityTemplate | undefined {
  return OPPORTUNITY_TEMPLATES.find((item) => item.key === key);
}

export function isLowDimensionScore(score: number): boolean {
  return score <= LOW_DIMENSION_MAX;
}
