# Backlog — Refinamento 1.0 (pós-Sprint 13)

Base do próximo trabalho: **A TEIA — REFINAMENTO 1.0 / PENTE-FINO**.

Não usar este arquivo para esconder bug, falha de segurança, cálculo incorreto, vazamento, erro de banco, quebra de owner isolation ou falha de deploy.

Itens abaixo são acabamento. Não bloqueiam o Release 1.0.

## VISUAL

- Alinhar paddings dos cards do Cockpit Global com o Company Cockpit
- Tipografia dos labels de KPI consolidado (tamanho e tracking)
- Ajuste fino das bordas douradas dos cards
- Contraste do select de filtros no tema preto
- Espaço entre sidebar “Central” e “Em breve”
- Truncamento de títulos longos de oportunidade no resumo global
- Truncamento de action names longos na tabela de auditoria
- Contraste dos selects de filtro em `/auditoria`
- Templates visuais ilustrados

## UX

- Copy mais curta do empty state de decisões
- Copy mais curta dos avisos de concentração
- Tooltip explicando DATA HEALTH nos cabeçalhos
- Personalização de quais KPIs aparecem no topo
- Personalização da ordem dos mapas de capital e tempo
- Empty state ilustrado sem conteúdo demo
- Empty state ilustrado da Auditoria
- Labels mais curtos nos filtros de portfólio

## MOBILE

- Responsividade mobile da tabela de portfólio (cards empilhados)
- Densidade dos cards da proposta em mobile
- Mobile fino da lista de execuções
- Densidade da tabela de Auditoria em telas menores
- Detalhe do evento de auditoria em drawer no mobile
- Densidade da tabela de portfólio em telas 1280px

## MICROINTERAÇÕES

- Hover mais suave nos cards de prioridade
- Hover mais suave nas linhas da auditoria
- Microinteração ao expandir “Por que isso é prioridade?”
- Microinteração do “Por que esta alocação?”
- Animação discreta da troca de filtros
- Animação ao recalcular cenário
- Animação do sino de notificações
- Microinterações ao reconhecer/resolver alerta
- Alinhamento dos chips de atalho da IA

## GRÁFICOS

- Gráficos simples de mapa de capital/tempo na Alocação
- Comparação visual lado a lado Conservador/Balanceado/Expansão
- Heatmap de alertas
- Ícones discretos de tendência (↑ ↓ →)
- Histórico visual de execuções

## TABELAS

- Densidade e sticky header nas tabelas longas
- Ordenação visual de colunas no portfólio
- Estado vazio consistente dentro de tabelas filtradas

## FORMULÁRIOS

- Tooltips dos campos de reserva e máximo percentual
- Atalhos de teclado para filtros
- Atalhos de teclado para simular e enviar à decisão
- Skeleton de carregamento do Cockpit
- Skeleton da simulação

## ASSISTENTE IA

- Alinhamento e wrapping dos chips de atalho
- Densidade das fontes na resposta longa
- Destaque visual mais claro de FONTE EXTERNA vs DADO INTERNO

## PESQUISA

- Preview mais compacto das fontes
- Indicador de freshness menos técnico

## COCKPIT

- Espaçamento vertical entre Central de Decisão e Portfólio
- Personalização do briefing
- Cards de prioridade com hierarquia tipográfica mais fina

## AUDITORIA

- Filtros persistidos na URL
- Exportação visual (sem payload sensível)

## AUTOMAÇÕES

- Filtros avançados da Central de Automações
- Snooze avançado de alerta
- Drag-and-drop de regras
- Builder visual de condições
- Personalização de sons

## PERFORMANCE

- Virtualização da tabela de portfólio em carteiras grandes
- Paginação visual da auditoria além do limite atual

## ACESSIBILIDADE

- Foco visível mais evidente nos chips dourados
- Contraste AA em textos terciários
- Nomes acessíveis restantes em ícones decorativos

## INTERAÇÃO AVANÇADA

- Drag-and-drop para reordenar iniciativas na simulação
- Atalhos globais de teclado

## REFINAMENTO 1 — BLOCO 1 (pendências menores)

