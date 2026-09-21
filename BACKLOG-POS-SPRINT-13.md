# Backlog — fechamento do Refinamento 1.0

Não usar este arquivo para esconder bug, falha de segurança, cálculo incorreto, vazamento, erro de banco, quebra de owner isolation ou falha de deploy.

O Refinamento 1.0 (Blocos 1–12) está **tecnicamente encerrado**. Itens abaixo não bloqueiam o Release 1.0.

## A. RESOLVIDO NO REFINAMENTO 1.0

Compacto do que os Blocos 1–11 entregaram e o Bloco 12 confirmou no código:

- Cockpit executivo, navegação, breadcrumbs e drawer mobile com focus trap
- Empresas: cadastro, `/empresas/[id]/editar`, segmento fechado + Outro, arquivar e restaurar
- Formulários, máscaras BRL/%, 0 ≠ Sem dados, empty states e skeletons
- Diagnóstico, financeiro, oportunidades, decisões, execução, experimentos, evidências e memória
- Assistente IA, fontes externas compactas, erros sem provedor técnico
- Alocação, automações, inbox `/alertas`, auditoria com drawer e filtros na URL
- Justificativa humana opcional (`Decision.humanReason`)
- Design tokens, dourado restrito, tipografia, chips, tooltips e login premium
- Código morto residual removido no Bloco 12 (`AIChat`, cards V9 não usados, `NetworkMap`)

Histórico detalhado permanece nos relatórios `REFINEMENT-1` a `REFINEMENT-12`.

## B. PENDENTE INTENCIONAL / GOVERNANÇA

- **Justificativa obrigatória** em aprovação/rejeição — propositalmente **recomendada, não obrigatória**. Campo `humanReason` existe; vazio não quebra fluxo nem dados antigos. A IA não preenche sozinha.

## C. FUTURO DO PRODUTO

- Conexões e estratégias cruzadas (Sprint 14)
- Playbooks estratégicos reutilizáveis (Sprint 15)
- Drag-and-drop, gráficos decorativos, sons
- Builder visual de automações
- Virtualização de tabelas grandes
- Atalhos globais de teclado
- Personalização de KPIs, briefing e empty states ilustrados
- Acabamento visual extra (padding fino, templates ilustrados, animações)

## D. FORA DE ESCOPO / VETADO NO RELEASE 1.0

- RBAC além de owner
- WhatsApp, e-mail automation, push notification
- Novos agentes autônomos
- Novos canais externos
- Exclusão destrutiva automática
- Incremento de versão neste refinamento
