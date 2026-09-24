const security = [{ bearerAuth: [] }];
const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Id do incidente',
  schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
};

const incidentResponse = {
  description: 'Incidente encontrado',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { incident: { $ref: '#/components/schemas/Incident' } },
      },
    },
  },
};

const filterParameters = [
  {
    name: 'severity',
    in: 'query',
    schema: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  },
  {
    name: 'status',
    in: 'query',
    schema: {
      type: 'string',
      enum: ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'],
    },
  },
  {
    name: 'service',
    in: 'query',
    description: 'Id de um serviço afetado',
    schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
  },
  {
    name: 'assignedTo',
    in: 'query',
    description: 'Id do usuário responsável',
    schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
  },
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
];

export const incidentPaths = {
  '/api/incidents': {
    get: {
      tags: ['Incidents'],
      summary: 'Lista e filtra incidentes',
      description: 'Retorna incidentes do mais recente para o mais antigo.',
      security,
      parameters: filterParameters,
      responses: {
        200: {
          description: 'Página de incidentes',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedIncidents' },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    post: {
      tags: ['Incidents'],
      summary: 'Registra um incidente',
      description: 'Requer papel ADMIN ou ENGINEER. `createdBy` é obtido do JWT.',
      security,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/IncidentCreateInput' },
            example: {
              title: 'Falha nos pagamentos',
              description: 'Transações estão retornando erro.',
              severity: 'CRITICAL',
              affectedServices: ['66f1b81684e17d2e6cc7e703'],
              assignedTo: '66f1b81684e17d2e6cc7e704',
            },
          },
        },
      },
      responses: {
        201: { ...incidentResponse, description: 'Incidente criado' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/api/incidents/{id}': {
    get: {
      tags: ['Incidents'],
      summary: 'Consulta um incidente por id',
      security,
      parameters: [idParameter],
      responses: {
        200: incidentResponse,
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/IncidentNotFound' },
      },
    },
    patch: {
      tags: ['Incidents'],
      summary: 'Atualiza parcialmente um incidente',
      description: 'Requer papel ADMIN ou ENGINEER. `createdBy` não pode ser alterado.',
      security,
      parameters: [idParameter],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/IncidentUpdateInput' },
            example: { status: 'IDENTIFIED', severity: 'HIGH' },
          },
        },
      },
      responses: {
        200: incidentResponse,
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/IncidentNotFound' },
      },
    },
    delete: {
      tags: ['Incidents'],
      summary: 'Remove um incidente',
      description: 'Requer papel ADMIN.',
      security,
      parameters: [idParameter],
      responses: {
        204: { description: 'Incidente removido' },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/IncidentNotFound' },
      },
    },
  },
};

const incidentWriteProperties = {
  title: { type: 'string', minLength: 3, maxLength: 150 },
  description: { type: 'string', minLength: 3, maxLength: 2000 },
  severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
  status: {
    type: 'string',
    enum: ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'],
  },
  affectedServices: {
    type: 'array',
    minItems: 1,
    maxItems: 20,
    uniqueItems: true,
    items: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
  },
  assignedTo: {
    type: 'string',
    nullable: true,
    pattern: '^[a-fA-F0-9]{24}$',
    description: 'Id de um usuário ADMIN ou ENGINEER',
  },
};

export const incidentSchemas = {
  Incident: {
    type: 'object',
    required: [
      'id',
      'title',
      'description',
      'severity',
      'status',
      'affectedServices',
      'createdBy',
      'createdAt',
      'updatedAt',
    ],
    properties: {
      id: { type: 'string' },
      title: { type: 'string', example: 'Falha nos pagamentos' },
      description: { type: 'string', example: 'Transações estão retornando erro.' },
      severity: incidentWriteProperties.severity,
      status: incidentWriteProperties.status,
      affectedServices: {
        type: 'array',
        items: { $ref: '#/components/schemas/Service' },
      },
      assignedTo: { ...userReferenceSchema(), nullable: true },
      createdBy: userReferenceSchema(),
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  IncidentCreateInput: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'severity', 'affectedServices'],
    properties: incidentWriteProperties,
  },
  IncidentUpdateInput: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: incidentWriteProperties,
  },
  PaginatedIncidents: {
    type: 'object',
    required: ['data', 'pagination'],
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/Incident' } },
      pagination: {
        type: 'object',
        required: ['page', 'limit', 'total', 'pages'],
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          pages: { type: 'integer', example: 3 },
        },
      },
    },
  },
};

export const incidentResponses = {
  IncidentNotFound: {
    description: 'Incidente não encontrado',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: {
          error: { code: 'INCIDENT_NOT_FOUND', message: 'Incidente não encontrado.' },
        },
      },
    },
  },
};

function userReferenceSchema() {
  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['ADMIN', 'ENGINEER', 'VIEWER'] },
    },
  };
}
