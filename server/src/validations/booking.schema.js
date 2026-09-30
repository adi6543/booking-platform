const { z } = require('zod');

const createSlotSchema = z.object({
  serviceId: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
});

const createBookingSchema = z.object({
  slotId: z.string().min(1)
});

module.exports = { createSlotSchema, createBookingSchema };
