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

  // Ya no necesitas crear el cliente oauth2 ni setCredentials aquí

  // Crea la instancia de Calendar API usando el cliente proporcionado
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  // Crea el cuerpo del evento (sin cambios respecto a tu código original)
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
