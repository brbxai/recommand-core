import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { ServerClient } from "postmark";
import "dotenv/config";

interface EmailOptions {
  to: string;
  subject: string;
  email: ReactElement;
  replyTo?: string;
}

export async function sendEmail({ to, subject, email, replyTo }: EmailOptions) {
  if (!process.env.POSTMARK_API_KEY) {
    throw new Error("POSTMARK_API_KEY is not set");
  }

  const postmarkClient = new ServerClient(process.env.POSTMARK_API_KEY);
  const emailHtml = await render(email);

  const options = {
    From: process.env.EMAIL_FROM || "support@recommand.eu",
    To: to,
    Subject: subject,
    HtmlBody: emailHtml,
    ReplyTo: replyTo,
  };

  try {
    const res = await postmarkClient.sendEmail(options);
    if (res.ErrorCode) {
      console.error("Error sending email:", res);
      throw new Error("Failed to send email");
    }
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
