import { Section, Text } from "@react-email/components";
import {
  Button,
  EmailLayout,
  EmailHeading,
  InfoSection,
  baseUrl,
} from "./components/shared";

interface PasswordResetEmailProps {
  firstName: string;
  resetPasswordLink: string;
}

export const PasswordResetEmail = ({
  firstName,
  resetPasswordLink,
}: PasswordResetEmailProps) => (
  <EmailLayout preview="Reset your Recommand password">
    <EmailHeading>Reset your password</EmailHeading>
    <Text className="mb-4">Hello {firstName},</Text>
    <Text className="mb-4">
      We received a request to reset your password for your Recommand account.
    </Text>
    <Section className="my-6 text-center">
      <Button variant="primary" href={resetPasswordLink}>
        Reset password
      </Button>
    </Section>
    <InfoSection>
      <Text className="my-1 text-sm">
        This link will expire in <strong>1 hour</strong> for security reasons.
      </Text>
      <Text className="my-1 text-sm">
        If you didn't request this, you can safely ignore this email.
      </Text>
    </InfoSection>
  </EmailLayout>
);

PasswordResetEmail.PreviewProps = {
  firstName: "Max",
  resetPasswordLink: `${baseUrl}/reset-password/sample-token`,
} as PasswordResetEmailProps;

export default PasswordResetEmail;
