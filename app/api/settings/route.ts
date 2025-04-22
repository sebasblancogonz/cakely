import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businessSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Schema Zod para validar la actualización
const SettingsUpdateSchema = z
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
    const validation = SettingsUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: validation.error.errors },
        { status: 400 }
      );
    }

    const dataToUpdate: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      if (value !== undefined) {
        dataToUpdate[key] =
          typeof value === 'number' ? value.toString() : value;
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields to update' },
        { status: 400 }
      );
    }

    dataToUpdate.updatedAt = new Date().toISOString();

    const existing = await db
      .select({ id: businessSettings.id })
      .from(businessSettings)
      .limit(1);

    let updatedSettings;
    if (existing.length > 0) {
      updatedSettings = await db
        .update(businessSettings)
        .set(dataToUpdate)
        .where(eq(businessSettings.id, existing[0].id))
        .returning();
    } else {
      updatedSettings = await db
        .insert(businessSettings)
        .values(dataToUpdate)
        .returning();
    }

    return NextResponse.json(updatedSettings[0] || null);
  } catch (error) {
    console.error('API Error updating settings:', error);
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
