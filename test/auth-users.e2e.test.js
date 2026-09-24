import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/incident-hub-test';
process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';

const { app } = await import('../src/app.js');
const { connectDatabase, disconnectDatabase } = await import('../src/config/database.js');
const { openApiDocument } = await import('../src/config/openapi.js');
const { Incident } = await import('../src/modules/incidents/incident.model.js');
const { Service } = await import('../src/modules/services/service.model.js');
const { User } = await import('../src/modules/users/user.model.js');

let mongoServer;

const validUser = {
  name: 'Ana Silva',
  email: 'ana@example.com',
  password: 'Senha123',
};

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase(mongoServer.getUri());
  await Promise.all([User.init(), Service.init(), Incident.init()]);
});

beforeEach(async () => {
  await Promise.all([Incident.deleteMany({}), Service.deleteMany({}), User.deleteMany({})]);
});

async function authenticateAs(role, email) {
  const registration = await request(app)
    .post('/api/auth/register')
    .send({
      name: `${role} User`,
      email,
      password: 'Senha123',
    });

  if (role !== 'VIEWER') {
    await User.updateOne({ _id: registration.body.user.id }, { role });
  }

  const login = await request(app).post('/api/auth/login').send({ email, password: 'Senha123' });

  return {
    authorization: `Bearer ${login.body.accessToken}`,
    user: login.body.user,
  };
}

async function createMonitoredService(authorization, overrides = {}) {
  return request(app)
    .post('/api/services')
    .set('Authorization', authorization)
    .send({
      name: 'Payments API',
      description: 'Processamento de pagamentos',
      ...overrides,
    });
}

test('OpenAPI documenta os módulos e não possui referências internas ausentes', () => {
  assert.deepEqual(
    openApiDocument.tags.map(({ name }) => name),
    ['Auth', 'Users', 'Services', 'Incidents', 'System'],
  );

  for (const path of [
    '/api/services',
    '/api/services/{id}',
    '/api/incidents',
    '/api/incidents/{id}',
  ]) {
    assert.ok(openApiDocument.paths[path]);
  }

  const references = [];

  function collectReferences(value) {
    if (!value || typeof value !== 'object') return;
    if (value.$ref) references.push(value.$ref);
    Object.values(value).forEach(collectReferences);
  }

  collectReferences(openApiDocument);

  for (const reference of references) {
    const parts = reference.replace('#/', '').split('/');
    const target = parts.reduce((value, part) => value?.[part], openApiDocument);
    assert.ok(target, `Referência OpenAPI ausente: ${reference}`);
  }
});

after(async () => {
  await disconnectDatabase();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test('cadastra usuário válido, aplica hash e não retorna password', async () => {
  const response = await request(app).post('/api/auth/register').send(validUser);

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, validUser.email);
  assert.equal(response.body.user.role, 'VIEWER');
  assert.ok(response.body.user.id);
  assert.equal(JSON.stringify(response.body).includes('password'), false);

  const persistedUser = await User.findOne({ email: validUser.email }).select('+password');
  assert.notEqual(persistedUser.password, validUser.password);
  assert.match(persistedUser.password, /^\$2[aby]\$/);
});

test('rejeita email duplicado', async () => {
  await request(app).post('/api/auth/register').send(validUser);
  const response = await request(app).post('/api/auth/register').send(validUser);

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'EMAIL_ALREADY_EXISTS');
});

test('valida email e senha no cadastro', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: 'Ana Silva',
    email: 'email-invalido',
    password: 'fraca',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.ok(response.body.error.details.some(({ field }) => field === 'email'));
  assert.ok(response.body.error.details.some(({ field }) => field === 'password'));
});

