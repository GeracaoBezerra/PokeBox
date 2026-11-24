# 0010. Observabilidade e performance

Data: 15 e 16/11/2026 · Issues #110, #111 e #112

## Observabilidade

- Logs com pino em JSON, um `x-request-id` por requisição e senha e token apagados do log.
- Traces com OpenTelemetry: Jaeger no Docker local (`make traces`) e Grafana Cloud em produção. Sem a variável `OTEL_EXPORTER_OTLP_ENDPOINT`, nada liga.
- OpenTelemetry porque é o padrão aberto: o mesmo código manda para qualquer destino trocando só variáveis.

## Performance

| Mudança | Resultado medido |
|---|---|
| Compressão gzip | Lista de 100 cartas de 22,6 KB para 2,8 KB |
| Índice `(status, createdAt DESC, id)` em `Listing` | `GET /listings` com 100 mil anúncios de 823 para 2.096 req/s |
| Busca por trigramas no catálogo local | `charzard` de 33,4 ms para 1,5 ms |
| `Cache-Control` | Lista pública por 300 s; detalhe privado |

Outras: helmet, corpo JSON limitado a 100 kb, paginação opcional nas listas e limite de tentativas no login.

## Limite de tentativas no login

A chave é IP + e-mail, contando só as falhas (20 em 15 min). Só por IP bloquearia a turma inteira na apresentação, porque todos estão no mesmo wi-fi. O risco aceito: a mesma senha testada em muitos e-mails não é barrada.

## Ficou como está, de propósito

- `requireAuth` consulta o banco a cada requisição (1,3 ms) para bloquear na hora uma conta suspensa.
- Cache em memória por instância. Redis seria o próximo passo se a API tivesse mais de uma instância.
- Paginação por `OFFSET`. Cursor seria o próximo passo para listas muito longas.
