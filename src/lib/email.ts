import nodemailer from "nodemailer";

function isEmailConfigured() {
  return Boolean(
    process.env.EMAIL_SERVER_HOST &&
      process.env.EMAIL_SERVER_PORT &&
      process.env.EMAIL_SERVER_USER &&
      process.env.EMAIL_SERVER_PASSWORD &&
      process.env.EMAIL_FROM
  );
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!isEmailConfigured()) return { ok: false, skipped: true };

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return { ok: true };
}

export function orderEmailTemplate(input: {
  heading: string;
  message: string;
  orderId: string;
}) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.5">
    <h2>${input.heading}</h2>
    <p>${input.message}</p>
    <p><b>Order:</b> ${input.orderId}</p>
  </div>
  `;
}

