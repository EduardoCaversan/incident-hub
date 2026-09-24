import mongoose from 'mongoose';
import { USER_ROLES, USER_ROLE_VALUES } from './user.roles.js';

function removePrivateFields(_document, value) {
  value.id = value._id.toString();
  delete value._id;
  delete value.__v;
  delete value.password;
  return value;
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      default: USER_ROLES.VIEWER,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: removePrivateFields },
    toObject: { transform: removePrivateFields },
  },
);

export const User = mongoose.model('User', userSchema);
