import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = process.env.SMTP_USER ?? 'My Backpack <noreply@mybackpack.app>';

export async function sendVerificationEmail(email: string, verificationUrl: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Verify your email — My Backpack',
    html: `<p>Click the link below to verify your email address:</p><p><a href="${verificationUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Reset your password — My Backpack',
    html: `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
  });
}

export async function sendWelcomeEmail(email: string, displayName: string): Promise<void> {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: 'Welcome to My Backpack!',
    html: `<p>Hi ${displayName},</p><p>Your email has been verified. Welcome to My Backpack!</p>`,
  });
}
