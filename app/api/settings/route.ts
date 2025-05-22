import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { businessSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { AuthenticatedRequestContext } from '@/lib/api/authTypes';
import { withApiProtection } from '@/lib/api/withApiProtection';

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
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Se requiere al menos un campo para actualizar'
  });

const defaultSettingsValues = {
  laborRateHourly: '15.00',
  profitMarginPercent: '30.00',
  ivaPercent: '10.00',
  rentMonthly: '0.00',
  electricityPriceKwh: '0.1500',
  gasPriceUnit: '0.0600',
  waterPriceUnit: '2.0000',
  otherMonthlyOverhead: '50.00',
  overheadMarkupPercent: '20.00'
};

async function getSettingsHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    const settingsResult = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.businessId, businessId))
      .limit(1);

    const settingsFromDb = settingsResult[0];
    const settingsToReturn = settingsFromDb
      ? { ...settingsFromDb, updatedAt: settingsFromDb.updatedAt }
      : { ...defaultSettingsValues, businessId: businessId, updatedAt: null };

    return NextResponse.json(settingsToReturn);
  } catch (error) {
    console.error(
      `API Error fetching settings for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export const GET = withApiProtection(getSettingsHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});

async function updateSettingsHandler(
  request: NextRequest,
  authContext: AuthenticatedRequestContext
) {
  const { businessId } = authContext;

  if (!businessId) {
    return NextResponse.json(
      { message: 'Not authorized or no business associated' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = SettingsUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: validation.error.format() },
        { status: 400 }
      );
    }

    const dataToSet: Record<string, string | Date> = {};
    for (const [key, value] of Object.entries(validation.data)) {
      dataToSet[key] = (value as number).toString();
    }
    dataToSet.updatedAt = new Date();

    const dataForInsert = {
      businessId: businessId,
      laborRateHourly:
        validation.data.laborRateHourly?.toString() ??
        defaultSettingsValues.laborRateHourly,
      profitMarginPercent:
        validation.data.profitMarginPercent?.toString() ??
        defaultSettingsValues.profitMarginPercent,
      ivaPercent:
        validation.data.ivaPercent?.toString() ??
        defaultSettingsValues.ivaPercent,
      rentMonthly:
        validation.data.rentMonthly?.toString() ??
        defaultSettingsValues.rentMonthly,
      electricityPriceKwh:
        validation.data.electricityPriceKwh?.toString() ??
        defaultSettingsValues.electricityPriceKwh,
      gasPriceUnit:
        validation.data.gasPriceUnit?.toString() ??
        defaultSettingsValues.gasPriceUnit,
      waterPriceUnit:
        validation.data.waterPriceUnit?.toString() ??
        defaultSettingsValues.waterPriceUnit,
      otherMonthlyOverhead:
        validation.data.otherMonthlyOverhead?.toString() ??
        defaultSettingsValues.otherMonthlyOverhead,
      overheadMarkupPercent:
        validation.data.overheadMarkupPercent?.toString() ??
        defaultSettingsValues.overheadMarkupPercent,
      updatedAt: dataToSet.updatedAt
    };

    const resultSettings = await db
      .insert(businessSettings)
      .values(dataForInsert)
      .onConflictDoUpdate({
        target: businessSettings.businessId,
        set: dataToSet
      })
      .returning();

    return NextResponse.json(resultSettings[0] || null);
  } catch (error) {
    console.error(
      `API Error updating/inserting settings for business ${businessId}:`,
      error
    );
    return NextResponse.json(
      { message: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

export const PUT = withApiProtection(updateSettingsHandler, {
  requiredRole: ['OWNER', 'ADMIN', 'EDITOR']
});
