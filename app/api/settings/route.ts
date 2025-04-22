// app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businessSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const SettingsPartialSchema = z
  .object({
    laborRateHourly: z.coerce.number().positive().optional(),
    profitMarginPercent: z.coerce.number().min(0).optional(),
    ivaPercent: z.coerce.number().min(0).optional(),
    rentMonthly: z.coerce.number().min(0).optional(),
    electricityPriceKwh: z.coerce.number().min(0).optional(),
    gasPriceUnit: z.coerce.number().min(0).optional(),
    waterPriceUnit: z.coerce.number().min(0).optional(),
    otherMonthlyOverhead: z.coerce.number().min(0).optional(),
    overheadMarkupPercent: z.coerce.number().min(0).optional()
  })
  .partial();

const SettingsCompleteSchema = z.object({
  laborRateHourly: z.coerce.number().positive().default(15),
  profitMarginPercent: z.coerce.number().min(0).default(30),
  ivaPercent: z.coerce.number().min(0).default(10),
  rentMonthly: z.coerce.number().min(0).default(0),
  electricityPriceKwh: z.coerce.number().min(0).default(0.15),
  gasPriceUnit: z.coerce.number().min(0).default(0.06),
  waterPriceUnit: z.coerce.number().min(0).default(2.0),
  otherMonthlyOverhead: z.coerce.number().min(0).default(50),
  overheadMarkupPercent: z.coerce.number().min(0).default(20)
});

export async function GET(request: Request) {
  try {
    const settings = await db.select().from(businessSettings).limit(1);
    return NextResponse.json(settings[0] || {});
  } catch (error) {
    console.error('API Error fetching settings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const partialValidation = SettingsPartialSchema.safeParse(body);

    if (!partialValidation.success) {
      return NextResponse.json(
        {
          message: 'Invalid input data',
          errors: partialValidation.error.format()
        },
        { status: 400 }
      );
    }

    const dataToUpdateOrInsert: Record<string, string | Date> = {};
    for (const [key, value] of Object.entries(partialValidation.data)) {
      if (value !== undefined) {
        dataToUpdateOrInsert[key] =
          typeof value === 'number' ? value.toString() : value;
      }
    }

    if (
      Object.keys(dataToUpdateOrInsert).length === 0 &&
      request.method !== 'POST'
    ) {
      return NextResponse.json(
        { message: 'No valid fields provided to update' },
        { status: 400 }
      );
    }

    dataToUpdateOrInsert.updatedAt = new Date();

    const existing = await db
      .select({ id: businessSettings.id })
      .from(businessSettings)
      .limit(1);

    let resultSettings;
    if (existing.length > 0) {
      resultSettings = await db
        .update(businessSettings)
        .set(dataToUpdateOrInsert)
        .where(eq(businessSettings.id, existing[0].id))
        .returning();
    } else {
      const completeValidation = SettingsCompleteSchema.safeParse(body);
      if (!completeValidation.success) {
        console.error(
          'Complete schema validation failed for insert:',
          completeValidation.error.format()
        );
        return NextResponse.json(
          {
            message: 'Invalid data for initial settings creation',
            errors: completeValidation.error.format()
          },
          { status: 400 }
        );
      }

      const completeDataForDb: Record<string, string | Date> = {};
      for (const [key, value] of Object.entries(completeValidation.data)) {
        completeDataForDb[key] =
          typeof value === 'number' ? value.toString() : value;
      }
      completeDataForDb.updatedAt = new Date();

      resultSettings = await db
        .insert(businessSettings)
        .values(completeDataForDb)
        .returning();
    }

    return NextResponse.json(resultSettings[0] || null);
  } catch (error) {
    console.error('API Error updating/inserting settings:', error);
    return NextResponse.json(
      { message: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
