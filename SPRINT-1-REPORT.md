# SPRINT 1 — Relatório

**Projeto:** a-teia  
**Data:** 2026-09-17  
**Commit:** `feat: Sprint 1 onboarding and diagnostic 360 core`

A Sprint 0 permanece intacta: autenticação, Prisma/PostgreSQL, Cockpit V9, cadastro de empresas e isolamento por `ownerId`.

## O que foi implementado

Fluxo operacional persistido no PostgreSQL:

`EMPRESA → ONBOARDING → DIAGNÓSTICO 360° → SCORE → GARGALO → PRIORIDADES (base)`

- Onboarding operacional 1:1 por empresa (criar, editar, salvar, continuar depois).
- Diagnóstico 360° oficial com 10 dimensões, notas 1–5 e textos explicativos.
- Score 360 automático na escala 0–100, classificação de maturidade e gargalo(s) pela menor nota.
- Distinção explícita: notas = **DADO**; gargalo = **INFERÊNCIA** matemática — não evidência validada.
- Histórico append-only: novo diagnóstico = nova linha. Idempotência via UUID para evitar duplo envio.
- Mini cockpit na página da empresa, com módulos futuros como “Em breve”.
- Páginas autenticadas; empresa inacessível por URL de outro `ownerId`.

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `lib/diagnostic.ts` | Dimensões, Score 360, maturidade, gargalos |
| `lib/onboarding.ts` | Status DRAFT / COMPLETE |
| `lib/access.ts` | Sessão + empresa do dono |
| `lib/access-policy.ts` | Isolamento por owner (testável sem Next) |
| `services/onboardingService.ts` | Upsert de onboarding |
| `services/diagnosisService.ts` | Criação e leitura de diagnósticos |
| `app/empresas/diagnostic-actions.ts` | Server actions |
| `app/empresas/[id]/onboarding/page.tsx` | Tela de onboarding |
| `app/empresas/[id]/diagnostico/page.tsx` | Tela 360° |
| `app/empresas/[id]/diagnostico/historico/page.tsx` | Histórico |
| `components/companies/OnboardingForm.tsx` | Formulário operacional |
| `components/companies/DiagnosticForm.tsx` | Notas 1–5 |
| `components/companies/DiagnosticResult.tsx` | Score, barras, gargalo |
| `components/companies/CompanyCockpit.tsx` | Mini cockpit |
| `tests/diagnostic.test.ts` | Regras, validação, isolamento |
| `tests/persistence.test.ts` | PostgreSQL real |
| `tests/setup-env.ts` | Carrega `.env` nos testes |
| `tests/server-only-stub.ts` | Stub Vitest para `server-only` |
| `database/migrations/20260917120000_sprint1_onboarding_diagnosis/migration.sql` | Migration Sprint 1 |
| `SPRINT-1-REPORT.md` | Este relatório |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `database/schema.prisma` | `CompanyOnboarding`, enum `OnboardingStatus`, campos de histórico no `Diagnosis` |
| `lib/validations.ts` | Schemas de onboarding e diagnóstico |
| `app/empresas/actions.ts` | Após criar empresa, redireciona ao onboarding |
| `app/empresas/[id]/page.tsx` | Mini cockpit + cadastro técnico |
| `types/index.ts` | Navegação futura sem item 360 desativado (fluxo agora vive na empresa) |
| `vitest.config.ts` | `setupFiles` + alias `server-only` |

## Modelos Prisma

Reuso da Sprint 0: `User` → `Company` → `Diagnosis` → `DiagnosisDimension`.

Novo:

```
User
 └─ Company
     ├─ CompanyOnboarding (1:1, editável)
     └─ Diagnosis[] (append-only)
         └─ DiagnosisDimension[] (1 linha por dimensão)
```

`CompanyOnboarding`: cidade, UF, ticket médio, clientes/mês, recorrência estimada, status, `completedAt`. Nome, segmento, faturamento, equipe, canais, objetivo, gargalo percebido e observações continuam em `Company` (fonte da Sprint 0), sincronizados no upsert.

`Diagnosis` (estendido): `createdById`, `rawTotal`, `overallScore`, `maturity`, `bottleneck`, `bottlenecks` (JSON), `scoresKind=INTERNAL_DATA`, `bottleneckKind=INFERENCE`, `idempotencyKey` único.

Não foi criado `DiagnosticScore` separado: cada nota já é uma `DiagnosisDimension`.

## Migration

`20260917120000_sprint1_onboarding_diagnosis`

Aplicada com:

```bash
npx prisma migrate deploy --schema database/schema.prisma
```

Resultado: aplicada com sucesso no PostgreSQL apontado por `DATABASE_URL` (Neon `neondb`).

## Rotas

| Rota | Função |
| --- | --- |
| `/empresas` | Lista (Sprint 0) |
| `/empresas/nova` | Cadastro → redireciona ao onboarding |
| `/empresas/[id]` | Mini cockpit |
| `/empresas/[id]/onboarding` | Preencher / continuar / ver onboarding |
| `/empresas/[id]/diagnostico` | Realizar / ver último 360° |
| `/empresas/[id]/diagnostico/historico` | Evolução (lista) |

