const { z } = require('zod');

const bookSlotSchema = z.object({
  slotId: z.string().min(1, 'slotId is required')
});

const createSlotSchema = z.object({
  serviceId: z.string().min(1, 'serviceId is required'),
  startTime: z.string().min(1, 'startTime is required'),
  endTime: z.string().min(1, 'endTime is required')
});

const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'bookingId is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'Service name is required').max(100),
  price: z.number().min(0).optional().default(500),
  description: z.string().max(500).optional(),
  category: z.string().optional()
});

module.exports = {
  bookSlotSchema,
  createSlotSchema,
  createReviewSchema,
  createServiceSchema
};
