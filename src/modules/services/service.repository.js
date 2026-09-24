import { Service } from './service.model.js';

export function createService(data) {
  return Service.create(data);
}

export function listServices() {
  return Service.find().sort({ name: 1 });
}

export function findServiceById(id) {
  return Service.findById(id);
}

export function findServicesByIds(ids) {
  return Service.find({ _id: { $in: ids } }).select('_id');
}

export function updateServiceById(id, data) {
  return Service.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
}

export function deleteServiceById(id) {
  return Service.findByIdAndDelete(id);
}
