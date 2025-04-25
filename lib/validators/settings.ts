import { z } from 'zod';

export const settingsSchema = z.object({
  laborRateHourly: z.coerce.number().positive({ message: 'Debe ser positivo' }),
  profitMarginPercent: z.coerce
    .number()
    .min(0, { message: 'No puede ser negativo' }),
  ivaPercent: z.coerce.number().min(0),
  rentMonthly: z.coerce.number().min(0),
  electricityPriceKwh: z.coerce.number().min(0),
  gasPriceUnit: z.coerce.number().min(0),
  waterPriceUnit: z.coerce.number().min(0),
  otherMonthlyOverhead: z.coerce.number().min(0),
  overheadMarkupPercent: z.coerce.number().min(0)
});
export type SettingsFormData = z.infer<typeof settingsSchema>;
