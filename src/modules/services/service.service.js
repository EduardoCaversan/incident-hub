import { AppError } from '../../shared/errors/AppError.js';
import { incidentReferencesService } from '../incidents/incident.repository.js';
import {
  createService as persistService,
  deleteServiceById,
  findServiceById,
  listServices as findServices,
  updateServiceById,
} from './service.repository.js';

export async function createService(data) {
  try {
    return await persistService(data);
  } catch (error) {
    if (error?.code === 11000) {
      throw duplicateServiceNameError();
    }

    throw error;
  }
}

export function listServices() {
  return findServices();
}

export async function getService(id) {
  const service = await findServiceById(id);

  if (!service) {
    throw serviceNotFoundError();
  }

  return service;
}

export async function updateService(id, data) {
  try {
    const service = await updateServiceById(id, data);

    if (!service) {
      throw serviceNotFoundError();
    }

    return service;
  } catch (error) {
    if (error?.code === 11000) {
      throw duplicateServiceNameError();
    }

    throw error;
  }
}

export async function deleteService(id) {
  if (!(await findServiceById(id))) {
    throw serviceNotFoundError();
  }

  if (await incidentReferencesService(id)) {
    throw new AppError('O serviço não pode ser removido porque está associado a incidentes.', {
      statusCode: 409,
      code: 'SERVICE_IN_USE',
    });
  }

  await deleteServiceById(id);
}

function serviceNotFoundError() {
  return new AppError('Serviço não encontrado.', {
    statusCode: 404,
    code: 'SERVICE_NOT_FOUND',
  });
}

function duplicateServiceNameError() {
  return new AppError('Já existe um serviço com este nome.', {
    statusCode: 409,
    code: 'SERVICE_NAME_ALREADY_EXISTS',
  });
}
