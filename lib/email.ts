import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { Attachment, ServerClient } from "postmark";
import "dotenv/config";

interface EmailOptions {
  from?: string;
  to: string;
  subject: string;
  email: ReactElement | string;
  replyTo?: string;
  attachments?: Attachment[];
}

export async function sendEmail({ to, subject, email, replyTo, from, attachments }: EmailOptions) {
  if (!process.env.POSTMARK_API_KEY) {
    throw new Error("POSTMARK_API_KEY is not set");
  }

  const postmarkClient = new ServerClient(process.env.POSTMARK_API_KEY);
  const emailHtml = typeof email === "string" ? email : await render(email);

  const options = {
    From: from || process.env.EMAIL_FROM || "support@recommand.eu",
    To: to,
    Subject: subject,
    HtmlBody: emailHtml,
    ReplyTo: replyTo,
    Attachments: attachments,
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