Ações na empresa: Continuar onboarding, Realizar diagnóstico, Ver último diagnóstico, Ver histórico.

## Regras do Score 360

10 dimensões × máximo 5 = 50 pontos.

```
Score 360 = (soma das notas / 50) × 100
```

Exemplo: 30/50 → **60 / 100**.

Faixas centralizadas em `MATURITY_BANDS` (`lib/diagnostic.ts`):

| Score | Classificação |
| --- | --- |
| 0–39 | Crítico |
| 40–59 | Em estruturação |
| 60–74 | Em desenvolvimento |
| 75–89 | Estruturado |
| 90–100 | Alta maturidade |

Gargalo = todas as dimensões com a menor nota (empate registrado). Não inventa causa.

Dimensões (nesta ordem): Atração, Conversão, Ticket Médio, Recorrência, Indicação, Imagem da Marca, Imagem Comercial, Operação, Financeiro, Gestão & Dados.

## Testes realizados

| Teste | Resultado |
| --- | --- |
| Cálculo Score 360 (30/50 → 60) | Passou |
| Classificação de maturidade (limites) | Passou |
| Gargalo = menor nota | Passou |
| Empate de gargalos | Passou |
| Notas 1–5 / rejeição 0, 6, 3.5 | Passou |
| Validação payload 10 dimensões | Passou |
| Persistência onboarding + diagnóstico no PostgreSQL | Passou |
| Idempotência de envio | Passou |
| Isolamento por owner | Passou |
| Testes da Sprint 0 (fundação) | Passou |

### `npm test`

```
Test Files  3 passed (3)
     Tests  17 passed (17)
```

### `npm run build`

```
Next.js 15.5.25
✓ Compiled successfully
✓ Generating static pages (9/9)
```

Rotas novas incluídas no build: `/empresas/[id]/onboarding`, `/empresas/[id]/diagnostico`, `/empresas/[id]/diagnostico/historico`.

## Segurança

- Middleware continua exigindo `user.id`; não autenticado → `/login`.
- Páginas de empresa usam `requireOwnedCompany` (`getCompany(ownerId, id)`). URL de outra empresa redireciona para `/empresas`.
- `DATABASE_URL`, `AUTH_SECRET` e `OPENAI_API_KEY` não vão ao frontend.
- `.env` permanece no `.gitignore`.

## DEMO vs real

O Cockpit V9 continua marcando ilustrações como **DEMO**. Score, maturidade e gargalo da empresa vêm do PostgreSQL; se não houver diagnóstico, a central mostra “—” — sem número fictício.

## Pendências encontradas

1. O `npm run dev` local foi interrompido para gerar o client Prisma no Windows (DLL do query engine travada). Reiniciar com `npm run dev`.
2. A migration desta máquina foi aplicada no Neon de `DATABASE_URL`. Se a Vercel usar **outro** banco, rodar `npx prisma migrate deploy --schema database/schema.prisma` nesse ambiente.
3. Walkthrough manual do fluxo 15 passos (login → empresa → onboarding → 360° → histórico) ainda precisa ser feito no browser pelo Renato após `npm run dev`.
4. Análise avançada de evolução (gráficos Diagnóstico 01 → 02 → 03) não entra nesta sprint; o histórico em lista já persiste.

## Riscos técnicos

- Latência Neon: o teste de persistência precisa de timeout > 5s.
- Duplo clique: mitigado com `idempotencyKey` único + botão pendente.
- RBAC completo ainda não existe; o isolamento atual é dono da empresa (`ownerId`). Papel `User.role` segue preparado.
- Unique `(diagnosisId, key)` em dimensões antigas: a migration rebatiza `legacy` existente para `legacy_<id>` antes do índice.

## Sugestões para Sprint 2

Não iniciar agora. Quando for:

1. Motor de Oportunidades a partir dos gargalos (ainda como hipótese, não evidência).
2. Plano 30/60/90 ligado ao último diagnóstico.
3. Visual de evolução do Score 360 no histórico.
4. Motor Financeiro (DRE/caixa) usando os campos já persistidos.
5. RBAC multiempresa (papéis além do owner único).

## Critério de conclusão

| Critério | Status |
| --- | --- |
| Onboarding persiste no PostgreSQL | Sim |
| Diagnóstico persiste no PostgreSQL | Sim |
| Score 360 calculado | Sim |
| Maturidade calculada | Sim |
| Gargalo identificado (incl. empate) | Sim |
| Histórico append-only | Sim |
| Autenticação preservada | Sim |
| Empresa isolada por owner | Sim |
| `npm test` | Passou (17) |
| `npm run build` | Passou |
| Migration válida e aplicada | Sim |
| Sem segredos no frontend | Sim |
| Relatório | Este arquivo |
