import {
  Body,
  Container,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Img,
  Link,
} from "@react-email/components";
import { Button } from "./components/button";
import { Head } from "./components/head";
import { PROGRESS, DARK_SLATE, SHADOW, SHEET } from "../lib/config/colors";

interface PasswordResetEmailProps {
  firstName: string;
  resetPasswordLink: string;
}

export const PasswordResetEmail = ({
  firstName,
  resetPasswordLink,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Recommand password</Preview>
    <Tailwind>
      <Body className={`font-sans text-[${DARK_SLATE}]`}>
        <Container
          className={`mx-auto my-8 max-w-xl border bg-[${SHEET}] p-6 border-[${SHADOW}] border-solid`}
        >
          <Img
            src={`${process.env.BASE_URL}/icon.svg`}
            alt="Recommand Logo"
            className="mx-auto mb-6 w-16"
          />
          <Heading className="mb-6 text-center text-2xl font-bold">
            Password reset
          </Heading>
          <Text className="mb-4">Hello {firstName},</Text>
          <Text className="mb-4">
            We received a request to reset your password for your Recommand
            account. If you didn't make this request, you can safely ignore this
            email.
          </Text>
          <Section className="my-8 text-center">
            <Button variant="primary" href={resetPasswordLink}>
              Reset password
            </Button>
          </Section>
          <Text className="mb-4">
            This password reset link will expire in 1 hour for security reasons.
            If you need to reset your password after that, please request a new
            reset link.
          </Text>
          <Text className="mb-4">
            If you're having trouble clicking the button, copy and paste the URL
            below into your web browser:
          </Text>
          <Link
            href={resetPasswordLink}
            className={`mb-4 break-all text-[${PROGRESS}]`}
          >
            {resetPasswordLink}
          </Link>
          <Text>
            Best regards,
            <br />
            The Recommand Team
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

PasswordResetEmail.PreviewProps = {
  firstName: "Max",
  resetPasswordLink: "https://peppol.recommand.eu/reset-password/sample-token",
} as PasswordResetEmailProps;

export default PasswordResetEmail;
