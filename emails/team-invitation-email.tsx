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

interface TeamInvitationEmailProps {
  firstName: string;
  teamName: string;
  resetPasswordLink: string;
}

export const TeamInvitationEmail = ({
  firstName = "there",
  teamName = "Team",
  resetPasswordLink = "https://example.com/reset-password/token",
}: TeamInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>You've been invited to join {teamName} on Recommand</Preview>
    <Tailwind>
      <Body className={`font-sans text-[${DARK_SLATE}]`}>
        <Container
          className={`mx-auto my-8 max-w-xl border bg-[${SHEET}] p-6 border-[${SHADOW}] border-solid`}
        >
          <Img
            src={`${process.env.BASE_URL}/icon.png`}
            alt="Recommand Logo"
            className="mx-auto mb-6 w-16"
          />
          <Heading className="mb-6 text-center text-2xl font-bold">
            Team invitation
          </Heading>
          <Text className="mb-4">Hello {firstName},</Text>
          <Text className="mb-4">
            You've been invited to join <strong>{teamName}</strong> on Recommand.
          </Text>
          <Text className="mb-4">
            We've created an account for you. To get started, please set your password by clicking the button below:
          </Text>
          <Section className="my-8 text-center">
            <Button variant="primary" href={resetPasswordLink}>
              Set your password
            </Button>
          </Section>
          <Text className="mb-4">
            This invitation link will expire in 7 days for security reasons.
            If you need a new invitation after that, please ask your team administrator to resend it.
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

TeamInvitationEmail.PreviewProps = {
  firstName: "Alex",
  teamName: "Acme Corp",
  resetPasswordLink: "https://peppol.recommand.eu/reset-password/sample-token",
} as TeamInvitationEmailProps;

export default TeamInvitationEmail;