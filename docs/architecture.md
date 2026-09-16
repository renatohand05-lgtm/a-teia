# Arquitetura — A TEIA 1.0 (Sprint 0)

Fonte de verdade desta fase: **A TEIA — Arquitetura Mestre 1.0** + protótipo visual **V9**.

## Princípio

Não inventar um conceito visual novo. Componentizar a V9 e preparar os módulos futuros sem ativá-los.

## Camadas

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Interface | `app/`, `components/`, `hooks/` | Rotas, design system V9, estados loading/empty/error/success |
| Regras de negócio | `lib/`, `services/` | Validação, prioridade preliminar, auditoria |
| Persistência | `database/`, `lib/prisma.ts` | PostgreSQL + Prisma |
| Integrações | `lib/storage.ts`, `services/researchService.ts` | Storage de arquivos e pesquisa web (preparados) |
| IA | `services/aiService.ts`, `app/api/ai` | OpenAI apenas no servidor; aprovação humana obrigatória |

## Módulos

Ativos na Sprint 0:

- Autenticação (um usuário principal)
- Cockpit
- Empresas (CRUD + arquivo)

Preparados no banco e na navegação, **não implementados**:

- Diagnóstico 360°
- Motor financeiro
- Motor de oportunidades
- Planos comerciais, portal de clientes, marketplace, permissões complexas

## Fluxo operacional (V9)

`EMPRESA → 360° → FINANCEIRO → OPORTUNIDADE → DECISÃO → AÇÃO → RESULTADO → MEMÓRIA`

Somente **EMPRESA** está operacional. Os demais passos aparecem no Cockpit como trilha, sem dados fictícios disfarçados de reais.

## Identidade

- Marca **A TEIA**
- Núcleo **GESTÃO NO FOCO**
- Paleta ouro / prata sobre preto da V9
- Tipografia Inter / SF
- Mapa da Teia preservado, marcado **DEMO** enquanto os nós não vêm do banco

## Autenticação

Auth.js (NextAuth v5), Credentials + JWT. Middleware protege tudo que não for `/login` e `/api/auth`.

Arquitetura de papéis existe no campo `User.role` (`owner`) para expansão futura. Sem RBAC nesta sprint.

## Dados históricos

Métricas, diagnósticos, evidências, resultados de experimento, memória, mensagens de IA e pesquisas são **append-only**. Correção cria novo registro; aprendizado nunca apaga o passado.