test('realiza login válido e não retorna o hash', async () => {
  await request(app).post('/api/auth/register').send(validUser);
  const response = await request(app).post('/api/auth/login').send({
    email: validUser.email,
    password: validUser.password,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.tokenType, 'Bearer');
  assert.equal(response.body.expiresIn, '1h');
  assert.ok(response.body.accessToken);
  assert.equal(JSON.stringify(response.body).includes('password'), false);
});

test('rejeita login com credenciais incorretas', async () => {
  await request(app).post('/api/auth/register').send(validUser);
  const response = await request(app).post('/api/auth/login').send({
    email: validUser.email,
    password: 'Errada123',
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('rejeita endpoint protegido sem token', async () => {
  const response = await request(app).get('/api/users/me');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'TOKEN_REQUIRED');
});

test('rejeita endpoint protegido com token inválido', async () => {
  const response = await request(app)
    .get('/api/users/me')
    .set('Authorization', 'Bearer token-invalido');

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_TOKEN');
});

test('retorna o usuário no endpoint protegido com token válido', async () => {
  await request(app).post('/api/auth/register').send(validUser);
  const loginResponse = await request(app).post('/api/auth/login').send({
    email: validUser.email,
    password: validUser.password,
  });

  const response = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, validUser.email);
  assert.equal(JSON.stringify(response.body).includes('password'), false);
});

test('impede VIEWER de consultar usuário por id', async () => {
  const registration = await request(app).post('/api/auth/register').send(validUser);
  const loginResponse = await request(app).post('/api/auth/login').send({
    email: validUser.email,
    password: validUser.password,
  });

  const response = await request(app)
    .get(`/api/users/${registration.body.user.id}`)
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('permite ADMIN consultar usuário e responde 404 quando ele não existe', async () => {
  const registration = await request(app).post('/api/auth/register').send(validUser);
  await User.updateOne({ _id: registration.body.user.id }, { role: 'ADMIN' });
  const loginResponse = await request(app).post('/api/auth/login').send({
    email: validUser.email,
    password: validUser.password,
  });
  const authorization = `Bearer ${loginResponse.body.accessToken}`;

  const foundResponse = await request(app)
    .get(`/api/users/${registration.body.user.id}`)
    .set('Authorization', authorization);
  const missingResponse = await request(app)
    .get('/api/users/000000000000000000000000')
    .set('Authorization', authorization);

  assert.equal(foundResponse.status, 200);
  assert.equal(foundResponse.body.user.role, 'ADMIN');
  assert.equal(JSON.stringify(foundResponse.body).includes('password'), false);
  assert.equal(missingResponse.status, 404);
  assert.equal(missingResponse.body.error.code, 'USER_NOT_FOUND');
});

test('rejeita token de usuário que não existe mais', async () => {
  await request(app).post('/api/auth/register').send(validUser);
  const loginResponse = await request(app).post('/api/auth/login').send({
    email: validUser.email,
    password: validUser.password,
  });
  await User.deleteMany({});

  const response = await request(app)
    .get('/api/users/me')
    .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'TOKEN_USER_NOT_FOUND');
});

test('ADMIN executa o ciclo completo de services', async () => {
  const admin = await authenticateAs('ADMIN', 'admin-services@example.com');
  const created = await createMonitoredService(admin.authorization);

  assert.equal(created.status, 201);
  assert.equal(created.body.service.status, 'OPERATIONAL');

  const list = await request(app).get('/api/services').set('Authorization', admin.authorization);
  const detail = await request(app)
    .get(`/api/services/${created.body.service.id}`)
    .set('Authorization', admin.authorization);
  const updated = await request(app)
    .patch(`/api/services/${created.body.service.id}`)
    .set('Authorization', admin.authorization)
    .send({ status: 'DEGRADED' });
  const removed = await request(app)
    .delete(`/api/services/${created.body.service.id}`)
    .set('Authorization', admin.authorization);
  const missing = await request(app)
    .get(`/api/services/${created.body.service.id}`)
    .set('Authorization', admin.authorization);

  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal(detail.body.service.name, 'Payments API');
  assert.equal(updated.body.service.status, 'DEGRADED');
  assert.equal(removed.status, 204);
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'SERVICE_NOT_FOUND');
});

test('aplica autorização e validações em services', async () => {
  const viewer = await authenticateAs('VIEWER', 'viewer-services@example.com');
  const forbidden = await createMonitoredService(viewer.authorization);
  assert.equal(forbidden.status, 403);

  const admin = await authenticateAs('ADMIN', 'admin-validation@example.com');
  const invalid = await createMonitoredService(admin.authorization, { status: 'UNKNOWN' });
  const first = await createMonitoredService(admin.authorization);
  const duplicate = await createMonitoredService(admin.authorization);
  const viewerList = await request(app)
    .get('/api/services')
    .set('Authorization', viewer.authorization);

  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  assert.equal(first.status, 201);
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, 'SERVICE_NAME_ALREADY_EXISTS');
  assert.equal(viewerList.status, 200);
});

test('ENGINEER cria incidente com referências válidas e createdBy autenticado', async () => {
  const admin = await authenticateAs('ADMIN', 'admin-create-incident@example.com');
  const engineer = await authenticateAs('ENGINEER', 'engineer-create@example.com');
  const service = await createMonitoredService(admin.authorization);

  const response = await request(app)
    .post('/api/incidents')
    .set('Authorization', engineer.authorization)
    .send({
      title: 'Falha nos pagamentos',
      description: 'Transações estão retornando erro.',
      severity: 'CRITICAL',
      affectedServices: [service.body.service.id],
      assignedTo: engineer.user.id,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.incident.status, 'INVESTIGATING');
  assert.equal(response.body.incident.createdBy.id, engineer.user.id);
  assert.equal(response.body.incident.assignedTo.id, engineer.user.id);
  assert.equal(response.body.incident.affectedServices[0].id, service.body.service.id);
});

test('rejeita enums e referências inválidas em incidents', async () => {
  const admin = await authenticateAs('ADMIN', 'admin-invalid-incident@example.com');
  const viewer = await authenticateAs('VIEWER', 'viewer-assignee@example.com');
  const service = await createMonitoredService(admin.authorization);

  const invalidSeverity = await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Falha inválida',
      description: 'Teste de validação.',
      severity: 'URGENT',
      affectedServices: [service.body.service.id],
    });
  const invalidService = await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Serviço inexistente',
      description: 'Teste de referência.',
      severity: 'HIGH',
      affectedServices: ['000000000000000000000000'],
    });
  const invalidAssignee = await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Responsável inválido',
      description: 'VIEWER não pode ser responsável.',
      severity: 'HIGH',
      affectedServices: [service.body.service.id],
      assignedTo: viewer.user.id,
    });
  const missingAssignee = await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Responsável inexistente',
      description: 'Teste de referência de usuário.',
      severity: 'HIGH',
      affectedServices: [service.body.service.id],
      assignedTo: '000000000000000000000000',
    });
  const forgedCreator = await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Criador arbitrário',
      description: 'O cliente não pode definir o criador.',
      severity: 'LOW',
      affectedServices: [service.body.service.id],
      createdBy: viewer.user.id,
    });

  assert.equal(invalidSeverity.status, 400);
  assert.equal(invalidSeverity.body.error.code, 'VALIDATION_ERROR');
  assert.equal(invalidService.status, 400);
  assert.equal(invalidService.body.error.code, 'INVALID_SERVICE_REFERENCE');
  assert.equal(invalidAssignee.status, 400);
  assert.equal(invalidAssignee.body.error.code, 'INVALID_ASSIGNEE_ROLE');
  assert.equal(missingAssignee.status, 400);
  assert.equal(missingAssignee.body.error.code, 'INVALID_ASSIGNEE');
  assert.equal(forgedCreator.status, 400);
  assert.equal(forgedCreator.body.error.code, 'VALIDATION_ERROR');
});

