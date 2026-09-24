const security = [{ bearerAuth: [] }];
const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Id do serviço',
  schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
};

const serviceResponse = {
  description: 'Serviço encontrado',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { service: { $ref: '#/components/schemas/Service' } },
      },
    },
  },
};

export const servicePaths = {
  '/api/services': {
    get: {
      tags: ['Services'],
      summary: 'Lista os serviços monitorados',
      security,
      responses: {
        200: {
          description: 'Lista de serviços ordenada por nome',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Service' } },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Services'],
      summary: 'Cadastra um serviço',
      description: 'Requer papel ADMIN.',
      security,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ServiceCreateInput' },
            example: {
              name: 'Payments API',
              description: 'Processamento de pagamentos',
              status: 'OPERATIONAL',
            },
          },
        },
      },
      responses: {
        201: { ...serviceResponse, description: 'Serviço criado' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        409: {
          description: 'Nome de serviço já cadastrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'SERVICE_NAME_ALREADY_EXISTS',
                  message: 'Já existe um serviço com este nome.',
                },
              },
            },
          },
        },
      },
    },
  },
  '/api/services/{id}': {
    get: {
      tags: ['Services'],
      summary: 'Consulta um serviço por id',
      security,
      parameters: [idParameter],
      responses: {
        200: serviceResponse,
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/ServiceNotFound' },
      },
    },
    patch: {
      tags: ['Services'],
      summary: 'Atualiza parcialmente um serviço',
      description: 'Requer papel ADMIN.',
      security,
      parameters: [idParameter],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ServiceUpdateInput' },
            example: { status: 'DEGRADED' },
          },
        },
      },
      responses: {
        200: serviceResponse,
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/ServiceNotFound' },
        409: { description: 'Nome de serviço já cadastrado' },
      },
    },
    delete: {
      tags: ['Services'],
      summary: 'Remove um serviço',
      description: 'Requer papel ADMIN. Serviços associados a incidentes não podem ser removidos.',
      security,
      parameters: [idParameter],
      responses: {
        204: { description: 'Serviço removido' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/ServiceNotFound' },
        409: {
          description: 'Serviço associado a um incidente',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'SERVICE_IN_USE',
                  message: 'O serviço não pode ser removido porque está associado a incidentes.',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const serviceSchemas = {
  Service: {
    type: 'object',
    required: ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', example: '66f1b81684e17d2e6cc7e703' },
      name: { type: 'string', example: 'Payments API' },
      description: { type: 'string', example: 'Processamento de pagamentos' },
      status: {
        type: 'string',
        enum: ['OPERATIONAL', 'DEGRADED', 'MAINTENANCE', 'INACTIVE'],
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  ServiceCreateInput: {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      status: {
        type: 'string',
        enum: ['OPERATIONAL', 'DEGRADED', 'MAINTENANCE', 'INACTIVE'],
        default: 'OPERATIONAL',
      },
    },
  },
  ServiceUpdateInput: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      status: {
        type: 'string',
        enum: ['OPERATIONAL', 'DEGRADED', 'MAINTENANCE', 'INACTIVE'],
      },
    },
  },
};

export const serviceResponses = {
  ServiceNotFound: {
    description: 'Serviço não encontrado',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          error: { code: 'SERVICE_NOT_FOUND', message: 'Serviço não encontrado.' },
        },
      },
    },
  },
};
