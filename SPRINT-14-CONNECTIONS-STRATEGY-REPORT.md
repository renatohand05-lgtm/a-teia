# Sprint 14 — Motor de Conexões + Estratégias Cruzadas

**Versão:** permanece **1.0.0**  
**Data:** 2026-09-21  
**Branch:** `main`

## Estado inicial

Conexões e Estratégia estavam em “Em breve”. Schema tinha `Connection` e `Strategy` mínimos, sem motor, sem UI, sem isolamento por owner. QA real apontava prioridade divergente, decisões “Sem empresa”, alocação duplicada, spam `cockpit.viewed` e pesquisa externa contraditória.

## Models reutilizados

- `Connection` e `Strategy` evoluídos (aditivo).
- `Opportunity.origin` ganhou `STRATEGY`.
- `StrategicMemory`, `Evidence`, `Company`, `Diagnosis` lidos, não duplicados.

## Migration

`20260921080000_sprint14_connections_strategy_engine` — aditiva, aplicada com `prisma migrate deploy`. Sem reset. Sem seed.

## Regras do motor / Connection Score

Versão `connection-score-1.0`. Score 0–100 = **prioridade para análise**, não probabilidade. Fatores: segmento, público, necessidade, potencial econômico, facilidade/velocidade de teste, evidência interna, memória validada, risco e esforço. Ausência → fator omitido e **Score parcial**. Sem dado suficiente o score não é inventado.

Sugestões nascem como **HIPÓTESE**. Evidência de A não vira evidência de B. Fonte externa permanece fonte externa.

## Segurança

Owner isolation em conexão e estratégia (`requireOwnedResource`). ID manipulado → FORBIDDEN. IA não valida, não converte e não move dinheiro.

## Qualidade

- TypeScript: passou
- Lint: passou
- Testes: 351/351 (47 arquivos)
- Build: passou
- Commit: `d05fa43`
- Vercel Production: **Ready** — https://a-teia.vercel.app (`dpl_9apk26q97mD7BB6CMdbapXXWbtZj`)
- Health: status ok, release 1.0, version 1.0.0, openaiExposed false, webSearchConfigured true, automationEngine ok, scheduler configured, database ok

## QA real

- Prioridade Empresas/Cockpit: mesma fonte operacional (`loadPortfolioBundle`).
- Decisão sem empresa → rótulo **Portfólio**.
- Alocação já enviada não gera nova decisão.
- `cockpit.viewed` no máximo 1x/15 min.
- Pesquisa: configurado ≠ disponível ≠ falha da última consulta.
- Sidebar unificada; “Em breve” removido.

## Pendências reais

Walkthrough autenticado visual (mapa/drawer em 1920–mobile) para o Renato. Heatmap/playbooks visuais ficam no futuro.

## Próximo Sprint recomendado

Sprint 15 — playbooks visuais leves e endurecimento do mapa em carteiras grandes, **somente com autorização**.
