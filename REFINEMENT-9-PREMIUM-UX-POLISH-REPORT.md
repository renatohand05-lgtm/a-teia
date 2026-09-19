# Refinamento 1.0 — Bloco 9

**Escopo:** Pente-fino visual + UX + consistência premium  
**Data:** 2026-09-19  
**Commit:** pendente neste arquivo até o commit  
**Branch:** `main`  
**Versão:** permanece **1.0.0**  
**Migrations:** nenhuma  
**Próximo bloco:** não iniciado

## Antes

Os Blocos 1–8 deixaram a jornada e os motores consistentes. Visualmente o produto ainda misturava raios, paddings, dourado em textos secundários, inputs sem máscara, empty states pobres e loading sem esqueleto.

## Problemas encontrados e resolvidos

- Tokens espalhados (rounded-xl vs 15px vs 24px)
- Dourado competindo com o conteúdo
- Tipografia sem escala
- Máscara de moeda só no parse
- “Como calculamos” em `<details>` longos
- Login/onboarding com copy residual no backlog (já sumida da UI; confirmado e reforçado)
- Drawer mobile sem ESC/lock
- Selects de filtro com contraste fraco
- Feedback de sucesso em dourado

Não executado por risco ou escopo futuro: heatmap, drag-and-drop, sons, inbox dedicado, schema de justificativa, gráficos, virtualização.

## Design tokens

Em `app/globals.css`: cores, `--radius`, `--text-2/3` mais legíveis, botões `.btn-*`, inputs `.teia-input`, tabela `.teia-table`, skeleton, tooltip, hover de card.

## Componentes

`FormField`, `MoneyInput`, `Tooltip`, `Skeleton`, `CalculationHelp`, `States`, `StatusChip`, `SourceCard`, Sidebar, Topbar, AppFrame, Login, Cockpit, Assistente, Auditoria, formulários financeiros/cadastro/oportunidade/alocação.

## Responsividade e acessibilidade

Drawer com ESC e `overflow` lock. Focus visível gold. Labels/`aria-label` em máscaras e pergunta da IA. Contraste de texto terciário melhorado. Status continua com texto, não só cor.

## Qualidade

Testes, TypeScript, lint e build a registrar após a rodada. Sem migration. Sem alteração de engines, Prisma, Auth, OpenAI, Tavily ou cron.

## Walkthrough

Browser autenticado **não disponível**. Pendência não bloqueante de QA visual em desktop/tablet/mobile.

## Backlog

`BACKLOG-POS-SPRINT-13.md` agora separa **Resolvido no Bloco 9**, **Pendente** e **Futuro**. Histórico anterior preservado.
