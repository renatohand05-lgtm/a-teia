# Refinamento 1.0 — Bloco 1

**Escopo:** Cockpit, navegação e hierarquia visual  
**Data:** 2026-09-19  
**Commit:** `refactor: refinement 1 cockpit navigation and visual hierarchy`  
**SHA:** `e1382e020757801feffd7bdd4efecaa628f98d75`  
**Branch:** `main`  
**Versão:** permanece **1.0.0** (microrefinamento, sem patch semântico)  
**Bloco 2:** não iniciado

## 1. Problemas encontrados

- Primeira dobra do Cockpit competia briefing, top 3, métricas, fila, gauge e mapa de peso semelhante.
- “Saúde da carteira” / gauge circular isolado misturava prioridade com saúde.
- “USO PESSOAL” disputava atenção no header.
- Erro do Cockpit mencionava PostgreSQL.
- Lista de prioridades em cards altos, com dois CTAs dourados por linha.
- KPIs globais duplicados (hero + painel).
- Filtros com enums em inglês.
- Sidebar no mobile ocupava fluxo no topo em vez de drawer.
- Item ativo com brilho dourado excessivo.
- Header de Alertas sem badge de quantidade.
- Empty states sem próximo passo em vários blocos.
- Score ausente podia ser lido como zero no gauge antigo.

## 2. Hierarquia antes / depois

**Antes:** tudo no mesmo peso — hero V9, briefing, top 3, métricas, fila, saúde, depois o restante.

**Depois, em ordem de decisão:**

1. Hero executivo (prioridade atual, motivo, próxima ação, CTA)
2. Sinais da primeira dobra (carteira, alertas, decisões, score de prioridade)
3. KPIs globais com cobertura
4. Prioridades (lista compacta)
5. Alertas e decisões pendentes
6. Empresas
7. Execução / oportunidades / experimentos
8. Memória e mudanças
9. Alocação e automações
10. Inteligência de mercado (só se houver pesquisa)
11. Atalhos do Assistente IA

## 3. Cockpit

Hero compacto: *Meu Cockpit* + prioridade existente (empresa, motivo, próxima ação). CTA primário **Ver empresa**; secundário **Analisar com IA**. Jornada em pílulas com status simples. Sem dado inventado. Sem “USO PESSOAL”. Sem gauge de saúde.

## 4. Sidebar

Arquitetura mantida: Núcleo, Gestão, Inteligência, Central, Em breve. Spacing e grupos mais claros. Hover discreto. Item ativo com fundo dourado baixo e indicador inset, sem glow. `aria-current="page"`. Mobile: drawer + overlay; desktop: sticky. Em breve continua desabilitado (Conexões, Estratégia).

## 5. Header

Mais baixo. Título + contexto + Menu (mobile) + Alertas + usuário + Sair. Badge de alertas só quando a quantidade é > 0. Clique em Alertas vai para `/automacoes#notificacoes`.

## 6. Cards

Raio 16px, padding menor, hover leve, números tabulares, labels curtas em uppercase só no KPI. Sem borda pesada nem card gigante na fila de prioridade.

## 7. Prioridades

Lista executiva: `#n`, empresa, tipo, motivo, nível, ação **Ver** (outline). Detalhe “Por que esta empresa é prioridade?” continua expansível, sem alterar o motor.

## 8. Indicadores

Empresas, receita consolidada, EBITDA consolidado, planos ativos, alertas, decisões. Receita/EBITDA usam `formatBRL` (`—` se não informado) e cobertura `N/M empresas com dados`. Score de prioridade explica origem; ausente = “Sem dados”.

## 9. Empty states

Todos os blocos principais do Cockpit têm título, texto executivo e CTA quando faz sentido (cadastrar empresa, ver automações, abrir Assistente IA, ver memória, ver auditoria).

## 10. CTAs

Um primário dourado no hero. Decisão: só **Aprovar** é dourado; demais são terciários. Lista de prioridades não compete em dourado. Botões de decisão entram em `disabled` + “Salvando...” durante a transição.

## 11. Mobile

Sidebar vira drawer. Hero e KPIs reflow em coluna. Tabela de empresas com `overflow-x-auto` (cards empilhados ficam no backlog). Sem overflow horizontal estrutural no shell (`min-w-0`).

## 12. Acessibilidade

`:focus-visible` global. Labels nos filtros. `aria-label` no menu, overlay, navegação e jornada. Item ativo com `aria-current`. Badge não renderiza 0. Contraste AA de `--text-3` permanece no backlog.

## 13. Performance percebida

Menos blocos duplicados na primeira dobra. Sem skeleton global (só o loading já existente nas páginas). Drawer com transição curta. Sem layout shift novo além do drawer mobile.

## 14. Testes

Suite completa: **256** testes, 34 arquivos, todos passando. Novos em `tests/refinement-cockpit.test.ts`: rotas da sidebar, badge > 0, score ausente ≠ zero, labels PT, cobertura, `formatBRL` zero vs `—`.

## 15. TypeScript

`npx tsc --noEmit` — 0 erros.

## 16. Lint

`npm run lint` — 0 erros.

## 17. Build

`npm run build` — aprovado.

## 18. Commit

Mensagem: `refactor: refinement 1 cockpit navigation and visual hierarchy`  
**SHA:** `e1382e020757801feffd7bdd4efecaa628f98d75`  
Push para `origin/main` após validação. Sem bump de versão.

## 19. Vercel

Production **Ready**: https://a-teia.vercel.app  
Deploy: https://a-teia-gkg0dqjfw-renato16.vercel.app  
`/api/health`: release `1.0`, version `1.0.0`, `openaiConfigured: true`, `webSearchConfigured: true`, `openaiExposed: false`, `automationEngine: ok`, `scheduler: configured`, `database: ok`. Sem secrets.

## 20. Novos itens de backlog

Acrescentados em `BACKLOG-POS-SPRINT-13.md` (grupo **REFINAMENTO 1 — BLOCO 1**):

- Filtro de período no Cockpit
- Jornada conceitual Decisão/Resultado vs etapas funcionais atuais
- “Uso pessoal” no login
- Copy “PostgreSQL” em onboarding/histórico 360°
- Densidade dos cards de classificação de fonte
- Focus trap do drawer
- Tabela de empresas em cards no mobile
- Skeleton só do hero/KPIs
- Contraste AA de textos terciários
- Inbox dedicado de alertas
- Wrapping dos chips da IA em 768px

## Auditoria visual no browser

Não havia ferramenta de browser autenticada neste ambiente. `/cockpit` exige sessão. Não foi possível capturar desktop/tablet/mobile logado. Revisão feita no código e no build.

## O que não foi alterado

Cálculo de prioridade, financeiro estrutural, owner isolation, OpenAI, Tavily, cron, automações (exceto leitura `countOpenOwnerAlerts`), evidência, memória, alocação. Nenhuma rota removida. Versão 1.0.0 mantida.

## Conclusão

**BLOCO 1 ENCERRADO.**
