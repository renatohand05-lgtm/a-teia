# Banco de dados

ORM: **Prisma**. Engine: **PostgreSQL**. Schema: `database/schema.prisma`.

## Entidades da Sprint 0

Todas as entidades relevantes possuem `id`, `createdAt`, `updatedAt`.

| Modelo | Papel |
| --- | --- |
| User | Usuário principal |
| Company | Carteira de negócios |
| CompanyMetric | Série histórica de métricas |
| FinancialRecord | Lançamentos (imutáveis após create) |
| Diagnosis / DiagnosisDimension | 360° (estrutura pronta) |
| Connection | Ligações entre empresas |
| Opportunity / Strategy | Motores futuros |
| Decision / ActionPlan / Task | Decisão com aprovação humana |
| Experiment / ExperimentResult | Testes e resultados append-only |
| Evidence | Dado interno, fonte, inferência, hipótese, evidência, recomendação |
| StrategicMemory | Aprendizado acumulativo |
| AIConversation / AIMessage / AISource | Assistente |
| ResearchSession / ResearchFinding | Pesquisa web |
| StoredFile | Importações / anexos |
| AuditLog | Quem, quando, o que, valor anterior, valor novo, origem |

## Company (campos ativos)

`name`, `segment`, `units`, `revenueMonthly`, `marginPercent`, `teamSize`, `channels`, `objectives`, `perceivedBottlenecks`, `notes`, `status` (ACTIVE/ARCHIVED), `isDemo`.

## Comandos

```bash
npx prisma migrate dev --schema database/schema.prisma --name init
npx prisma migrate deploy --schema database/schema.prisma
npm run db:seed
```

## Seed

Cria o usuário principal a partir de `AUTH_EMAIL`, `AUTH_PASSWORD` e `AUTH_NAME`. Não grava empresas DEMO automaticamente — DEMO só existe se o usuário marcar no cadastro.
