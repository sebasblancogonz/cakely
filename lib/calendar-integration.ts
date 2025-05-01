import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface CreateCalendarEventOptions {
  authClient: OAuth2Client;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  attendees?: string[];
  calendarId?: string;
}

interface CreateCalendarEventResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}
export async function callCreateCalendarEvent(
  options: CreateCalendarEventOptions
): Promise<CreateCalendarEventResult> {
  const {
    authClient,
    title,
    description,
    startDateTime,
    endDateTime,
    attendees = [],
    calendarId = 'primary'
  } = options;

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const event: calendar_v3.Schema$Event = {
    summary: title,
    description: description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Europe/Madrid'
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Europe/Madrid'
    },
    attendees: attendees.map((email) => ({ email })),
    reminders: {
      useDefault: true
    }
  };

  try {
    console.log(
      `Intentando insertar evento en Google Calendar (ID: ${calendarId})...`
    );
    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendNotifications: true
    });

    console.log('Evento creado con éxito:', response.data.id);
    return {
      success: true,
      eventId: response.data.id ?? undefined,
      htmlLink: response.data.htmlLink ?? undefined
    };
  } catch (error: any) {
    console.error(
      'Error al llamar a Google Calendar API (events.insert):',
      error
    );
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Error desconocido de la API de Google.';
    return {
      success: false,
      error: `Google Calendar API Error: ${errorMessage}`
    };
  }
}

export function calculateEndTime(
  startDate: Date,
  durationString: string = '15m'
): Date {
  const endDate = new Date(startDate);
  let hours = 0;
  let minutes = 0;
  const hourMatch = durationString.match(/(\d+)h/);
  const minMatch = durationString.match(/(\d+)m/);
  if (hourMatch) hours = parseInt(hourMatch[1], 10);
  if (minMatch) minutes = parseInt(minMatch[1], 10);
  endDate.setHours(endDate.getHours() + hours);
  endDate.setMinutes(endDate.getMinutes() + minutes);
  return endDate;
}

interface ModifyCalendarEventOptions
  extends Omit<CreateCalendarEventOptions, 'accessToken' | 'refreshToken'> {
  eventId: string;
}

export async function callModifyCalendarEvent(
  options: ModifyCalendarEventOptions
): Promise<CreateCalendarEventResult> {
  const {
    authClient,
    eventId,
    title,
    description,
    startDateTime,
    endDateTime,
    attendees = [],
    calendarId = 'primary'
  } = options;

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const eventPatch: calendar_v3.Schema$Event = {
    summary: title,
    description: description,
    start: { dateTime: startDateTime.toISOString() },
    end: { dateTime: endDateTime.toISOString() },
    attendees: attendees.map((email) => ({ email }))
  };

  try {
    console.log(
      `Intentando modificar evento GCal ID: ${eventId} en Calendario ID: ${calendarId}...`
    );
    const response = await calendar.events.patch({
      calendarId: calendarId,
      eventId: eventId,
      requestBody: eventPatch,
      sendNotifications: true
    });

    console.log('Evento modificado con éxito:', response.data.id);
    return {
      success: true,
      eventId: response.data.id ?? undefined,
      htmlLink: response.data.htmlLink ?? undefined
    };
  } catch (error: any) {
    console.error(
      `Error al llamar a Google Calendar API (events.patch) para evento ${eventId}:`,
      error
    );
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Error desconocido';
    return {
      success: false,
      error: `Google Calendar API Error: ${errorMessage}`
    };
  }
}

interface DeleteCalendarEventOptions {
  authClient: OAuth2Client;
  eventId: string;
  calendarId?: string;
}
interface DeleteCalendarEventResult {
  success: boolean;
  error?: string;
}

export async function callDeleteCalendarEvent(
  options: DeleteCalendarEventOptions
): Promise<DeleteCalendarEventResult> {
  const { authClient, eventId, calendarId = 'primary' } = options;
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  try {
    console.log(
      `Intentando eliminar evento GCal ID: ${eventId} de Calendario ID: ${calendarId}...`
    );
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
      sendNotifications: true
    });
    console.log('Evento eliminado con éxito:', eventId);
    return { success: true };
  } catch (error: any) {
    console.error(
      `Error al llamar a Google Calendar API (events.delete) para evento ${eventId}:`,
      error
    );
    if (error?.code === 410 || error?.response?.status === 410) {
      console.log(
        `Evento GCal ${eventId} ya no existía, considerado como éxito.`
      );
      return { success: true };
    }
    const errorMessage =
      error?.response?.data?.error?.message ||
      error?.message ||
      'Error desconocido';
    return {
      success: false,
      error: `Google Calendar API Error: ${errorMessage}`
    };
  }
}
