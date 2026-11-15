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

// Authentication & Account Schemas
export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().max(100, 'Name cannot exceed 100 characters').optional().default('')
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100, 'Name cannot exceed 100 characters')
});

export const updateEmailSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address'),
  currentPassword: z.string().min(1, 'Current password is required to change email')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(128, 'New password cannot exceed 128 characters')
    .regex(/[A-Za-z]/, 'New password must contain at least one letter')
    .regex(/[0-9]/, 'New password must contain at least one number')
});

export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, 'Password confirmation is required to delete your account')
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
