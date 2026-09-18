# Sprint 8 — Qualidade de pesquisa, relevância e fontes

**Data:** 2026-09-18  
**Commit:** `fix: improve external research relevance and benchmark validation`  
**SHA:** `b395b4bd4bf3ba5e55db418815eae48fbd85e3f7`  
**Branch:** `main`  
**Sprint 9:** não iniciada.

## 1. Causa do ruído

A consulta enviada à Tavily era lexical, não semântica. CMV ia como sigla (`benchmark CMV percentual restaurante Brasil`). O provedor devolvia homônimos empresariais (CMV Group, CMV Informatics, CMV Teknoloji) e diretórios (RocketReach). Não havia filtro pós-busca: o lote ia inteiro para a OpenAI e para os cards.

## 2. Query builder

`buildResearchQuery()` em `lib/research-query.ts` é determinístico.

Entrada: `userQuestion`, `companyContext`, `metric`, `country`, `segment`.  
Saída: `query`, `expandedTerms`, `intent`, `metric`, `country`, `segment`.

Para BENCHMARK no caso J BURGUERS:

`Custo da Mercadoria Vendida CMV restaurantes Brasil benchmark percentual médio faixa referência setorial`

Não envia nome da empresa nem CMV 30% (dado financeiro privado) para a Tavily. Uma chamada, `max_results=8`.

## 3. Expansão semântica

`lib/research-terms.ts` — camada reutilizável, não hardcoded só para CMV.

| Sigla | Expansão (Brasil) |
|---|---|
| CMV | Custo da Mercadoria Vendida |
| DRE | Demonstração do Resultado do Exercício |
| EBITDA | Earnings Before Interest, Taxes, Depreciation and Amortization |
| CAC | Custo de Aquisição de Cliente |
| LTV | Lifetime Value |
| ROI | Retorno sobre Investimento |
| Ticket | Ticket médio |

País Brasil prioriza português quando a expansão existe.

## 4. Filtro de relevância

`filterRelevantSources()` avalia cada hit contra intenção, indicador, segmento, geografia e conteúdo.

Descarta: homônimo, agregador, diretório, mismatch de segmento/geografia, duplicata de domínio, score &lt; 38.

O modelo recebe somente fontes aceitas, com snippet curto e contexto truncado (3.000 caracteres).

## 5. Ranking de fontes

Score interno da **fonte** (não confundir com score de oportunidade): `semanticMatch`, `segmentMatch`, `geographicMatch`, `metricMatch`, `sourceQuality`, `freshness`.

Hierarquia: oficial/governo → instituição setorial → pesquisa reconhecida → educacional/empresarial → publicação especializada → secundária. Penaliza agregadores, perfis, diretórios e SEO genérico.

Não se apresenta percentual falso de confiança ao usuário.

Benchmark: 1 a 4 fontes. Qualidade &gt; quantidade.

## 6. Validação de benchmark

`classifyNumericClaim()` distingue `benchmark` (média/faixa/referência setorial) de `example` (exemplo de cálculo, “se a receita for”, 33,3% didático).

Exemplo de cálculo **não** vira “média nacional” nem “benchmark brasileiro”.

Sem claim de média/faixa sustentado: *“Não encontrei fonte suficientemente confiável para afirmar uma média nacional de CMV para este segmento.”* Referências, se houver, aparecem sem esse rótulo. Nenhum número é inventado.

Fontes divergentes (ex.: 25–30% vs 35–40%) são exibidas lado a lado; nenhuma é escolhida em silêncio.

## 7. Proteção contra homônimos

Mecanismo genérico: se a consulta contém sigla expandida, resultado que usa a sigla só como nome de empresa/pessoa/software/organização (sufixos group, informatics, teknoloji, software, holdings, etc.) é rejeitado. Não é lista exclusiva de CMV.

## 8. Redução de contexto