- Filtro de período no Cockpit (Empresa/Segmento/Prioridade já existem; período ainda não tem recorte no motor)
- Jornada do hero ainda usa as etapas funcionais atuais (Financeiro, Experimento, Evidência) em vez do recorte conceitual Decisão/Resultado
- Login ainda exibe “Uso pessoal”
- Copy técnica “PostgreSQL” em onboarding e histórico do 360°
- Cards de classificação de fonte (Dado interno, Hipótese, Evidência…) no rodapé do Cockpit: densidade e utilidade executiva
- Focus trap e retorno de foco no drawer mobile da sidebar
- Tabela de empresas do Cockpit em cards empilhados no mobile (além do overflow-x atual)
- Skeleton só do hero/KPIs do Cockpit, sem cobrir a página inteira
- Contraste AA dos textos terciários (`--text-3`) em fundos escuros
- Inbox dedicado de alertas; o header hoje leva a `/automacoes#notificacoes`
- Microajuste de wrapping dos chips “Perguntar à A TEIA” em 768px

## REFINAMENTO 1 — BLOCO 2 (pendências menores)

- Select de segmento com catálogo fechado (hoje o campo continua livre; só a apresentação é normalizada)
- Edição da empresa em rota dedicada `/empresas/[id]/editar` (hoje o cadastro fica na âncora `#cadastro`)
- Máscara ao digitar moeda, não só no parse
- Confirmação de arquivamento com undo
- Empty state ilustrado da listagem
- Ordenação da tabela de empresas
- Focus trap nos painéis de confirmação
- Histórico de alterações do cadastro na própria ficha
- Cards de módulo da empresa com densidade ainda menor em 768px

## REFINAMENTO 1 — BLOCO 3 (pendências menores)

- Gráfico fino de evolução do Score 360° (hoje só delta textual e lista)
- Seletor de competência com mês por extenso no `<option>`
- Máscara de moeda na digitação da DRE (já no Bloco 2)
- “Como calculamos” em tooltip em vez de `<details>`
- Destacar linha de EBITDA na DRE com peso tipográfico ainda mais claro
- Comparação lado a lado de três competências
- Empty state ilustrado do financeiro
- Densidade do formulário 360° em 768px (10 fieldsets)

## REFINAMENTO 1 — BLOCO 4 (pendências menores)

- “Como calculamos” de score/payback/progresso em tooltip em vez de `<details>`
- Formulário de primeira tarefa em plano legado sem tarefas (hoje o 30/60/90 já nasce com 3 horizontes)
- Campo de justificativa curta na aprovação/rejeição (schema atual não tem reason)
- Densidade do ranking de oportunidades em 768px
- Atalhos de teclado para Aprovar/Revisar/Rejeitar/Adiar no Cockpit
- Empty state ilustrado de oportunidades, decisões e execução
- Histórico visual compacto de decisões na ficha da oportunidade
- Comparar score vs prioridade operacional em um chip único no ranking

## REFINAMENTO 1 — BLOCO 5 (pendências menores)

- “Como calculamos” da comparação meta × resultado em tooltip
- Densidade dos cards de experimento em 768px
- Empty state ilustrado de experimentos e memória
- Gráfico simples de medições do experimento
- Histórico visual de evidências na ficha da oportunidade
- Atalho de teclado para registrar resultado
- Hover mais suave nos cards de memória
- Filtro de período por mês, além do ano já disponível

## REFINAMENTO 1 — BLOCO 6 (pendências menores)

- Microinterações dos chips de perguntas rápidas
- Spacing e tipografia do card de cobertura da empresa
- Skeleton discreto no lugar do texto de carregamento
- Tooltip da classificação DADO / INFERÊNCIA / HIPÓTESE / EVIDÊNCIA
- Hover mais suave nos cards de fonte
- Contraste dos tipos OFICIAL / ESTUDO / BENCHMARK em fundo escuro
- Densidade do histórico de conversas em 768px
- Wrapping dos atalhos e do botão Perguntar no mobile
- Animação mínima da troca “Analisando…” → “Organizando análise…”
- Detalhe visual de data nas fontes sem publishedAt
- Chips de cobertura com ícone além de ✓ / —

## REFINAMENTO 1 — BLOCO 7 (pendências menores)

- Justificativa textual na aprovação/rejeição da alocação (schema atual não tem reason)
- Sino de alerta com som e snooze
- Heatmap de alertas e gráfico de mapa de capital/tempo
- Comparação visual lado a lado Conservador/Base/Expansão
- Builder visual e drag-and-drop de condições
- Score da oportunidade no card de alocação (hoje o ranking fica no motor)
- Tooltips, hover, spacing e densidade das tabelas de auditoria
- Mobile avançado da simulação e da lista de execuções
- Animações e atalhos de teclado para simular/enviar
- Contraste AA dos textos terciários nos cards de alerta
- Inbox dedicado além do atalho do header
- Filtros persistidos na URL da auditoria
