import {
  createIncident,
  deleteIncident,
  getIncident,
  listIncidents,
  updateIncident,
} from './incident.service.js';

export async function create(req, res) {
  const incident = await createIncident(req.body, req.user);
  res.status(201).json({ incident });
}

export async function list(req, res) {
  const result = await listIncidents(req.validatedQuery);
  res.status(200).json(result);
}

export async function getById(req, res) {
  const incident = await getIncident(req.params.id);
  res.status(200).json({ incident });
}

export async function update(req, res) {
  const incident = await updateIncident(req.params.id, req.body);
  res.status(200).json({ incident });
}

export async function remove(req, res) {
  await deleteIncident(req.params.id);
  res.status(204).send();
}