test('VIEWER lê, mas não pode criar, alterar ou excluir incidents', async () => {
  const admin = await authenticateAs('ADMIN', 'admin-authz-incident@example.com');
  const viewer = await authenticateAs('VIEWER', 'viewer-incident@example.com');
  const service = await createMonitoredService(admin.authorization);
  const created = await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Incidente protegido',
      description: 'Usado para validar autorização.',
      severity: 'LOW',
      affectedServices: [service.body.service.id],
    });

  const list = await request(app).get('/api/incidents').set('Authorization', viewer.authorization);
  const createAttempt = await request(app)
    .post('/api/incidents')
    .set('Authorization', viewer.authorization)
    .send({});
  const updateAttempt = await request(app)
    .patch(`/api/incidents/${created.body.incident.id}`)
    .set('Authorization', viewer.authorization)
    .send({ severity: 'HIGH' });
  const deleteAttempt = await request(app)
    .delete(`/api/incidents/${created.body.incident.id}`)
    .set('Authorization', viewer.authorization);

  assert.equal(list.status, 200);
  assert.equal(createAttempt.status, 403);
  assert.equal(updateAttempt.status, 403);
  assert.equal(deleteAttempt.status, 403);
});

test('ADMIN consulta, atualiza e exclui incident', async () => {
  const admin = await authenticateAs('ADMIN', 'admin-crud-incident@example.com');
  const service = await createMonitoredService(admin.authorization);
  const created = await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Latência elevada',
      description: 'Tempo de resposta acima do esperado.',
      severity: 'MEDIUM',
      affectedServices: [service.body.service.id],
    });
  const id = created.body.incident.id;

  const detail = await request(app)
    .get(`/api/incidents/${id}`)
    .set('Authorization', admin.authorization);
  const updated = await request(app)
    .patch(`/api/incidents/${id}`)
    .set('Authorization', admin.authorization)
    .send({ status: 'IDENTIFIED', severity: 'HIGH' });
  const removed = await request(app)
    .delete(`/api/incidents/${id}`)
    .set('Authorization', admin.authorization);
  const missing = await request(app)
    .get(`/api/incidents/${id}`)
    .set('Authorization', admin.authorization);

  assert.equal(detail.status, 200);
  assert.equal(updated.body.incident.status, 'IDENTIFIED');
  assert.equal(updated.body.incident.severity, 'HIGH');
  assert.equal(removed.status, 204);
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error.code, 'INCIDENT_NOT_FOUND');
});

