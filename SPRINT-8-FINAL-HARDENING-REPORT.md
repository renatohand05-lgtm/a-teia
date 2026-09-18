# Sprint 8 — Hardening final: benchmark, fontes e UX executiva

**Data:** 2026-09-18  
**Commit:** `fix: harden benchmark validation and executive research UX`  
**SHA:** `953aa67d1ad051ff24698a3e254cc5f2e6393a09`  
**Branch:** `main`  
**Sprint 9:** não iniciada.

## 1. Problema original

A pesquisa já filtrava homônimos, mas ainda promovia números de artigos, exemplos e calculadoras a “CMV médio saudável entre 28% e 32%”. Qualquer `%` virava faixa; min–max virava “benchmark”; a OpenAI reescrevia o resumo com linguagem de média nacional sem sustentação.

## 2. Arquitetura final

Pipeline determinístico:

Tavily → normalize → classify → semantic filter → ranking → `validateBenchmarkClaim()` → síntese → redução de contexto → OpenAI (opcional, guardada).

OpenAI não decide sozinha se fonte ruim é boa. Regras críticas ficam em `lib/research-claims.ts`.

## 3. Classificação de claims

`EXAMPLE | FORMULA | REFERENCE | BENCHMARK | STATISTIC | OFFICIAL_DATA | OPINION | UNKNOWN`

“Em nosso exemplo, estoque inicial…” = EXAMPLE.  
“CMV ideal pode variar…” = REFERENCE.  
“Pesquisa com 2.000 restaurantes…” = STATISTIC.  
“Dado oficial do IBGE…” = OFFICIAL_DATA.

## 4. Validação de benchmark

`validateBenchmarkClaim()` só marca `nationalEligible` com tipo forte + segmento + geografia + (amostra, metodologia, fonte oficial ou estudo).

Sem isso, o texto usa “referências encontradas”, nunca “média brasileira é X”.

## 5. Níveis de fonte

A oficial/setorial robusto · B estudo com método · C referência especializada · D exemplo/calculadora/opinião · E insuficiente.

São qualidade da fonte, não % de confiança.

## 6. Outliers

`suspectedOutlier` para 100% de fórmula, multiplicação por 100 e valores isolados ≥ 90% quando o restante está abaixo de 50%. Não apaga a fonte em silêncio; exclui da síntese de média.

## 7. Divergência

Não gera `28%–100%` nem escolhe `28%–32%` por conveniência. Cada fonte mantém a faixa que ela própria declara. A nota descreve diferenças reais.

## 8. Query builder

Continua expandindo CMV → Custo da Mercadoria Vendida. Query de benchmark inclui estudo, pesquisa, relatório, associação, média/faixa de setor. Sem nome da empresa, faturamento ou CMV interno.

Camadas: até 2 chamadas Tavily. Se a primeira já trouxer fonte A/B ou ≥ 2 aceitas, a segunda não dispara.

## 9. Ranking

Authority, relevância semântica/segmento/geografia/métrica, suporte metodológico, freshness, tipo de claim. Penaliza calculadora, exemplo, diretório, agregador, SEO e homônimo.

## 10. Fontes rejeitadas

Não entram na UI. Auditoria em `ResearchFinding.rejectedReason` (homonym, aggregator, directory, segment/geography mismatch, duplicate, low_relevance, example_only, no_metric_context, outlier_context, untrusted_source).

## 11. UX executiva

Resumo curto. Ações ligadas à pergunta (acompanhar CMV, histórico interno, Diagnóstico 360°, ficha técnica só com evidência interna). “Ver análise completa” e “Ver dados utilizados” recolhidos. Cards: tipo, título, domínio, data, nível, por que foi usada, abrir fonte. Máximo 4. Sem rótulo universal “Dados divergentes”.

## 12. Persistência

Migration incremental `20260918120000_sprint8_benchmark_hardening`:

`claimType`, `qualityLevel`, `relevanceReason`, `rejectedReason`, `benchmarkEligible`, `suspectedOutlier` em `AISource` e `ResearchFinding`. Banco não foi resetado.

## 13. Segurança

Owner isolation, SSRF, prompt injection, secrets server-side, limites, timeout, fallback. Query sem dado financeiro privado. OpenAI descarta narrativa com “média brasileira é…” se não houver claim nacional elegível.

## 14. Custo / limites

`maxExternalQueries=2`, `maxAcceptedSources=4`, `tavilyFetchCount=8`, `maxSourceCharacters=220`, `maxAIContextCharacters=2500`. Cache com TTL (6h; 1h se temporal) e `fetchedAt`/aviso de cache.

## 15. Testes

175/175. Inclui os 163 anteriores + `tests/research-hardening.test.ts` (exemplo, fórmula ×100, calculadora, referência vs estudo, geografia, outlier, divergência, claim com sourceIds, J BURGUERS, 4 cards, fallback, KPIs).

## 16. TypeScript

`npx tsc --noEmit` — 0.

## 17. Lint

`npm run lint` — 0.

## 18. Build

`npm run build` — aprovado.

## 19. Migration

`database/migrations/20260918120000_sprint8_benchmark_hardening` aplicada no banco Neon (ADD COLUMN, sem drop).

## 20. Commit SHA

`953aa67d1ad051ff24698a3e254cc5f2e6393a09`

Nenhum `.env`, `sk-`, `tvly-` ou Bearer real no Git.

## 21. Vercel Production

**Ready** — `https://a-teia.vercel.app`  
Deploy: `https://a-teia-4pxd13vvl-renato16.vercel.app` (48s)

## 22. integrations/status

```json
{
  "openai": { "configured": true, "provider": "openai", "model": "gpt-4.1-mini" },
  "webSearch": { "configured": true, "provider": "tavily" },
  "environment": "production"
}
```

## 23. Teste J BURGUERS

Automatizado com CMV interno 30%, segmento alimentação/restaurante, pergunta de média do mercado brasileiro.

A resposta **não** diz “média brasileira é 28–32%” quando só há referências práticas. Usa: CMV 30%; fontes citam referências; sem sustentação para média nacional. Fonte externa ≠ evidência interna.

Walkthrough autenticado no Assistente de produção (clicar, pesquisar, abrir fonte) permanece operacionalmente pendente nesta sessão.

## 24. Fontes aceitas (testes)

Referência especializada / estudo ou Sebrae quando o texto afirma média com recorte. Cards no máximo 4, com tipo e motivo.

## 25. Fontes rejeitadas (testes)

CMV Group, CMV Informatics, CMV Teknoloji, RocketReach, fórmula “multiplique por 100”, exemplo/calculadora na síntese de média.

## 26. Pendências reais

- Walkthrough autenticado em produção com a pergunta J BURGUERS.
- Typo de cadastro `ALIMENTAÇÃP` (o normalizador ainda mapeia para restaurantes).
- Sprint 9 não iniciada.
