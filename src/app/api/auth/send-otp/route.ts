import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, fullName, otpCode } = body;

    if (!email || !otpCode) {
      return NextResponse.json({ success: false, message: 'Email and OTP code are required.' }, { status: 400 });
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER || 'noreply2082@gmail.com';
    const pass = process.env.SMTP_PASSWORD || 'tuud thtj xgav uwmz';

    let emailSent = false;
    let emailError = '';

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: true,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const recipientName = fullName ? fullName.trim() : 'Valued Customer';

      // Plain Text alternative (Crucial for Gmail Inbox deliverability and avoiding Spam filters)
      const textContent = `Namaste ${recipientName},

Thank you for registering at Daisy Hub Nepal!

Your 6-digit email verification code is: ${otpCode}

This code is valid for 10 minutes. Please do not share this code with anyone for security purposes.

If you did not initiate this request, please disregard this email.

Best regards,
Daisy Hub Nepal Team
https://daisyhub.com`;

      // Clean, responsive HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daisy Hub Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
            <tr>
              <td align="center" style="padding: 30px 15px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                  <!-- Header -->
                  <tr>
                    <td align="center" style="background-color: #18181b; padding: 28px 24px; text-align: center;">
                      <span style="color: #eab308; font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; display: block; margin-bottom: 4px;">DAISY HUB NEPAL</span>
                      <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Account Verification</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px 28px; color: #27272a; font-size: 15px; line-height: 1.6;">
                      <p style="margin-top: 0; margin-bottom: 16px;">Namaste <strong>${recipientName}</strong>,</p>
                      <p style="margin-top: 0; margin-bottom: 24px; color: #52525b; font-size: 14px;">
                        Thank you for joining <strong>Daisy Hub Nepal</strong>. Please enter the verification code below to confirm your email address and complete your account setup:
                      </p>
                      
                      <!-- OTP Box -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
                        <tr>
                          <td align="center" style="background-color: #fefce8; border: 2px dashed #eab308; border-radius: 10px; padding: 20px 10px;">
                            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #18181b; display: block;">${otpCode}</span>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 13px; color: #71717a; margin-top: 24px; margin-bottom: 0;">
                        ⏱️ This code is valid for <strong>10 minutes</strong>. For security reasons, please do not share this code with anyone.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fafafa; padding: 20px 28px; text-align: center; border-top: 1px solid #f4f4f5; font-size: 12px; color: #a1a1aa;">
                      <p style="margin: 0; margin-bottom: 4px;">&copy; ${new Date().getFullYear()} Daisy Hub Women's Fashion Nepal. All rights reserved.</p>
                      <p style="margin: 0; font-size: 11px;">This is an automated transactional message. Please do not reply directly to this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"Daisy Hub Nepal" <${user}>`,
        replyTo: `"Daisy Hub Support" <${user}>`,
        to: email,
        subject: `${otpCode} is your Daisy Hub Account Verification Code`,
        text: textContent,
        html: htmlContent,
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
          'X-Mailer': 'DaisyHub App Mailer',
        },
      });

      emailSent = true;
    } catch (err: any) {
      console.error('SMTP Email Error:', err);
      emailError = err?.message || 'SMTP Transport Error';
    }

    return NextResponse.json({
      success: true,
      emailSent,
      otpCode,
      message: emailSent
        ? `Verification code sent to ${email}`
        : `Verification code generated for ${email}. (SMTP Note: ${emailError})`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}
