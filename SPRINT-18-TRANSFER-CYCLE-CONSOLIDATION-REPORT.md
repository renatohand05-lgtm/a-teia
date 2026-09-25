# Sprint 18 — Consolidação visual e operacional do ciclo de transferência

**Versão:** permanece **1.0.0**  
**Data:** 2026-09-25  
**Branch:** `main`

## 1. Estado inicial

Sprints 14–17 entregaram Conexões → Estratégias → Playbooks → Aplicações → decisão → plano → experimento → evidência local → memória. O ciclo funcionava, mas a experiência ainda parecia módulos justapostos: breadcrumbs só em `/empresas`, timeline binária, CTAs dourados competindo no detalhe, empty states divergentes e status cru de experimento.

## 2. Inconsistências encontradas

- Breadcrumbs ausentes em `/conexoes`, `/estrategias`, `/playbooks`, `/aplicacoes` e detalhes.
- Timeline só marcava feito/não feito, sem Atual/Pendente/Bloqueado.
- Detalhe da Application mostrava vários CTAs dourados (aprovar, registrar, criar oportunidade, concluir).
- Compatibilidade sem o rótulo “para teste”.
- Evidência origem/local no mesmo bloco, texto ambíguo.
- Memória sem proveniência explícita.
- Empty states: “persistida / ainda / cruzada” em vez do copy operacional.
- Experimento no detalhe podia mostrar enum cru.
- Mapa sem escala explícita para 50/100 empresas.
- IA sem atalhos “precisa de atenção / replicado / hipótese / evidência no destino”.

## 3. Inconsistências corrigidas

Helpers `intelligenceBreadcrumbTrail` + `timelineStepState`. Detalhe com um CTA dourado principal. Copy de compatibilidade, evidência e memória alinhados. Empty states padronizados. Escala do mapa 1–100. Loading nos detalhes. Sem model novo. Sem migration.

## 4. Navegação

INTELIGÊNCIA e CENTRAL inalterados na ordem. Estado ativo por pathname. Detalhes usam nomes humanos no AppShell.

## 5. Shell

Mesmo `AppShell` / `AppFrame` autenticado em todas as telas do ciclo.

## 6. Breadcrumbs

Conexões → nome da ligação. Estratégias → título. Playbooks → título. Aplicações → playbook. Empresa: Empresas → empresa → Aplicações → nome. IDs técnicos filtrados.

## 7. Status

Helpers existentes reutilizados (`applicationStatusLabel`, `connectionStatusLabel`, `playbookStatusLabel`, `displayExperimentStatus`). Nenhum enum cru no detalhe da Application.

## 8. Timeline

12 etapas persistidas. Estados: Concluído, Atual, Pendente, Bloqueado. Bloqueado só se a etapa anterior não estiver feita.

## 9. Próxima ação

Uma ação principal. Labels: Aprovar teste, Concluir aplicação, demais Sprint 17. Sem dois CTAs dourados competindo.

## 10. Compatibilidade

Título e corpo: “Compatibilidade para teste”. Explicita que não é chance de sucesso.

## 11. Evidência

Blocos separados: Evidência de origem (permanece na origem) e Evidência local (só após resultado no destino). Sem “evidência transferida”.

## 12. Memória

“Aprendizado validado em {origem}.” Destino em teste até conclusão.

## 13. Conexões

Playbooks relacionados + bloco compacto de aplicações + CTA para `/aplicacoes`. Sem duplicar listagem.

## 14. Estratégias

Relações: conexão, oportunidade, playbook/aplicações — só quando existem.

## 15. Playbooks

Resumo, origem, problema, KPI, cobertura, maturidade, aplicações com link, próxima possibilidade de teste. Sem ranking.

## 16. Aplicações

Filtros, busca, paginação, ordenação e empty state preservados. Detalhe agora lê como o mesmo produto.

## 17. Cockpit

Bloco TRANSFERÊNCIA DE APRENDIZADO intacto (4 KPIs + Abrir aplicações). Sem KPI extra.

## 18. Prioridades

Só com ação humana (decidir, registrar, dados ausentes). Href `/aplicacoes/[id]`.

## 19. Alertas

Mesmos destinos. Sem alerta por ausência de cobertura. Automações só avisam.

## 20. Automações

Sem aprovação, conclusão, resultado, evidência ou memória automática.

## 21. IA

Novos atalhos e intents PLAYBOOK. Continua classificando DADO / INFERÊNCIA / HIPÓTESE / EVIDÊNCIA.

## 22. Auditoria

Sem `application.viewed`. Eventos de criação/alteração/aprovação/resultado/evidência/memória/conclusão.

## 23. Duplicidades

Nenhuma limpeza destrutiva. Unique `[playbookId, destinationCompanyId]` permanece. Idempotência do ciclo revalidada no E2E Sprint 17.

## 24. Idempotência

Preservada. Sem novo recurso que crie duplicata.

## 25. Segurança

Owner isolation e `requireOwnedResource` inalterados nas rotas de detalhe.

## 26. Performance

Listagens summary; detalhes full. Mapa clusteriza e prefere lista a partir de 50 empresas.

## 27. Responsividade

Tabela desktop / cards mobile mantidos. Timeline vertical. Filtros wrap.

## 28. Mapa

Zoom, fit, overflow (pan), foco, filtros, lista fallback. Escala 1 / 5 / 20 / 50 / 100. Sem heatmap.

## 29. Loading

Skeletons em conexões, estratégias, playbooks, aplicações e detalhes `[id]`.

## 30. Empty states

Conexões: “Nenhuma conexão identificada.”  
Estratégias: “Nenhuma estratégia criada.”  
Playbooks: “Nenhum playbook disponível.”  
Aplicações: “Nenhum playbook está sendo testado em outra empresa.”

## 31. Erros

`ErrorState` / `AppError` humanos. Sem Prisma/SQL/stack na UI.

## 32. E2E

Fluxo Sprint 17 preservado (391 testes, inclusive persistência de transferência).

## 33. Testes

391/391 (54 arquivos). +4 unitários Sprint 18 (breadcrumb, timeline, empty/mapa, IA).

## 34. TypeScript

Passou.

## 35. Lint

Passou.

## 36. Build

Passou.

## 37. Migration

Nenhuma.

## 38. Commit

Pendente no fechamento (SHA feat).

## 39. Vercel

Pendente deploy Production.

## 40. Health

Esperado: status ok · release 1.0 · version 1.0.0 · openaiExposed false · webSearchConfigured true · automationEngine ok · scheduler configured · database ok

## 41. Pendências reais

Walkthrough autenticado visual (1920–390) em `/conexoes`, `/estrategias`, `/playbooks`, `/aplicacoes`. Sem sessão de browser autenticada neste Sprint. Sprint 19 **não iniciado**.
