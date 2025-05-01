import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn(
    'WARN: RESEND_API_KEY environment variable is not set. Email sending will fail.'
  );
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendInvitationEmailOptions {
  to: string;
  token: string;
  businessName: string;
  role: string;
  inviterName?: string | null;
}

export async function sendInvitationEmail({
  to,
  token,
  businessName,
  role,
  inviterName
}: SendInvitationEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    const errorMessage =
      'Resend API Key no está configurada. No se puede enviar email.';
    console.error(`[sendInvitationEmail] ${errorMessage}`);
    return { success: false, error: errorMessage };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const acceptUrl = `${appUrl}/accept-invitation?token=${token}`;

  const subject = `Invitación para unirte a ${businessName}`;
  const inviterText = inviterName
    ? `${inviterName} te ha invitado`
    : `Has sido invitado`;

  const htmlBody = `
    <div style="font-family: sans-serif; line-height: 1.6;">
      <h2>¡Has sido invitado!</h2>
      <p>${inviterText} a unirte al negocio <strong>${businessName}</strong> en nuestro panel de control con el rol de <strong>${role}</strong>.</p>
      <p>Para aceptar la invitación, haz clic en el siguiente botón:</p>
      <p style="margin: 20px 0;">
        <a href="${acceptUrl}" style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Aceptar Invitación
        </a>
      </p>
      <p>Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
      <p>Este enlace expirará en 7 días.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 0.8em; color: #777;">Si tienes problemas con el botón, copia y pega esta URL en tu navegador: ${acceptUrl}</p>
    </div>
  `;

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS || 'noreply@tu-dominio-por-defecto.com';
  if (!fromAddress.includes('@')) {
    console.error(
      '[sendInvitationEmail] Invalid EMAIL_FROM_ADDRESS:',
      fromAddress
    );
    return { success: false, error: 'Dirección de remitente inválida.' };
  }

  try {
    console.log(
      `Intentando enviar email de invitación a: ${to} desde ${fromAddress}`
    );
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject: subject,
      html: htmlBody,
      tags: [
        { name: 'category', value: 'invitation' },
        { name: 'businessName', value: businessName }
      ]
    });

    if (error) {
      console.error(
        `[Resend Error] Failed to send invitation email to ${to}:`,
        error
      );
      return { success: false, error: error.message };
    }

    console.log(
      `[Resend Success] Invitation email sent successfully to ${to}. Email ID: ${data?.id}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[sendInvitationEmail] Unexpected error sending email to ${to}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error inesperado'
    };
  }
}
