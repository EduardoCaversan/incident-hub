import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from './modules/incidents/incident.constants.js';
import { Incident } from './modules/incidents/incident.model.js';
import { Service } from './modules/services/service.model.js';
import { SERVICE_STATUSES } from './modules/services/service.status.js';
import { User } from './modules/users/user.model.js';
import { USER_ROLES } from './modules/users/user.roles.js';
import { hashPassword } from './shared/security/password.js';

const seedUsers = [
  { name: 'IncidentHub Admin', email: 'admin@incidenthub.local', role: USER_ROLES.ADMIN },
  {
    name: 'IncidentHub Engineer',
    email: 'engineer@incidenthub.local',
    role: USER_ROLES.ENGINEER,
  },
  { name: 'IncidentHub Viewer', email: 'viewer@incidenthub.local', role: USER_ROLES.VIEWER },
];

const seedServices = [
  {
    name: 'Payments API',
    description: 'Processa cobranças, pagamentos e estornos.',
    status: SERVICE_STATUSES.DEGRADED,
  },
  {
    name: 'Authentication API',
    description: 'Autentica usuários e emite credenciais de acesso.',
    status: SERVICE_STATUSES.OPERATIONAL,
  },
  {
    name: 'Customer API',
    description: 'Mantém dados e preferências de clientes.',
    status: SERVICE_STATUSES.OPERATIONAL,
  },
  {
    name: 'Notification Service',
    description: 'Envia emails e notificações transacionais.',
    status: SERVICE_STATUSES.OPERATIONAL,
  },
];

async function seed() {
  const password = validateSeedPassword(process.env.SEED_USER_PASSWORD);
  await connectDatabase(env.mongoUri);

  try {
    const users = await seedUserDocuments(password);
    const services = await seedServiceDocuments();
    const userByRole = Object.fromEntries(users.map((user) => [user.role, user]));
    const serviceByName = Object.fromEntries(services.map((service) => [service.name, service]));

    const incidents = [
      {
        title: 'Payment gateway timeouts',
        description: 'Transações estão excedendo o tempo limite no provedor de pagamentos.',
        severity: INCIDENT_SEVERITIES.CRITICAL,
        status: INCIDENT_STATUSES.INVESTIGATING,
        affectedServices: [serviceByName['Payments API'].id],
        assignedTo: userByRole.ENGINEER.id,
        createdBy: userByRole.ADMIN.id,
      },
      {
        title: 'Increased authentication latency',
        description: 'O tempo de resposta do login está acima do esperado.',
        severity: INCIDENT_SEVERITIES.HIGH,
        status: INCIDENT_STATUSES.IDENTIFIED,
        affectedServices: [serviceByName['Authentication API'].id],
        assignedTo: userByRole.ENGINEER.id,
        createdBy: userByRole.ENGINEER.id,
      },
      {
        title: 'Customer profile degradation',
        description: 'Consultas de perfil apresentam falhas intermitentes.',
        severity: INCIDENT_SEVERITIES.MEDIUM,
        status: INCIDENT_STATUSES.MONITORING,
        affectedServices: [serviceByName['Customer API'].id],
        assignedTo: userByRole.ENGINEER.id,
        createdBy: userByRole.ADMIN.id,
      },
      {
        title: 'Delayed transactional notifications',
        description: 'Notificações foram entregues com atraso e o serviço já foi normalizado.',
        severity: INCIDENT_SEVERITIES.LOW,
        status: INCIDENT_STATUSES.RESOLVED,
        affectedServices: [serviceByName['Notification Service'].id],
        assignedTo: userByRole.ENGINEER.id,
        createdBy: userByRole.ADMIN.id,
      },
    ];

    await Promise.all(
      incidents.map(({ title, createdBy, ...data }) =>
        Incident.findOneAndUpdate(
          { title, createdBy },
          { $set: data, $setOnInsert: { title, createdBy } },
          { upsert: true, returnDocument: 'after', runValidators: true },
        ),
      ),
    );

    console.info('Seed concluído: 3 usuários, 4 serviços e 4 incidentes disponíveis.');
    console.info(
      'Usuários: admin@incidenthub.local, engineer@incidenthub.local e viewer@incidenthub.local.',
    );
  } finally {
    await disconnectDatabase();
  }
}

async function seedUserDocuments(password) {
  return Promise.all(
    seedUsers.map(async (user) => {
      const passwordHash = await hashPassword(password);
      return User.findOneAndUpdate(
        { email: user.email },
        { $set: { ...user, password: passwordHash } },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
      );
    }),
  );
}

function seedServiceDocuments() {
  return Promise.all(
    seedServices.map(({ name, ...data }) =>
      Service.findOneAndUpdate(
        { name },
        { $set: data, $setOnInsert: { name } },
        { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true },
      ),
    ),
  );
}

function validateSeedPassword(password) {
  const hasRequiredCharacters =
    /[a-z]/.test(password || '') && /[A-Z]/.test(password || '') && /\d/.test(password || '');

  if (!password || password.length < 8 || password.length > 72 || !hasRequiredCharacters) {
    throw new Error(
      'SEED_USER_PASSWORD deve possuir entre 8 e 72 caracteres, com letras maiúscula e minúscula e um número.',
    );
  }

  return password;
}

seed().catch((error) => {
  console.error('Não foi possível executar o seed.', error);
  process.exitCode = 1;
});
