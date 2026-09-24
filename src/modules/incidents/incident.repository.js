import { Incident } from './incident.model.js';

const relations = [
  { path: 'affectedServices', select: 'name description status createdAt updatedAt' },
  { path: 'assignedTo', select: 'name email role' },
  { path: 'createdBy', select: 'name email role' },
];

export function createIncident(data) {
  return Incident.create(data);
}

export function findIncidentById(id) {
  return Incident.findById(id).populate(relations);
}

export async function listIncidents(filters, { page, limit }) {
  const skip = (page - 1) * limit;
  const [incidents, total] = await Promise.all([
    Incident.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(relations),
    Incident.countDocuments(filters),
  ]);

  return { incidents, total };
}

export function updateIncidentById(id, data) {
  return Incident.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  }).populate(relations);
}

export function deleteIncidentById(id) {
  return Incident.findByIdAndDelete(id);
}

export async function incidentReferencesService(serviceId) {
  return Boolean(await Incident.exists({ affectedServices: serviceId }));
}
