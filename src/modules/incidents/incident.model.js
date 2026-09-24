import mongoose from 'mongoose';
import {
  INCIDENT_SEVERITY_VALUES,
  INCIDENT_STATUSES,
  INCIDENT_STATUS_VALUES,
} from './incident.constants.js';

function transformIncident(_document, value) {
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  return value;
}

const incidentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 2000,
    },
    severity: {
      type: String,
      enum: INCIDENT_SEVERITY_VALUES,
      required: true,
    },
    status: {
      type: String,
      enum: INCIDENT_STATUS_VALUES,
      default: INCIDENT_STATUSES.INVESTIGATING,
      required: true,
    },
    affectedServices: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
      required: true,
      validate: {
        validator: (ids) => ids.length > 0 && new Set(ids.map(String)).size === ids.length,
        message: 'Informe ao menos um serviço afetado, sem duplicidades.',
      },
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: transformIncident },
    toObject: { transform: transformIncident },
  },
);

incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ severity: 1, createdAt: -1 });
incidentSchema.index({ affectedServices: 1, createdAt: -1 });
incidentSchema.index({ assignedTo: 1, createdAt: -1 });
incidentSchema.index({ createdAt: -1 });

export const Incident = mongoose.model('Incident', incidentSchema);
