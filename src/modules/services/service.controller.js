import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from './service.service.js';

export async function create(req, res) {
  const service = await createService(req.body);
  res.status(201).json({ service });
}

export async function list(_req, res) {
  const services = await listServices();
  res.status(200).json({ data: services });
}

export async function getById(req, res) {
  const service = await getService(req.params.id);
  res.status(200).json({ service });
}

export async function update(req, res) {
  const service = await updateService(req.params.id, req.body);
  res.status(200).json({ service });
}

export async function remove(req, res) {
  await deleteService(req.params.id);
  res.status(204).send();
}
