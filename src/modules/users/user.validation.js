import { z } from 'zod';
import { objectIdSchema } from '../../shared/validation/schemas.js';

export const userIdParamsSchema = z.object({
  id: objectIdSchema,
});
