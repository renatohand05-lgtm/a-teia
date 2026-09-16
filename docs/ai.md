# IA e pesquisa

## Regras

- `OPENAI_API_KEY` nunca vai para o frontend.
- Endpoint: `POST /api/ai` (autenticado).
- Sprint 0 **não** liga o motor completo nem ações destrutivas.
- Toda ação proposta pela IA nasce como `PENDING_HUMAN_APPROVAL`.

## Serviços

| Serviço | Arquivo | Estado |
| --- | --- | --- |
| aiService | `services/aiService.ts` | Arquitetura + persistência de conversa. Chamada OpenAI encapsulada, não disparada automaticamente. |
| researchService | `services/researchService.ts` | Grava pergunta, data, empresa, decisão, conclusão e categorias. Busca ao vivo só com `WEB_SEARCH_PROVIDER` ≠ `none`. |
| memoryService | `services/memoryService.ts` | Append-only |
| decisionService | `services/decisionService.ts` | Proposta / aprovação humana |

## Categorias de conhecimento

Sempre separadas:

1. DADO INTERNO
2. FONTE EXTERNA
3. INFERÊNCIA
4. HIPÓTESE
5. EVIDÊNCIA
6. RECOMENDAÇÃO

Pesquisa futura armazena: pergunta, data, fontes, URLs, conclusão, empresa relacionada, decisão relacionada.
