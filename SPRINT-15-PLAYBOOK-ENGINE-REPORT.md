# Sprint 15 — Playbooks estratégicos + motor de reutilização

**Versão:** permanece **1.0.0**  
**Data:** 2026-09-21  
**Branch:** `main`

## Estado inicial

Não existia model Playbook. KnowledgeKind classifica origem do dado, não biblioteca. Conexões e estratégias do Sprint 14 estavam operacionais; o mapa era um círculo SVG sem limite para carteiras grandes.

## Implementação

Biblioteca `/playbooks` + detalhe, aplicação em outra empresa com confirmação humana, geração a partir de memória aprovada com evidência e de strategy validada com resultado medido. Score de compatibilidade para teste. Mapa de conexões com busca, clustering, limite de nós e lista no mobile.

## Models reutilizados

- `StrategicMemory`, `Evidence`, `Experiment`, `Strategy`, `Connection`, `Opportunity`, `Company` lidos, não duplicados.
- `Opportunity.origin` ganhou `PLAYBOOK`.

## Models novos / migration

`Playbook` e `PlaybookApplication`. Migration aditiva `20260921120000_sprint15_playbook_engine`. Sem reset. Sem seed.

## Playbook Engine

Versão `playbook-compat-1.0`. Playbook nasce **RASCUNHO**. VALIDADO = registro suportado por evidência, não garantia universal.

## Regra de compatibilidade

Score 0–100 = **prioridade para teste**, não probabilidade. Fatores ausentes → score parcial. Dados não são inventados.

## Transferência

Origem: EVIDÊNCIA. Destino: HIPÓTESE. Sempre. Evidência de A não vira evidência de B.

## Integrações

- Memória aprovada + evidência → CTA Criar playbook
- Strategy VALIDADA + resultado medido → CTA Criar playbook
- Conexão → playbooks relacionados como “Possível aplicação”
- IA consulta playbooks; não valida
- Fonte externa permanece fonte externa
- Cockpit: playbooks validados / reutilizações ativas, “Sem dados” sem empresas

## Segurança / owner isolation

`requireOwnedResource` em playbook e playbookApplication. ID manipulado → FORBIDDEN.

## Hardening do mapa

Limite 24 nós, clustering por segmento, busca, foco, esconder baixa relevância, zoom/fit/reset, lista no mobile. 50+ empresas preferem lista.

## Qualidade

- TypeScript: passou
- Lint: passou
- Testes: 363/363 (49 arquivos)
- Build: passou
