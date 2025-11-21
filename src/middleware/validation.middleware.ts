import { z } from 'zod';
import { ORDER_TYPE, SLIPPAGE } from '../utils/constants';

/**
 * Schema for creating a new order
 */
export const createOrderSchema = z.object({
  tokenIn: z
    .string()
    .min(1, 'Token In is required')
    .max(20, 'Token In must be less than 20 characters'),
  
  tokenOut: z
    .string()
    .min(1, 'Token Out is required')
    .max(20, 'Token Out must be less than 20 characters'),
  
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount exceeds maximum allowed'),
  
  slippage: z
    .number()
    .min(SLIPPAGE.MIN, `Slippage must be at least ${SLIPPAGE.MIN * 100}%`)
    .max(SLIPPAGE.MAX, `Slippage cannot exceed ${SLIPPAGE.MAX * 100}%`)
    .optional()
    .default(SLIPPAGE.DEFAULT),
  
  orderType: z
    .enum([ORDER_TYPE.MARKET, ORDER_TYPE.LIMIT, ORDER_TYPE.SNIPER])
    .optional()
    .default(ORDER_TYPE.MARKET),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Custom validation error formatter
 */
export const formatValidationError = (error: z.ZodError): string => {
  return error.errors
    .map((err) => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
};
