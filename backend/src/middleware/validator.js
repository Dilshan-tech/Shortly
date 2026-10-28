import { z } from 'zod';

export const createUrlSchema = z.object({
  longUrl: z.string().min(1, 'Destination URL is required'),
  customAlias: z
    .string()
    .min(3, 'Alias must be at least 3 characters')
    .max(30, 'Alias cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Alias can only contain letters, numbers, hyphens, and underscores')
    .optional()
    .nullable()
    .or(z.literal('')),
  title: z.string().max(100, 'Title cannot exceed 100 characters').optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable().or(z.literal('')),
  clickLimit: z.number().int().positive().optional().nullable(),
  password: z.string().min(4, 'Password must be at least 4 characters').max(64).optional().nullable().or(z.literal('')),
  isOneTimeUse: z.boolean().optional()
});

export const updateUrlSchema = z.object({
  longUrl: z.string().min(1, 'Destination URL cannot be empty').optional(),
  title: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable().or(z.literal('')),
  clickLimit: z.number().int().positive().optional().nullable(),
  password: z.string().min(4).max(64).optional().nullable().or(z.literal(''))
});

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}
