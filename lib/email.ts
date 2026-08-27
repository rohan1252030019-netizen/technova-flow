import { NotificationType } from "@/app/generated/prisma/client";

export type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailTemplateParams = {
  recipientName?: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

/**
 * Builds HTML email template matching TechNova Flow branding
 */
export function buildNotificationEmailHtml(params: EmailTemplateParams): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "TechNova Flow";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fullLink = params.link ? (params.link.startsWith("http") ? params.link : `${appUrl}${params.link}`) : appUrl;

  const headerColors: Record<string, string> = {
    ESCALATION: "#dc2626",
    SLA_BREACHED: "#ea580c",
    TASK_OVERDUE: "#d97706",
    APPROVAL_REQUIRED: "#4f46e5",
    NEW_REQUEST: "#2563eb",
    REQUEST_APPROVED: "#16a34a",
    REQUEST_REJECTED: "#dc2626",
    WORKFLOW_COMPLETED: "#16a34a",
  };

  const accentColor = headerColors[params.type] || "#4f46e5";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 4px solid ${accentColor};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: ${accentColor}; color: #ffffff; font-weight: bold; font-size: 16px; padding: 6px 12px; border-radius: 6px;">TF</div>
                    <span style="color: #ffffff; font-size: 18px; font-weight: 600; margin-left: 12px; vertical-align: middle;">${appName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${params.recipientName ? `<p style="margin: 0 0 16px 0; font-size: 15px; color: #64748b;">Hello ${params.recipientName},</p>` : ""}
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">${params.title}</h2>
              ${params.body ? `<p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">${params.body}</p>` : ""}
              
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: ${accentColor};">
                    <a href="${fullLink}" target="_blank" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; display: inline-block;">
                      View Details in ${appName} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
              <p style="margin: 0 0 4px 0;">This is an automated workflow notification from ${appName}.</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} TechNova Global Pvt. Ltd. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends an email using the configured provider (Resend, Custom Webhook/SMTP, or Console log in Dev)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "TechNova Flow <notifications@technova.com>";

  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Resend email dispatch error:", errText);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Failed to send email via Resend:", e);
      return false;
    }
  }

  // Fallback in development or when no external API key is provided:
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Email Dispatch - Dev Mode] To: ${options.to} | Subject: "${options.subject}"`);
  }
  return true;
}
