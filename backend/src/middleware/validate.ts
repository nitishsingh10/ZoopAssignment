import { body, param, query, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.type === 'field' ? e.path : e.type, message: e.msg })),
    });
    return;
  }
  next();
};

export const createAgentRules = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[+]?[\d\s\-().]{7,20}$/).withMessage('Invalid phone number format'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('service_area')
    .trim()
    .notEmpty().withMessage('Service area is required')
    .isLength({ min: 2, max: 100 }).withMessage('Service area must be 2–100 characters'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'on_leave']).withMessage('Status must be active, inactive, or on_leave'),

  body('vehicle_type')
    .optional()
    .isIn(['bike', 'scooter', 'car', 'van', 'cycle']).withMessage('Invalid vehicle type'),

  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),

  body('total_deliveries')
    .optional()
    .isInt({ min: 0 }).withMessage('Total deliveries must be a non-negative integer'),

  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors,
];

export const updateAgentRules = [
  param('id').isUUID().withMessage('Invalid agent ID format'),

  body('full_name')
    .optional().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters'),

  body('phone')
    .optional().trim()
    .matches(/^[+]?[\d\s\-().]{7,20}$/).withMessage('Invalid phone number format'),

  body('email')
    .optional().trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('service_area')
    .optional().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Service area must be 2–100 characters'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'on_leave']).withMessage('Status must be active, inactive, or on_leave'),

  body('vehicle_type')
    .optional()
    .isIn(['bike', 'scooter', 'car', 'van', 'cycle']).withMessage('Invalid vehicle type'),

  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),

  body('total_deliveries')
    .optional()
    .isInt({ min: 0 }).withMessage('Total deliveries must be a non-negative integer'),

  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors,
];

export const agentIdRule = [
  param('id').isUUID().withMessage('Invalid agent ID format'),
  handleValidationErrors,
];

export const listQueryRules = [
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'on_leave']).withMessage('Invalid status filter'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  handleValidationErrors,
];
