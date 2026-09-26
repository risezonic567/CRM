import Joi from 'joi';
import { ROLES } from '../../config/constants.js';

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const createUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1).required(),
  lastName: Joi.string().trim().min(1).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(ROLES.AGENT, ROLES.VIEWER).required(),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().trim().min(1),
  lastName: Joi.string().trim().min(1),
  email: Joi.string().email(),
  password: Joi.string().min(8),
  role: Joi.string().valid(ROLES.AGENT, ROLES.VIEWER),
  isActive: Joi.boolean(),
}).min(1);
