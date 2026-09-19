# Refinamento 1.0 — Bloco 8

**Escopo:** Jornada end-to-end + integração entre módulos + consistência do produto  
**Data:** 2026-09-19  
**Commit:** `refactor: refinement 8 end-to-end journey and module integration`  
**SHA:** pendente neste arquivo até o commit  
**Branch:** `main`  
**Versão:** permanece **1.0.0**  
**Bloco 9:** não iniciado  
**Migrations:** nenhuma

## Estado inicial

Release 1.0 e Blocos 1–7 já entregavam os motores e as rotas. A jornada conceitual existia em `nextCockpitAction` / `JOURNEY_STAGES`, mas o produto ainda se sentia como módulos justapostos:

- Hub da empresa sem trilha Cadastro → Memória com ✓ / Pendente / 0 / Sem dados / Sem plano
- Cockpit usava “Ver empresa” mesmo quando o sinal já tinha `href` específico (ex.: diagnóstico)
- Oportunidade pulava “Revisar para decisão”; decisão aprovada não distinguia criar vs abrir plano
- Nomenclatura misturava Execução, Plano de execução e Plano 30/60/90
- Auditoria mostrava entity técnica e IDs, sem abrir o recurso
- CTAs de IA incompletos fora da empresa e do Cockpit
- Datas sem timezone explícito; BRL sem centavos padronizados

## Mapa da jornada real

`Empresa → Dados/Financeiro → Diagnóstico 360° → Oportunidade → Decisão → Plano 30/60/90 → Tarefa → Experimento → Resultado → Evidência → Memória Estratégica → nova recomendação`

Transversais: Financeiro, Assistente IA, pesquisa externa (opcional), Alocação, Automação, Alerta, Auditoria.

Conexões e Estratégia continuam **Em breve**, sem `href="#"`.

## Arquivos alterados

- `lib/journey-ui.ts` (novo) — nomenclatura, chips, CTAs, origem de memória, href de auditoria
- `lib/cockpit.ts`, `lib/company-nav.ts`, `lib/opportunity-ui.ts`, `lib/assistant-ui.ts`, `lib/audit-ui.ts`, `lib/format.ts`, `types/index.ts`
- Hub e módulos: `CompanyCockpit`, `OpportunityDetail`, `DiagnosticResult`, Cockpit, Alocação, Auditoria, páginas de financeiro, execução, experimento e memória
- `components/ui/PendingButton.tsx`
- `tests/refinement-journey.test.ts` + ajustes de labels em testes existentes
- `BACKLOG-POS-SPRINT-13.md`

Não alterados: Prisma, engines determinísticos, version 1.0.0, Conexões, Estratégia.

## Rotas auditadas

`/cockpit`, `/empresas`, `/empresas/[id]` e módulos (diagnóstico, oportunidades, execução, financeiro, experimentos, memória, assistente), `/alocacao`, `/automacoes`, `/auditoria`, `/memoria`, `/assistente`. Conexões/Estratégia sem CTA falso.

## Links e integrações corrigidos

- Prioridade do Cockpit abre o recurso certo (`item.href`) com CTA contextual
- Diagnóstico → “Analisar oportunidades” (revisar/salvar; não cria sozinho)
- Oportunidade → “Revisar para decisão”; plano existente → “Abrir plano”
- Decisão aprovada → criar ou abrir plano 30/60/90; rejeitada não sugere execução
- Experimento → “Registrar resultado” / “Transformar em aprendizado”
- Auditoria → “Abrir recurso” só com `companyId` seguro do owner
- “Analisar com IA” contextual em diagnóstico, oportunidade, financeiro, execução, experimento e alocação

## Nomenclatura e status

UI oficial: Empresa, Diagnóstico 360°, Oportunidade, Decisão, Plano 30/60/90, Tarefa, Experimento, Resultado, Evidência, Memória Estratégica, Alocação, Automação, Alerta, Auditoria, Assistente IA.

Enums continuam no banco. Labels amigáveis reutilizam helpers já existentes.

## Contexto e owner isolation

Breadcrumb e tabs da empresa mantêm o nome no `subtitle`. Assistente recebe `companyId` + pergunta. `auditResourceHref` sem empresa retorna `null` para recurso isolado. IDs de outro owner continuam recusados pelos services/`canAccessCompany`.

## Qualidade

- Testes: 322 passed (41 files), inclusive `tests/refinement-journey.test.ts`
- TypeScript: `npx tsc --noEmit` ok
- Lint: `npm run lint` ok
- Build: `npm run build` ok

## Produção

Commit e push em `main`. Deploy Vercel Production a registrar após o push. Health esperado: release 1.0, version 1.0.0, openaiConfigured true, webSearchConfigured true, openaiExposed false, automationEngine ok, scheduler configured, database ok.

## Walkthrough

Browser autenticado **não disponível** neste ambiente. Pendência não bloqueante: Cockpit → J BURGUERS → Financeiro → Diagnóstico → Oportunidades → Decisão → Execução → Experimento → Evidência → Memória → Assistente → Alertas → Auditoria, sem criar investimento real.

## Pendências reais

- Walkthrough autenticado com J BURGUERS
- Deploy Vercel se a CLI local falhar por autorização (mesmo risco do Bloco 7)
- Pente-fino visual (Bloco 9 / final)

## Backlog

Itens anteriores preservados. Seção **REFINAMENTO 1 — BLOCO 8** adicionada com skeleton da jornada, heatmap, tooltips de estágios, drawer de auditoria e polimento visual.
