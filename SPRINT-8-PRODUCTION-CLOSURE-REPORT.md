# Sprint 8 — Relatório de encerramento de produção

**Data:** 2026-09-18  
**Commit:** `fix: finalize research relevance and executive assistant UX`  
**Branch:** `main`  
**Sprint 9:** não iniciada.

## 1. Fonte irrelevante identificada

No walkthrough autenticado de J BURGUERS (CMV 30%, meta 28%), entrou uma notícia **“Copa Brasil de Kart movimentou mais de R$ 700 mil…”**.

## 2. Causa

O filtro anterior pontuava sobreposição lexical fraca (`Brasil`, números, domínio de imprensa). Não havia gate de relevância semântica de título + snippet + métrica + segmento. Uma palavra isolada bastava para a fonte passar do threshold de ranking e ir para a OpenAI.

## 3. Filtro implementado

`isSemanticallyRelevantSource()` em `lib/research-filter.ts`, aplicado **antes** de `MIN_ACCEPT`, ranking, cards e OpenAI.

Rejeição dura:

- título off-topic sem vínculo de métrica/segmento → `semantic_mismatch`
- snippet off-topic com título genérico → `semantic_mismatch`
- score semântico &lt; 4 ou ausência de sinal de métrica **e** segmento → `low_semantic_relevance`

A fonte rejeitada é persistida para auditoria (`rejectedReason`) e **não** entra em `selectSourcesForIntent` nem no bloco enviado à OpenAI.

## 4. Regras de semantic relevance

Sinais (conforme a intenção, não só CMV):

- métrica: CMV / Custo da Mercadoria Vendida / food cost / COGS, e equivalentes de margem, folha, EBITDA, CAC, LTV, ROI, ticket, conversão, estoque, delivery, produtividade
- segmento: restaurante/alimentação, oficinas, e o segmento do plano
- operação: custos, estoque, compras, ficha técnica, margem, KPI

Off-topic penalizado: kart, futebol, copa, celebridade, polícia, eleição, novela, F1, NBA/NFL, etc.

## 5. Tratamento de EXAMPLE / CALCULATOR / FORMULA

Em pergunta de benchmark (não “como calcular”):

- `claimType` EXAMPLE ou FORMULA → `rejectedReason = example_only`
- página de calculadora → mesma rejeição
- não entram nos cards principais
- permanecem no persistido de auditoria
- só voltam aos cards se a pergunta for especificamente de cálculo/fórmula/exemplo

## 6. BENCHMARK vs REFERENCE

`validateBenchmarkClaim()` rebaixa BENCHMARK → REFERENCE quando o texto é ideal/saudável/recomendado/faixa sugerida, ou quando a fonte não é oficial/estudo/primária e não tem amostra/metodologia.

Blog com faixa 18–25% sugerida = `REFERENCE` / `REFERÊNCIA ESPECIALIZADA`, não BENCHMARK.

## 7. UX executiva

Resposta padrão estruturada:

- RESUMO EXECUTIVO (CMV atual, meta, desvio em p.p.)
- COMPARAÇÃO EXTERNA (curta; sem média nacional inventada)
- LEITURA (desvio interno; comparação indicativa)
- AÇÃO RECOMENDADA (uma ação, nascida dos dados)
- FONTES (0–4 cards reais)

Não afirma desperdício, compras erradas ou ficha técnica errada. Isso fica como **hipótese** a investigar.

## 8. Componentes expansíveis

Fechados por padrão:

- Ver análise completa
- Ver dados utilizados
- Ver metodologia

Cards de fonte ficam no cockpit (qualidade &gt; quantidade). Classificação aparece uma vez. Data ausente = “Data não identificada” (sem repetir “sem data”).

## 9. Redução de contexto

OpenAI recebe somente fontes aceitas. Snippets cortados em 160 caracteres. Payload de pesquisa truncado em 1.800 caracteres (`maxAIContextCharacters`).

## 10. Redução de tokens

Benchmark **não substitui** o resumo determinístico pela narrativa longa da OpenAI (limite 560 caracteres; se passar, descarta). Menos ruído no prompt e resposta mais estável. Número de chamadas externas **não aumentou** (Tavily ainda 1–2 queries; OpenAI 1).

## 11. Testes

198/198 (175 anteriores + 23 em `tests/research-closure.test.ts`).

Cobertura nova: kart, notícia irrelevante, mismatch de título/snippet/métrica/segmento, fonte relevante aceita, EXAMPLE/CALCULATOR/FORMULA fora dos cards, 2/1/0 fontes, máximo 4, duplicidade de classificação e divergência, resumo executivo compacto, detalhe técnico recolhido, KPIs internos no collapse, hipótese ≠ evidência, REFERENCE não vira BENCHMARK, rejeitada não vai à OpenAI, owner/fallback preservados, regressão J BURGUERS.

## 12. TypeScript

`npx tsc --noEmit` — 0 erros.

## 13. Lint

`npm run lint` — 0 erros.

## 14. Build

`npm run build` — aprovado.

## 15. Migration

Nenhuma neste hotfix. Colunas `claimType` / `rejectedReason` já existiam na migration `20260918120000_sprint8_benchmark_hardening`.

## 16. Commit SHA

Preenchido após o commit em `main`.

## 17. Vercel

Aguardando Production Ready após o push em `main`.

## 18. OpenAI

Server-side `OPENAI_API_KEY`. Status de produção na última verificação: `configured: true`, modelo `gpt-4.1-mini`. Revalidar `/api/integrations/status` após o deploy.

## 19. Tavily

Server-side `TAVILY_API_KEY`. Status de produção na última verificação: `configured: true`, `provider: tavily`. Revalidar após o deploy.

## 20. Teste J BURGUERS

Automatizado (CMV 30%, meta 28%, alimentação/restaurante, pergunta de média brasileira):

- CMV atual 30%; meta 28%; desvio +2 p.p.
- fontes relevantes podem divergir; **não** há média nacional única
- leitura indicativa; ação de acompanhamento semanal
- **não** aparece: Copa Brasil de Kart, CMV Group, CMV Informatics, CMV Teknoloji, RocketReach
- EXAMPLE/CALCULATOR/FORMULA fora dos cards principais

Walkthrough autenticado no Assistente de produção (clicar, pesquisar, abrir fonte) permanece **pendência operacional** desta sessão — não bloqueia o encerramento técnico do motor.

## 21. Fontes aceitas (regra)

OFFICIAL_DATA, STATISTIC, BENCHMARK e REFERENCE com relevância semântica real. Quantidade: as que passarem, no máximo 4. Se só houver 2, mostra 2.

## 22. Fontes rejeitadas (regra)

Kart e notícia off-topic (`semantic_mismatch`), overlap lexical insuficiente (`low_semantic_relevance`), homônimo, agregador, diretório, mismatch de segmento/geografia, EXAMPLE/FORMULA/calculadora em benchmark (`example_only`).

## 23. Pendências reais

1. Walkthrough autenticado em produção após o deploy Ready (J BURGUERS no Assistente).
2. Confirmar `/api/integrations/status` no alias de produção depois do Vercel Ready.

Nenhuma pendência bloqueante do motor: filtro, cards, resumo executivo, testes, tsc, lint e build passaram localmente.

## Encerramento

Do ponto de vista técnico local, o Sprint 8 pode ser considerado **ENCERRADO** após Production Ready + checagem de status. Sprint 9 não foi iniciada.
