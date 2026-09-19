# Refinamento 1.0 — Bloco 2

**Escopo:** Empresas, cadastro, formulários e experiência operacional  
**Data:** 2026-09-19  
**Commit:** `refactor: refinement 2 company forms and operational UX`  
**Branch:** `main`  
**Versão:** permanece **1.0.0**  
**Bloco 3:** não iniciado

## Problemas encontrados

- Listagem em cards sem cobertura, prioridade, próxima ação ou status claro.
- Cadastro pedia unidades, margem, equipe e textos no primeiro passo.
- Após criar, o fluxo forçava onboarding antes da empresa.
- Formulários com label em uppercase e `type="number"` para R$.
- Parse `replace(",", ".")` quebrava `600.000`.
- Tabela de empresas do Cockpit só com scroll horizontal no mobile (pendência do Bloco 1).
- Copy técnica de PostgreSQL em onboarding, histórico 360° e alocação.
- Login ainda dizia “Uso pessoal”.
- Arquivar era um clique sem consequência explícita.
- Empty states de diagnóstico/execução sem direção clara.
- Sem breadcrumb; voltar dependia do navegador em várias telas.

## Listagem

`/empresas` passou a lista executiva no desktop e cards no mobile. Colunas: empresa, segmento, status, cobertura, prioridade (só com sinal informado), próxima ação, **Abrir empresa**.

## Cadastro

Formulário compacto: nome obrigatório agora; segmento opcional; o restante fica para depois. Depois de salvar, o usuário entra na empresa — não no onboarding.

## Edição

Cadastro completo na âncora `#cadastro`. Confirmação “Empresa atualizada.” Botão desabilitado em “Salvando...”. Arquivar explica que não exclui.

## Formulários

`FormField` / `FormArea` / `FormMessage`: label visível, helper, erro, disabled, loading. Identidade preto/dourado mantida.

## Moeda

`parseBrazilianNumber` aceita `R$ 600.000,00`, `600.000` e `600000`. Persistência continua numérica. Vazio = sem dado; `0` = zero real.

## Percentuais

Interface espera `30` ou `30%` para 30. Mensagem: “Informe um percentual válido.” Sem conversão 0.30 → 30.

## Datas

`formatDateBR` (`dd/mm/aaaa`) no histórico 360°. Inputs nativos de data não foram trocados.

## Segmentos

Apresentação normalizada (`ALIMENTAÇÃO` / `alimentacao` / `Restaurante` → Alimentação). Banco intacto.

## Status

Schema real: Ativa, Arquivada. Demo continua badge/`isDemo`, sem estado novo.

## Detalhe da empresa

Cabeçalho: nome, segmento, status, próxima ação, Editar, Analisar com IA. Um CTA dourado.

## Navegação contextual

Breadcrumb `Empresas / empresa / módulo`. Tabs existentes preservados. Links “Voltar” nas telas de criação/módulos.

## Empty states

Diagnóstico, histórico 360°, execução, listagem e oportunidades com texto + CTA. Sem caixa vazia.

## Mobile

Listagem e Cockpit: cards no mobile, tabela no desktop. Inputs em largura total. Drawer do Bloco 1 preservado.

## Acessibilidade

Labels associadas, `aria-describedby` em erro/helper, `aria-invalid`, campos obrigatórios marcados, foco visível do Bloco 1.

## Segurança

`listCompanyDirectory` filtra por `ownerId` / `company.ownerId`. Create/update/archive e `requireOwnedCompany` intactos. Sem exclusão destrutiva.

## Testes

**266** testes, 35 arquivos. Novos em `tests/refinement-company.test.ts`.

## TypeScript / lint / build

`tsc` 0 · lint 0 · build aprovado.

## Commit / Vercel

Mensagem pedida. SHA e Ready registrados após o push.

## Pendências

- Sem walkthrough autenticado neste ambiente (não criar empresa lixo em produção).
- Máscara ao digitar moeda.
- Catálogo fechado de segmentos.
- Rota dedicada de edição.

## Backlog novo

Grupo **REFINAMENTO 1 — BLOCO 2** em `BACKLOG-POS-SPRINT-13.md`.

## Conclusão

**BLOCO 2 ENCERRADO.**
