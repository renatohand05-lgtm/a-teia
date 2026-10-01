# Sprint 21 — Inteligência multiempresa + portfólio executivo + motor de expansão

**Versão:** permanece **1.0.0**  
**Data:** 2026-10-01  
**Branch:** `main`  
**HEAD inicial:** `51544c3` (docs Sprint 20)  
**Sprint 22:** não iniciada.

## 0. Pré-validação do Sprint 20

Relatório `SPRINT-20-CERTIFICACAO-OPERACIONAL-1.0.md` lido. Estado técnico confirmado no repositório: 401 testes na suíte então vigente, commit funcional `4defdf9`, health 1.0.0 ok, `openaiExposed false`, `webSearchConfigured true`.

Cinco bugs do Sprint 20 permanecem corrigidos no código (rótulos de meta, `ebitdaTarget` na IA, prioridade com natureza, órfãs ocultas no Cockpit, `proposeDecision` serializable).

Walkthrough autenticado, automação/pesquisa web pela UI e viewport 1920–390 **não** foram revalidados visualmente. Ciclo 360° → memória da J BURGUERS continua vazio — lacuna de dado, não bug; nada foi fabricado.

### Typo `ALIMENTAÇÃP`

Existia no cadastro da J BURGUERS (`cmu6vhsdp0001lb044dfa49w8`). Corrigido:

- apresentação: alias `alimentacap` / `alimentaçãp` → Alimentação;
- persistência: segmento gravado como `Alimentação`, com auditoria `company.segment.typo_corrected`;
- cadastro/onboarding passam a canonicalizar segmento conhecido (`persistableSegment`).

### Órfãos

Leitura **antes** da higiene (não apagados automaticamente):

| Recorte | Qtd |
|---|---|
| `Decision.companyId` nulo | 189 |
| Sem empresa, oportunidade, estratégia, alocação ou aplicação | 189 |
| Pendentes unlinkable | 61 |
| `Aprovar plano-piloto` PENDING | 31 |
| `Alocação de recursos — BALANCEADO — v1` PENDING | 30 |
| `Executar: Programa de indicação` APPROVED | 56 |
| `Executar: Melhorar conversão comercial` EXECUTED | 52 |
| Demais títulos de playbook/teste APPROVED | 20 |

**Origem:** testes de persistência apagam a empresa; `Decision.companyId` usa `onDelete: SetNull`. Títulos de piloto e alocação BALANCEADO v1 são inequívocos de suíte.

**Limpeza segura executada:** `CANCELLED` só nos 61 pendentes com esses dois títulos, `companyId` nulo, sem alocação/aplicação/oportunidade. Auditoria `decision.test_orphan.cancelled`. Nenhum `DELETE`. APPROVED/EXECUTED preservados.

Após a suíte do Sprint 21 (que gerou +2 pendentes do mesmo tipo) a higiene foi reexecutada. Estado final da carteira real:

- J BURGUERS: segmento `Alimentação`, ACTIVE;
- 63 canceladas dos dois títulos de teste;
- ~134 unlinkable APPROVED/EXECUTED de teste **preservadas** (histórico);
- pendentes unlinkable desses títulos: 0.

Não afetam agregação, isolamento, financeiro, decisões operacionais nem segurança: o Cockpit já exigia empresa ou alocação.

## 1. Objetivo

Inteligência multiempresa no Cockpit existente: escala da carteira, matriz de completude e ranking de expansão como HIPÓTESE. Sem dashboard paralelo, sem CRM/ERP novo, sem copiar evidência.

## 2. Escala da carteira

`portfolioScaleCaption`: 0 = vazia; 1 = “Leitura de uma empresa. Não generalize este resultado para um portfólio.”; N = consolidado só do informado. A carteira persistida tem **1 empresa**. O motor não inventa destino.

## 3. Matriz de completude

`buildPortfolioCompleteness` no Cockpit (`#cockpit-completude`): cadastro, 360°, financeiro, oportunidade, plano, experimento, evidência, memória, aplicação — SIM/NÃO a partir do persistido.

J BURGUERS (não fabricado): 360 NÃO · financeiro SIM · oport/plano/exp/evid/mem/apl NÃO.

## 4. Motor de expansão

`rankExpansionOpportunities` em `lib/expansion-engine.ts`:

- fonte só playbook VALIDADO ou memória aprovada;
- destino ≠ origem;
- destino que já testa o mesmo playbook é ignorado;
- classificação sempre `HIPOTESE`;
- score = aderência ao teste (segmento + prontidão de dados), **não** probabilidade de sucesso;
- evidência permanece na origem (copy explícito);
- vazio com 1 empresa: “Cadastre outra empresa para testar um aprendizado.”

Ligado em `loadPortfolioBundle` e no Cockpit (`#cockpit-expansao`). CTA vai para `/empresas/{destino}/aplicacoes`.

## 5. IA multiempresa

Atalhos de carteira: “Há destino para expansão?”, “Onde testar este aprendizado?”, “Onde faltam dados?”. Intent PLAYBOOK cobre expansão. Resposta determinística usa `portfolioIntelligenceAnswer` (completude/expansão), sem inventar 360° nem memória.

## 6. Isolamento e segurança

Bundle continua filtrado por `ownerId`. Ranking não mistura owner. Autenticação intacta. Sem backdoor. Órfãs canceladas não voltam à Central de Decisões.

## 7. Testes

411/411 (57 arquivos). +10 Sprint 21 (`tests/sprint21-expansion.test.ts`).

## 8. TypeScript

Passou (`npx tsc --noEmit`).

## 9. Lint

Passou.

## 10. Build

Passou.

## 11. Migration

Nenhuma.

## 12. Commit SHA

(preenchido após o commit funcional)

## 13. Vercel

(preenchido após Production Ready)

## 14. Health

(preenchido após o deploy)

## 15. Pendências (não bloqueiam o Sprint 21)

1. Walkthrough autenticado visual — ambiente sem sessão/browser autenticado.
2. Ciclo 360° → memória da J BURGUERS vazio (dado; não fabricar).
3. Automação/alerta pela UI — não validado visualmente.
4. Pesquisa web pela UI — não validada visualmente.
5. Viewport real 1920–390 — não auditado.
6. Órfãs APPROVED/EXECUTED de teste ainda no banco (histórico; ocultas no Cockpit).

## 16. Conclusão

Sprint 21 entregue no Cockpit: leitura de uma empresa não vira portfólio de muitas; expansão é hipótese; evidência não transfere. Sprint 22 não iniciada.
