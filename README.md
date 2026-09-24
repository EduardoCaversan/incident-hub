# IncidentHub

IncidentHub é uma API REST para gerenciamento de incidentes em serviços e sistemas. Este repositório contém a fundação arquitetural da primeira entrega da disciplina de Programação Web Back-end do curso de Engenharia de Software.

Nesta etapa, o projeto oferece a infraestrutura da API, autenticação JWT, cadastro e consulta do usuário autenticado. Os módulos de serviços e incidentes ainda não fazem parte da implementação.

## Tecnologias

- Node.js e Express
- MongoDB e Mongoose
- Docker e Docker Compose
- ESLint e Prettier
- Morgan para logs HTTP
- bcryptjs para hash de senhas
- JSON Web Token para autenticação
- Zod para validação de entrada
- Swagger UI e OpenAPI para documentação
- Test runner do Node.js, Supertest e MongoDB Memory Server para testes HTTP

## Arquitetura

A aplicação é organizada por módulos e separa a inicialização do servidor da configuração do Express:

```text
src/
├── config/                 # ambiente e conexão com o MongoDB
├── middlewares/            # tratamento de erros e rotas inexistentes
├── modules/
│   ├── auth/               # cadastro, login e validações de autenticação
│   ├── health/             # route, controller e service do endpoint de saúde
│   └── users/              # model, repository, roles e consulta do usuário
├── shared/
│   ├── errors/             # erro padronizado da aplicação
│   ├── security/           # hash de senha e operações com JWT
│   └── validation/         # middleware reutilizável de validação
├── app.js                  # middlewares e rotas do Express
└── server.js               # conexão com banco e processo HTTP
```

Os módulos que persistem dados seguem o fluxo `route → controller → service → repository → model/MongoDB`. O módulo `health` não possui repository ou model porque apenas consulta o estado da conexão já mantida pelo Mongoose.

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

| Variável         | Obrigatória | Padrão        | Descrição                                                |
| ---------------- | ----------- | ------------- | -------------------------------------------------------- |
| `NODE_ENV`       | Não         | `development` | Ambiente: `development`, `test` ou `production`          |
| `PORT`           | Não         | `3000`        | Porta HTTP entre 1 e 65535                               |
| `MONGODB_URI`    | Sim         | —             | URI iniciada por `mongodb://` ou `mongodb+srv://`        |
| `JWT_SECRET`     | Sim         | —             | Segredo JWT com ao menos 32 caracteres                   |
| `JWT_EXPIRES_IN` | Não         | `1h`          | Duração do token: número seguido de `s`, `m`, `h` ou `d` |
| `BCRYPT_ROUNDS`  | Não         | `12`          | Custo do hash bcrypt, entre 4 e 15                       |

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

## Endpoints disponíveis

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

| Método | Endpoint             | Autenticação  | Descrição                               |
| ------ | -------------------- | ------------- | --------------------------------------- |
| `GET`  | `/health`            | Não           | Saúde da API e conexão com MongoDB      |
| `POST` | `/api/auth/register` | Não           | Cadastra um usuário com papel `VIEWER`  |
| `POST` | `/api/auth/login`    | Não           | Retorna um JWT para credenciais válidas |
| `GET`  | `/api/users/me`      | Bearer JWT    | Retorna o usuário autenticado           |
| `GET`  | `/api/users/:id`     | JWT (`ADMIN`) | Consulta um usuário por id              |
| `GET`  | `/api/docs`          | Não           | Interface Swagger                       |
| `GET`  | `/api/docs.json`     | Não           | Documento OpenAPI em JSON               |

O cadastro público não aceita papel informado pelo cliente e cria usuários como `VIEWER`. Os papéis disponíveis são `ADMIN`, `ENGINEER` e `VIEWER`. Senhas precisam ter entre 8 e 72 caracteres, com letras maiúscula e minúscula e ao menos um número.

Para testar pelo Swagger, acesse `http://localhost:3000/api/docs`, execute o login, copie o valor de `accessToken`, clique em **Authorize** e informe o token.

## Qualidade de código

```bash
npm run lint
npm run format:check
npm test
```

Os testes usam uma instância temporária do MongoDB e não alteram o banco configurado em `.env`.
