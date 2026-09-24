# IncidentHub

IncidentHub é uma API REST para gerenciamento de incidentes em serviços e sistemas. Este repositório contém a fundação arquitetural da primeira entrega da disciplina de Programação Web Back-end do curso de Engenharia de Software.

Nesta etapa, o projeto oferece a infraestrutura da API e um endpoint de saúde. Os módulos de autenticação, usuários, serviços e incidentes ainda não fazem parte da implementação.

## Tecnologias

- Node.js e Express
- MongoDB e Mongoose
- Docker e Docker Compose
- ESLint e Prettier
- Morgan para logs HTTP

## Arquitetura

A aplicação é organizada por módulos e separa a inicialização do servidor da configuração do Express:

```text
src/
├── config/                 # ambiente e conexão com o MongoDB
├── middlewares/            # tratamento de erros e rotas inexistentes
├── modules/
│   └── health/             # route, controller e service do endpoint de saúde
├── shared/
│   └── errors/             # erro padronizado da aplicação
├── app.js                  # middlewares e rotas do Express
└── server.js               # conexão com banco e processo HTTP
```

Nos futuros módulos que persistirem dados, o fluxo previsto é `route → controller → service → repository → model/MongoDB`. O módulo `health` não possui repository ou model porque apenas consulta o estado da conexão já mantida pelo Mongoose.

Erros da API seguem o formato:

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Rota GET /exemplo não encontrada."
  }
}
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste os valores, se necessário:

| Variável      | Obrigatória | Padrão        | Descrição                                         |
| ------------- | ----------- | ------------- | ------------------------------------------------- |
| `NODE_ENV`    | Não         | `development` | Ambiente: `development`, `test` ou `production`   |
| `PORT`        | Não         | `3000`        | Porta HTTP entre 1 e 65535                        |
| `MONGODB_URI` | Sim         | —             | URI iniciada por `mongodb://` ou `mongodb+srv://` |

## Execução local

Requer uma versão LTS do Node.js (20.19 ou superior, ou 22.13 ou superior) e uma instância acessível do MongoDB.

```bash
npm install
cp .env.example .env
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.

Para iniciar sem recarga automática:

```bash
npm start
```

## Execução com Docker

Com Docker e Docker Compose instalados, não é necessário ter MongoDB local:

```bash
docker compose up --build
```

A API ficará disponível em `http://localhost:3000` e os dados do MongoDB serão mantidos no volume `mongodb_data`. Para encerrar, use `Ctrl+C` e depois `docker compose down`.

## Endpoint disponível

`GET /health` informa se a API está saudável e mostra o estado da conexão com o MongoDB:

```bash
curl http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "timestamp": "2026-09-23T12:00:00.000Z",
  "uptime": 10,
  "database": {
    "status": "connected"
  }
}
```

## Qualidade de código

```bash
npm run lint
npm run format:check
```
