// Email Utilities
// Supports both Resend (production) and Supabase built-in emails (fallback)

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM_EMAIL =
  process.env.FROM_EMAIL || "noreply@wound-ehr.com";

type SendInviteEmailParams = {
  to: string;
  inviteToken: string;
  invitedBy: string;
  role: string;
  facilityName?: string;
};

/**
 * Send invite email to new user
 */
export async function sendInviteEmail({
  to,
  inviteToken,
  invitedBy,
  role,
  facilityName,
}: SendInviteEmailParams) {
  const inviteUrl = `${APP_URL}/signup?invite=${inviteToken}`;
  
  const roleLabel =
    role === "tenant_admin"
      ? "Tenant Administrator"
      : role === "facility_admin"
      ? "Facility Administrator"
      : "User";

  const subject = `You've been invited to Wound EHR`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Wound EHR</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Electronic Health Record System</p>
        </div>
        
        <div style="background: #fff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #0d9488; margin-top: 0;">You've Been Invited! 🎉</h2>
          
          <p style="font-size: 16px; color: #4b5563;">
            <strong>${invitedBy}</strong> has invited you to join Wound EHR as a <strong>${roleLabel}</strong>.
          </p>
          
          ${facilityName ? `<p style="font-size: 16px; color: #4b5563;">Facility: <strong>${facilityName}</strong></p>` : ""}
          
          <p style="font-size: 16px; color: #4b5563;">
            Click the button below to accept your invitation and create your account:
          </p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${inviteUrl}" 
               style="display: inline-block; background: #0d9488; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              Accept Invitation
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 13px; color: #0d9488; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">
            ${inviteUrl}
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 13px; color: #9ca3af; margin-bottom: 5px;">
            This invitation will expire in 7 days.
          </p>
          <p style="font-size: 13px; color: #9ca3af; margin-top: 5px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Wound EHR. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
You've Been Invited to Wound EHR!

${invitedBy} has invited you to join Wound EHR as a ${roleLabel}.
${facilityName ? `Facility: ${facilityName}\n` : ""}
Click the link below to accept your invitation and create your account:

${inviteUrl}

This invitation will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Wound EHR. All rights reserved.
  `.trim();

  try {
    if (resend) {
      // Use Resend for production
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: htmlBody,
        text: textBody,
      });
      console.log(`✅ Invite email sent via Resend to ${to}`);
    } else {
      // Fallback: Log to console (dev mode)
      // In production without Resend, you could use Supabase's email API
      console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 INVITE EMAIL (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${to}
Subject: ${subject}

${textBody}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
      console.log(`⚠️ Email not sent (Resend not configured). Link: ${inviteUrl}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("❌ Error sending invite email:", error);
    return { error: "Failed to send invite email" };
  }
}
