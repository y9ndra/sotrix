import { Resend } from "resend";
import { config } from "../config/env";
import { logger } from "../config/logger";

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export const sendVerificationOtpEmail = async (
  toEmail: string,
  otp: string,
  nameOrUsername?: string
): Promise<{ success: boolean; id?: string }> => {
  const recipientName = nameOrUsername || "there";

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your Sotrix Account</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Michroma&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Michroma&family=Space+Grotesk:wght@500;700&display=swap');
        .brand-title {
          font-family: 'Michroma', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
      </style>
    </head>
    <body style="margin: 0; padding: 32px 12px; background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 420px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #27272a; border-radius: 16px; padding: 32px 28px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4); box-sizing: border-box;">
        <!-- Brand Header: Sotrix Logo & Name -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 26px; border-collapse: collapse;">
          <tr>
            <td valign="middle" style="vertical-align: middle; padding-right: 12px; line-height: 0;">
              <a href="https://sotrix.yugendhra.me" target="_blank" style="text-decoration: none; display: block; border: 0;">
                <img
                  src="https://sotrix.yugendhra.me/sotrix-logo.png"
                  alt="Sotrix Logo"
                  width="32"
                  height="32"
                  style="display: block; width: 32px; height: 32px; border: 0; outline: none; text-decoration: none; border-radius: 6px;"
                />
              </a>
            </td>
            <td valign="middle" style="vertical-align: middle;">
              <a href="https://sotrix.yugendhra.me" target="_blank" style="text-decoration: none; color: #ffffff; display: inline-block;">
                <span class="brand-title" style="font-family: 'Michroma', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; letter-spacing: 0.32em; text-transform: uppercase; color: #f4f4f5; line-height: 1; display: inline-block;">
                  SOTRIX
                </span>
              </a>
            </td>
          </tr>
        </table>

        <!-- Heading -->
        <h1 style="font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #ffffff; margin: 0 0 10px 0; line-height: 1.3;">
          Verify your email address
        </h1>

        <!-- Subtitle -->
        <p style="font-size: 13.5px; line-height: 1.6; color: #a1a1aa; margin: 0 0 20px 0;">
          Hey ${recipientName}, enter the 6-digit verification code below to confirm your Sotrix account:
        </p>

        <!-- OTP Card -->
        <div style="background-color: #121214; border: 1px solid #27272a; border-radius: 12px; padding: 20px 16px; text-align: center; margin: 24px 0;">
          <div style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #10b981; font-family: 'Space Grotesk', 'Courier New', Courier, monospace; margin: 0 0 4px 0;">
            ${otp}
          </div>
          <div style="font-size: 11.5px; color: #71717a; font-weight: 500;">
            Expires in 15 minutes
          </div>
        </div>

        <!-- Disclaimer -->
        <p style="font-size: 12.5px; line-height: 1.5; color: #71717a; margin: 0 0 24px 0;">
          If you didn't request this verification code, you can safely ignore this email.
        </p>

        <!-- Footer -->
        <div style="border-top: 1px solid #1e1e1e; padding-top: 18px; font-size: 11px; color: #52525b; text-align: center;">
          &copy; ${new Date().getFullYear()} <span class="brand-title" style="font-family: 'Michroma', sans-serif; font-size: 10px; letter-spacing: 0.15em;">SOTRIX</span> &bull; Decentralized Social Architecture
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log to console in dev or when API key is missing
  if (!resend || !config.RESEND_API_KEY) {
    logger.warn(
      { toEmail, otp },
      "RESEND_API_KEY is not configured. Emitting OTP to server logger for development."
    );
    console.log(
      `\n======================================================\n📩 [SOTRIX OTP] To: ${toEmail}\n🔑 CODE: ${otp}\n======================================================\n`
    );
    return { success: true, id: "dev-mock-id" };
  }

  try {
    const response = await resend.emails.send({
      from: config.EMAIL_FROM || "Sotrix <verify@sotrix.yugendhra.me>",
      to: [toEmail],
      subject: `Your Sotrix Verification Code: ${otp}`,
      html: emailHtml,
    });

    if (response.error) {
      logger.error({ error: response.error, toEmail }, "Failed to send email via Resend");
      // Fallback log to console so user is not stuck if DNS propagation is still in progress
      console.log(
        `\n======================================================\n⚠️ [RESEND NOTICE] Sending failed: ${response.error.message}\n🔑 FALLBACK CODE for ${toEmail}: ${otp}\n======================================================\n`
      );
      return { success: false };
    }

    logger.info({ emailId: response.data?.id, toEmail }, "Verification email sent successfully");
    return { success: true, id: response.data?.id };
  } catch (error) {
    logger.error({ error, toEmail }, "Unexpected error sending email via Resend");
    console.log(
      `\n======================================================\n🔑 FALLBACK OTP CODE for ${toEmail}: ${otp}\n======================================================\n`
    );
    return { success: false };
  }
};