test('filtra incidents e retorna paginação limitada', async () => {
  const admin = await authenticateAs('ADMIN', 'admin-list-incident@example.com');
  const engineer = await authenticateAs('ENGINEER', 'engineer-filter@example.com');
  const payments = await createMonitoredService(admin.authorization);
  const authentication = await createMonitoredService(admin.authorization, {
    name: 'Authentication API',
  });
  const incidents = [
    {
      title: 'Falha crítica de pagamento',
      description: 'Pagamentos indisponíveis.',
      severity: 'CRITICAL',
      status: 'INVESTIGATING',
      affectedServices: [payments.body.service.id],
      assignedTo: engineer.user.id,
    },
    {
      title: 'Falha crítica de autenticação',
      description: 'Logins com intermitência.',
      severity: 'CRITICAL',
      status: 'MONITORING',
      affectedServices: [authentication.body.service.id],
    },
    {
      title: 'Latência em pagamentos',
      description: 'Processamento mais lento.',
      severity: 'LOW',
      status: 'IDENTIFIED',
      affectedServices: [payments.body.service.id],
    },
  ];

  for (const incident of incidents) {
    await request(app)
      .post('/api/incidents')
      .set('Authorization', admin.authorization)
      .send(incident);
  }

  const critical = await request(app)
    .get('/api/incidents?severity=CRITICAL')
    .set('Authorization', admin.authorization);
  const monitoring = await request(app)
    .get('/api/incidents?status=MONITORING')
    .set('Authorization', admin.authorization);
  const byService = await request(app)
    .get(`/api/incidents?service=${payments.body.service.id}`)
    .set('Authorization', admin.authorization);
  const assigned = await request(app)
    .get(`/api/incidents?assignedTo=${engineer.user.id}`)
    .set('Authorization', admin.authorization);
  const secondPage = await request(app)
    .get('/api/incidents?page=2&limit=2')
    .set('Authorization', admin.authorization);
  const excessiveLimit = await request(app)
    .get('/api/incidents?limit=101')
    .set('Authorization', admin.authorization);

  assert.equal(critical.body.data.length, 2);
  assert.equal(monitoring.body.data.length, 1);
  assert.equal(byService.body.data.length, 2);
  assert.equal(assigned.body.data.length, 1);
  assert.deepEqual(secondPage.body.pagination, {
    page: 2,
    limit: 2,
    total: 3,
    pages: 2,
  });
  assert.equal(secondPage.body.data.length, 1);
  assert.equal(excessiveLimit.status, 400);
});

test('impede excluir service associado a incident', async () => {
  const admin = await authenticateAs('ADMIN', 'admin-service-reference@example.com');
  const service = await createMonitoredService(admin.authorization);
  await request(app)
    .post('/api/incidents')
    .set('Authorization', admin.authorization)
    .send({
      title: 'Incidente com serviço',
      description: 'Mantém a integridade da referência.',
      severity: 'HIGH',
      affectedServices: [service.body.service.id],
    });

  const response = await request(app)
    .delete(`/api/services/${service.body.service.id}`)
    .set('Authorization', admin.authorization);

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'SERVICE_IN_USE');
});
