import {
  incidentPaths,
  incidentResponses,
  incidentSchemas,
} from '../modules/incidents/incident.openapi.js';
import {
  servicePaths,
  serviceResponses,
  serviceSchemas,
} from '../modules/services/service.openapi.js';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'IncidentHub API',
    version: '1.0.0',
    description:
      'API acadêmica para gerenciamento de serviços, incidentes e usuários com autenticação JWT.',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Auth', description: 'Cadastro e autenticação' },
    { name: 'Users', description: 'Dados do usuário autenticado' },
    { name: 'Services', description: 'Sistemas e aplicações monitorados' },
    { name: 'Incidents', description: 'Registro e acompanhamento de incidentes' },
    { name: 'System', description: 'Estado da aplicação' },
  ],
  paths: {
    ...servicePaths,
    ...incidentPaths,
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Consulta a saúde da API e do MongoDB',
        responses: {
          200: {
            description: 'Aplicação saudável',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
              },
            },
          },
          503: {
            description: 'Aplicação disponível, mas sem conexão com o MongoDB',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Cadastra um usuário com papel VIEWER',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' },
              example: {
                name: 'Ana Silva',
                email: 'ana@example.com',
                password: 'Senha123',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuário criado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: {
            description: 'Email já cadastrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: {
                    code: 'EMAIL_ALREADY_EXISTS',
                    message: 'Já existe um usuário com este email.',
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Autentica um usuário e retorna um JWT',
        description:
          'Copie `accessToken` da resposta e use o botão Authorize com o token para acessar endpoints protegidos.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
              example: { email: 'ana@example.com', password: 'Senha123' },
            },
          },
        },
        responses: {
          200: {
            description: 'Autenticação realizada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: {
            description: 'Credenciais incorretas',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: { code: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos.' },
                },
              },
            },
          },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Retorna o usuário autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Usuário autenticado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Consulta um usuário por id',
        description: 'Endpoint restrito a usuários com papel ADMIN.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
          },
        ],
        responses: {
          200: {
            description: 'Usuário encontrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: {
            description: 'Usuário autenticado sem papel ADMIN',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: {
                    code: 'FORBIDDEN',
                    message: 'Você não possui permissão para acessar este recurso.',
                  },
                },
              },
            },
          },
          404: {
            description: 'Usuário não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    responses: {
      ...serviceResponses,
      ...incidentResponses,
      ValidationError: {
        description: 'Dados de entrada inválidos',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Os dados enviados são inválidos.',
                details: [{ field: 'email', message: 'Email inválido.' }],
              },
            },
          },
        },
      },
      Unauthorized: {
        description: 'Token ausente, inválido ou associado a usuário inexistente',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: { code: 'TOKEN_REQUIRED', message: 'Token de acesso não informado.' },
            },
          },
        },
      },
      Forbidden: {
        description: 'Usuário sem o papel necessário',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                code: 'FORBIDDEN',
                message: 'Você não possui permissão para acessar este recurso.',
              },
            },
          },
        },
      },
    },
    schemas: {
      ...serviceSchemas,
      ...incidentSchemas,
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
        properties: {
          id: { type: 'string', example: '66f1b81684e17d2e6cc7e703' },
          name: { type: 'string', example: 'Ana Silva' },
          email: { type: 'string', format: 'email', example: 'ana@example.com' },
          role: { type: 'string', enum: ['ADMIN', 'ENGINEER', 'VIEWER'], example: 'VIEWER' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 254 },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            maxLength: 72,
            description: 'Deve conter letras maiúscula e minúscula e ao menos um número.',
          },
        },
      },
      LoginInput: {
        type: 'object',
        additionalProperties: false,
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['accessToken', 'tokenType', 'expiresIn', 'user'],
        properties: {
          accessToken: { type: 'string', description: 'JWT de acesso' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'string', example: '1h' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'integer', example: 10 },
          database: {
            type: 'object',
            properties: { status: { type: 'string', example: 'connected' } },
          },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
