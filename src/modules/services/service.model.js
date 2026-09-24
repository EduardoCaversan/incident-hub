import mongoose from 'mongoose';
import { SERVICE_STATUSES, SERVICE_STATUS_VALUES } from './service.status.js';

function transformService(_document, value) {
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  return value;
}

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    status: {
      type: String,
      enum: SERVICE_STATUS_VALUES,
      default: SERVICE_STATUSES.OPERATIONAL,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: transformService },
    toObject: { transform: transformService },
  },
);

export const Service = mongoose.model('Service', serviceSchema);
