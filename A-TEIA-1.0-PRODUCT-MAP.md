# A TEIA 1.0 — Mapa do produto

## Visão

A TEIA é um centro de decisão empresarial para um owner. Consolida empresas, diagnóstico, oportunidades, execução, financeiro, experimentos, evidência, memória, alocação, automações e IA — sem inventar dado ausente e sem executar ação crítica de forma autônoma.

## Arquitetura funcional

`USER → OWNER → COMPANY → RESOURCE → ACTION`

Motores determinísticos no servidor. Persistência Prisma/Neon. Auth.js (JWT). OpenAI e Tavily só no servidor. Cron Vercel com `CRON_SECRET`.

## Jornada principal

Empresa → Dados → Diagnóstico 360° → Oportunidade → Decisão → Plano 30/60/90 → Execução → Experimento → Resultado → Evidência → Memória → Recomendação.

O Cockpit responde: carteira, empresa prioritária, por quê, próxima ação, decisões, alertas, alocação e o que mudou.

## Módulos ativos (OPERACIONAL)

| Módulo | Rota | Banco | Isolamento | Auditoria |
| --- | --- | --- | --- | --- |
| Auth | `/login` | User | sessão | login |
| Cockpit | `/cockpit` | agregado | owner | view |
| Empresas | `/empresas` | Company | ownerId | create/update |
| Diagnóstico | `/empresas/[id]/diagnostico` | Diagnosis | company.owner | created |
| Oportunidades | `/empresas/[id]/oportunidades` | Opportunity | company.owner | created/updated |
| Decisões | `/cockpit#cockpit-decisoes` | Decision | owner | proposed/approved |
| Execução | `/empresas/[id]/execucao` | ActionPlan, Task | company.owner | plan/task |
| Financeiro | `/empresas/[id]/financeiro` | Statement, Cash, Goals | company.owner | dre/cash |
| Experimentos | `/empresas/[id]/experimentos` | Experiment, Evidence | company.owner | completed/validated |
| Memória | `/memoria`, `/empresas/[id]/memoria` | StrategicMemory | company.owner | created/promoted |
| Assistente IA | `/assistente` | AIConversation | userId | question/answer |
| Pesquisa externa | via Assistente | ResearchSession | userId | started/completed |
| Alocação | `/alocacao` | ResourceBudget, AllocationProposal | ownerId | simulated/approved |
| Automações | `/automacoes` | Automation, Alert | ownerId | executed |
| Auditoria | `/auditoria` | AuditLog | actor/company owner | sanitize |

## Módulos parciais

Nenhum módulo do núcleo acima é apresentado como concluído se faltar persistência. Conexões e Estratégia têm schema (`Connection`, `Strategy`) sem motor nem UI operacional.

## Motores

- Diagnóstico 360° e gargalo
- Score de oportunidade (hipótese ≠ evidência)
- Prioridade global do portfólio
- Financeiro gerencial (realizado / projeção / cenário)
- Experimento e classificação de evidência
- Memória estratégica com promoção humana
- Alocação de capital e tempo (simulação ≠ aprovado)
- Automações determinísticas
- IA executiva + pesquisa Tavily

## Governança

Human-in-the-loop. IA não aprova decisão, não move capital, não valida evidência, não promove memória, não ativa automação. Mass assignment bloqueado. Rate limit em login, IA, pesquisa, automação e cron.

## Integrações atuais

- OpenAI (servidor)
- Tavily (servidor)
- Vercel Cron `/api/cron/automations`

## Módulos futuros

- Conexões entre empresas
- Estratégia cruzada / playbooks
- Canais externos (e-mail, WhatsApp, Slack)
- Importação financeira/CRM
- RBAC além de owner
