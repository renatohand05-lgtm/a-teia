# A TEIA — Execução contínua do roadmap

Base confirmada em 17/09/2026: Sprint 0, Sprint 1 e Sprint 2 concluídas. A partir deste ponto o desenvolvimento deixa de depender de prompts manuais de sprint e passa a ser executado por blocos de produto, com validação antes de promoção para `main`.

## Base preservada
- Next.js 15 + autenticação
- Prisma + Neon PostgreSQL
- Cockpit V9
- Empresas e isolamento por owner
- Onboarding
- Diagnóstico 360° + histórico
- Motor de oportunidades + score + ranking + Top 3

## Blocos de construção

### Bloco A — Execução estratégica
- Plano 30/60/90 a partir de oportunidades selecionadas
- Carteira de execução
- tarefas, responsáveis, prazos, status e progresso
- vínculo oportunidade -> decisão -> plano -> tarefa

### Bloco B — Motor financeiro
- investimento, retorno incremental, payback e ROI
- cenários conservador 70%, realista 100%, agressivo 130%
- limites financeiros para experimentos
- DRE e registros financeiros sem inventar dados ausentes

### Bloco C — Experimentos e evidência
- converter hipótese em experimento
- KPI, meta, prazo, owner e teto financeiro
- registrar resultados reais append-only
- classificar hipótese, teste, evidência parcial e evidência validada

### Bloco D — Aprendizado e memória
- motor de aprendizado previsto x realizado
- memória estratégica validada
- recomendação recalibrada somente com evidência
- ajuste máximo de score de ±15 pontos
- aprendizado transversal contextualizado

### Bloco E — Conexões e estratégias cruzadas
- mapa de conexões entre empresas
- famílias estratégicas e taxonomia
- oportunidades cruzadas
- rastreabilidade de origem e evidência

### Bloco F — IA da Teia
- conversa por empresa
- contexto de diagnóstico, financeiro, oportunidades, experimentos e memória
- separar DADO / INFERÊNCIA / HIPÓTESE / EVIDÊNCIA
- ações propostas exigem aprovação humana

### Bloco G — Multiempresa, RBAC e governança
- visão de portfólio
- papéis e permissões
- isolamento de cliente
- auditoria de ações
- benchmark interno sem misturar informação confidencial

### Bloco H — Integrações, importação e alertas
- financeiro, CRM/comercial, operação e canais
- ingestão/importação rastreável
- alertas de execução, evidência e divergência previsto x realizado

### Bloco I — Playbooks, expansão e meta-inteligência
- playbooks somente após validação
- motor de expansão
- cobertura, qualidade de dados, evidência, calibração, ROI e replicação

### Bloco J — Release e endurecimento
- testes de regressão
- build de produção
- segurança
- performance
- responsividade
- observabilidade
- documentação

## Regra de promoção
Cada bloco deve passar por revisão de código e, quando possível, testes/build antes de entrar na `main`. A Vercel continua responsável pelo deploy automático da `main`.

Sprint 12 (segurança, hardening e governança) e Sprint 13 (Release 1.0) fecham o bloco J. Conexões e Estratégia permanecem no Bloco E como módulos futuros. Refinamento visual não entra automaticamente.

## Regra central de conhecimento
Hipótese não é evidência. Nenhuma sugestão, inferência ou memória é promovida para aprendizado validado sem resultado real suficiente.