Tavily busca 8; o filtro reduz a 2–4 (benchmark) antes da OpenAI. Snippets no contexto: 220 caracteres. `wrapExternalAsData` corta em 3.000. Cards na UI: título, domínio, data, classificação, abrir fonte — sem snippet gigante. Debug (`queryOriginal`, `queryExpanded`, received/accepted/rejected) só fora de production (`VERCEL_ENV`/`APP_ENV`/`NODE_ENV`). Sem secrets em log.

## 9. Testes

Suíte preservada + `tests/research-quality.test.ts`:

- CMV → Custo da Mercadoria Vendida
- DRE, EBITDA, CAC, LTV, ROI, ticket
- benchmark restaurante Brasil sem dado privado
- homônimos CMV Group / Informatics / Teknoloji
- rejeição RocketReach
- aceitação de fonte setorial relevante
- mismatch de segmento e geografia
- duplicata de domínio
- exemplo de cálculo ≠ média nacional
- fonte única (sem generalizar)
- benchmarks divergentes
- ausência de benchmark confiável
- ranking oficial &gt; secundária
- limite 4 fontes
- redução de contexto
- caso crítico: *“Compare o CMV de um restaurante brasileiro com o mercado.”*

**163/163** testes passando.

## 10. TypeScript

`npx tsc --noEmit` — 0 erros.

## 11. Lint

`npm run lint` — 0 erros.

## 12. Build

`npm run build` — aprovado.

## 13. Commit SHA

`b395b4bd4bf3ba5e55db418815eae48fbd85e3f7` em `main`.

Git status/diff antes do commit: nenhum `.env`, token, API key ou senha.

## 14. Vercel

Production **Ready**.

- Deploy: `https://a-teia-cacn9wvcf-renato16.vercel.app` (50s)
- Alias: `https://a-teia.vercel.app`
- `GET /api/health`: `ok`, Sprint 8, `0.8.0`, `openaiExposed: false`
- `GET /api/integrations/status`: OpenAI `configured: true` (`gpt-4.1-mini`); Tavily `configured: true`
- Chaves não alteradas nesta hotfix

## 15. Resultado do teste J BURGUERS

Pergunta: *“Compare o CMV desta empresa com a média do mercado brasileiro. Pesquise na web e mostre as fontes utilizadas.”*

Confirmado no banco da aplicação:

| Campo | Valor |
|---|---|
| Empresa | J BURGUERS |
| Segmento cadastrado | ALIMENTAÇÃP (normalizado para `restaurantes`) |
| CMV interno | 30% |
| Query expandida | `Custo da Mercadoria Vendida CMV restaurantes Brasil benchmark percentual médio faixa referência setorial` |
| Query sem 30% / sem nome da empresa | sim |
| Intenção | BENCHMARK |

OpenAI e Tavily seguem configuradas em produção. A chave Tavily **não está no `.env` local**, então a chamada live ao provedor não rodou nesta máquina. O filtro do caso crítico está coberto pelos testes unitários. Walkthrough autenticado no Assistente de produção (clicar, perguntar, ver cards) permanece pendência operacional.

## 16. Fontes aceitas (caso crítico nos testes)

- Fonte setorial de restaurante (ex.: Sebrae / Custo da Mercadoria Vendida em restaurantes, média 28–35%)

Em produção, só entram cards que passarem no mesmo filtro.

## 17. Fontes rejeitadas (caso crítico nos testes)

- CMV Group Management Team — homônimo
- CMV Informatics — homônimo
- CMV Teknoloji — homônimo
- RocketReach / página de e-mails — agregador/diretório

## 18. Pendências reais

- Walkthrough autenticado no Assistente de produção com a pergunta J BURGUERS (exige login; não há Tavily no ambiente local desta sessão).
- Segmento persistido como `ALIMENTAÇÃP` (typo de cadastro). O normalizador ainda mapeia para restaurantes via `alimenta`.
- Sprint 9 não iniciada.

Fonte externa continua **não** sendo evidência interna. Score de oportunidade inalterado.
