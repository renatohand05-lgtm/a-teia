# Pós-release — auditoria de UX e navegação

**Data:** 2026-09-18  
**Objetivo:** o Cockpit e o menu passaram a refletir os módulos já publicados até o Sprint 6. Sprint 7 não foi iniciado.  
**Force push:** não

## 1. Textos obsoletos removidos

Removidos da interface:

- “Módulos desta sprint — Fundação”
- “360°, financeiro e oportunidades ainda não ativos”
- “IA automática Off”
- “Somente Empresa está ativo na Sprint 0”
- “Não calculado automaticamente nesta sprint”
- “nas próximas sprints…”
- “Sprint 0” / “Fundação” no Cockpit, no chat e nas mensagens visíveis de IA/pesquisa/storage

O Cockpit identifica o produto como **A TEIA — Centro de decisão empresarial**. Sprint não aparece como conceito de usuário.

## 2. Menu atualizado

| Grupo | Itens | Destino |
| --- | --- | --- |
| Núcleo | Meu Cockpit, Empresas, Memória | `/cockpit`, `/empresas`, `/memoria` |
| Gestão | Diagnóstico 360°, Oportunidades, Execução, Financeiro, Experimentos | módulo da empresa ou `/empresas?modulo=` |
| Inteligência | Memória Estratégica | `/memoria` |
| Em breve | Conexões, Estratégia, Assistente IA, Auditoria | desabilitados de verdade |

Gestão deixa de ficar escondida fora da URL da empresa. Sem empresa selecionada, o clique abre o seletor. Com uma empresa ativa, o seletor redireciona ao módulo.

## 3. Módulos expostos (rotas reais)

- Empresas — `/empresas`, `/empresas/nova`, `/empresas/[id]`
- Diagnóstico 360° — `/empresas/[id]/diagnostico`
- Oportunidades — `/empresas/[id]/oportunidades`
- Execução 30/60/90 — `/empresas/[id]/execucao`
- Financeiro — `/empresas/[id]/financeiro`
- DRE — `/empresas/[id]/financeiro/dre`
- Fluxo de caixa — `/empresas/[id]/financeiro/fluxo-caixa`
- Metas — `/empresas/[id]/financeiro/metas`
- Cenários — `/empresas/[id]/financeiro/cenarios`
- Experimentos — `/empresas/[id]/experimentos`
- Evidências — `/empresas/[id]/experimentos?status=COMPLETED` (dentro de Experimentos)
- Memória estratégica — `/memoria` e `/empresas/[id]/memoria`

Nenhum módulo fictício foi marcado como ativo.

## 4. Jornada implementada

Barra clicável no Cockpit:

Empresa → 360° → Oportunidade → Execução → Financeiro → Experimento → Evidência → Memória

Cada estágio usa status real (`Sem dados`, `Iniciado`, `Em andamento`, `Concluído`, `Atenção`) e leva à rota correspondente.

## 5. Cockpit atualizado

Mantidos preto/dourado, logo e “Meu Cockpit Executivo”.

Cards com contagens reais: empresas, diagnósticos, oportunidades, planos, financeiro, experimentos, evidências, memórias. Zero + CTA quando não há dado.

## 6. Prioridade contextual

A “Prioridade do sistema” deixa de ser texto de fundação. Regras:

1. Sem empresa → cadastrar primeira empresa  
2. Empresa sem 360° → realizar Diagnóstico 360°  
3. 360° sem oportunidade priorizada → analisar oportunidades  
4. Oportunidade priorizada sem plano → criar plano 30/60/90  
5. Plano sem validação → criar experimento  
6. Evidência sem memória validada → transformar evidência em aprendizado  

## 7. Navegação por empresa

- Abas horizontais: Visão Geral, Diagnóstico 360°, Oportunidades, Execução, Financeiro, Experimentos, Memória
- Cards de módulo com status visual
- CTA de próximo passo na central da empresa
- Evidências não duplicadas como item de primeiro nível (ficam em Experimentos)

## 8. Testes

- Suite anterior preservada
- Novos: carteira vazia, empresa, diagnóstico, oportunidade, plano, experimento, evidência, memória, prioridade contextual, isolamento por owner, links e rotas reais
- **110/110** passando (97 anteriores + 13 deste hotfix)

## 9. TypeScript

`npx tsc --noEmit` — 0 erros

## 10. Lint

`npm run lint` — 0 erros

## 11. Build

`npm run build` — passou (Next.js 15.5.25)

## 12. Commit SHA

`7f65e3c70b16a2d52a0e022e12c25369604b37a4`  
`fix: align cockpit navigation with released product modules`

## 13. Vercel Production

- Status: **Ready**
- Duração: 47s
- Deployment: `dpl_AfXbKGCE1sQPfUF8Wp8nfeTos1ys`
- URL do deploy: https://a-teia-4r1hciyqq-renato16.vercel.app

## 14. URL

https://a-teia.vercel.app

Health em produção:

```json
{"status":"ok","ok":true,"app":"A TEIA","release":"Sprints 3-6","version":"0.6.0","environment":"production","openaiExposed":false}
```

Rotas conferidas:

| Rota | Produção |
| --- | --- |
| `/login` | 200 |
| `/api/health` | 200 |
| `/cockpit` | 307 → login |
| `/empresas` | 307 → login |
| `/memoria` | 307 → login |
| módulos da empresa (360°, oportunidades, execução, financeiro/DRE/caixa/metas/cenários, experimentos, memória) | 307 → login (rota existe; não 404) |

## 15. Pendências reais

- Conexões, Estratégia, Assistente IA e Auditoria continuam “Em breve” porque não existem como produto.
- Motor completo de IA e pesquisa web continuam desligados.
- Não foi aberta sessão autenticada no browser de produção; a confirmação do Cockpit autenticado é pelo código publicado + rotas vivas + health.
- Sprint 7 não foi iniciado.
