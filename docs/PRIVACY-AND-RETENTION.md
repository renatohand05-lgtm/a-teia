# Privacidade e retenção — política mínima (Sprint 12)

Documento do comportamento **atual**. Não descreve exclusão destrutiva automática.

## Escopo

A TEIA trata dados de um único owner por conta. Não há compartilhamento multi-usuário nesta release.

## Tratamento atual

| Dado | Comportamento atual |
| --- | --- |
| Conversas da IA | Persistidas por usuário/empresa. Não são expostas a outro owner. Não há purge automático. |
| Pesquisas web e fontes | Persistidas como sessão/finding. Conteúdo externo é dado, não instrução. Sem exclusão automática. |
| Auditoria | Append-only. Metadata é sanitizada (sem senha, token, API key, cookie ou `CRON_SECRET`). |
| Dados financeiros | Realizado, projeção, cenário e hipótese permanecem distintos. Sem exclusão automática. |
| Experimentos e evidências | Histórico append-only. Evidência validada exige processo interno, não payload do cliente. |
| Memórias estratégicas | Memória validada preserva origem, empresa, data, confiança e limitações. Pesquisa externa não vira memória validada sozinha. |

## O que não é gravado

- senha em claro
- hash de senha em auditoria
- API keys
- `CRON_SECRET`
- session token
- header Authorization
- cookies

## Exclusão

Não há fluxo de exclusão em massa nesta versão. Arquivamento de empresa preserva histórico. Pedidos pontuais de remoção, quando necessários, são operacionais e manuais.
