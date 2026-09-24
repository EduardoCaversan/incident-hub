import { AppError } from '../../shared/errors/AppError.js';
import { findServicesByIds } from '../services/service.repository.js';
import { findUserById } from '../users/user.repository.js';
import { USER_ROLES } from '../users/user.roles.js';
import {
  createIncident as persistIncident,
  deleteIncidentById,
  findIncidentById,
  listIncidents as findIncidents,
  updateIncidentById,
} from './incident.repository.js';

const assignableRoles = new Set([USER_ROLES.ADMIN, USER_ROLES.ENGINEER]);

export async function createIncident(data, currentUser) {
  await validateReferences(data);
  const incident = await persistIncident({ ...data, createdBy: currentUser.id });
  return findIncidentById(incident.id);
}

export async function listIncidents(query) {
  const { page, limit, service, ...simpleFilters } = query;
  const filters = { ...simpleFilters };

  if (service) {
    filters.affectedServices = service;
  }

  const { incidents, total } = await findIncidents(filters, { page, limit });

  return {
    data: incidents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getIncident(id) {
  const incident = await findIncidentById(id);

  if (!incident) {
    throw incidentNotFoundError();
  }

  return incident;
}

export async function updateIncident(id, data) {
  if (!(await findIncidentById(id))) {
    throw incidentNotFoundError();
  }

  await validateReferences(data);
  return updateIncidentById(id, data);
}

export async function deleteIncident(id) {
  const incident = await deleteIncidentById(id);

  if (!incident) {
    throw incidentNotFoundError();
  }
}

async function validateReferences(data) {
  if (data.affectedServices) {
    const services = await findServicesByIds(data.affectedServices);

    if (services.length !== data.affectedServices.length) {
      throw new AppError('Um ou mais serviços afetados não existem.', {
        statusCode: 400,
        code: 'INVALID_SERVICE_REFERENCE',
      });
    }
  }

  if (data.assignedTo) {
    const assignee = await findUserById(data.assignedTo);

    if (!assignee) {
      throw new AppError('O usuário responsável não existe.', {
        statusCode: 400,
        code: 'INVALID_ASSIGNEE',
      });
    }

    if (!assignableRoles.has(assignee.role)) {
      throw new AppError('Somente ADMIN ou ENGINEER pode ser responsável por um incidente.', {
        statusCode: 400,
        code: 'INVALID_ASSIGNEE_ROLE',
      });
    }
  }
}

function incidentNotFoundError() {
  return new AppError('Incidente não encontrado.', {
    statusCode: 404,
    code: 'INCIDENT_NOT_FOUND',
  });
}
