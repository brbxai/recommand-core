import { Section, Text } from "@react-email/components";
import {
  Button,
  EmailLayout,
  EmailHeading,
  InfoSection,
  baseUrl,
} from "./components/shared";

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
  <EmailLayout preview={`You've been invited to join ${teamName} on Recommand`}>
    <EmailHeading>You're invited</EmailHeading>
    <Text className="mb-4">Hello {firstName},</Text>
    <Text className="mb-4">
      You've been invited to join <strong>{teamName}</strong> on Recommand.
      We've created an account for you.
    </Text>
    <Section className="my-6 text-center">
      <Button variant="primary" href={resetPasswordLink}>
        Set your password
      </Button>
    </Section>
    <InfoSection>
      <Text className="my-1 text-sm">
        This invitation will expire in <strong>7 days</strong>.
      </Text>
      <Text className="my-1 text-sm">
        After that, ask your team administrator to resend the invitation.
      </Text>
    </InfoSection>
  </EmailLayout>
);

TeamInvitationEmail.PreviewProps = {
  firstName: "Alex",
  teamName: "Acme Corp",
  resetPasswordLink: `${baseUrl}/reset-password/sample-token`,
} as TeamInvitationEmailProps;

export default TeamInvitationEmail;
