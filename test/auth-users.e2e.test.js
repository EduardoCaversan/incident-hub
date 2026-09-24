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
  await User.init();
});

beforeEach(async () => {
  await User.deleteMany({});
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
