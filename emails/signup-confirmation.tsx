import { Section, Text } from "@react-email/components";
import { Button, EmailLayout, EmailHeading, InfoSection, baseUrl } from "./components/shared";

interface EmailConfirmationProps {
  firstName: string;
  confirmationUrl: string;
}

export const SignupEmailConfirmation = ({
  firstName,
  confirmationUrl,
}: EmailConfirmationProps) => (
  <EmailLayout preview="Confirm your email address">
    <EmailHeading>Confirm your email</EmailHeading>
    <Text className="mb-4">Hello {firstName},</Text>
    <Text className="mb-4">
      Thank you for signing up for Recommand. Please confirm your email address
      to get started.
    </Text>
    <Section className="my-6 text-center">
      <Button variant="primary" href={confirmationUrl}>
        Confirm email address
      </Button>
    </Section>
    <InfoSection>
      <Text className="my-1 text-sm">
        If you didn't create an account, you can safely ignore this email.
      </Text>
    </InfoSection>
  </EmailLayout>
);

SignupEmailConfirmation.PreviewProps = {
  firstName: "Max",
  confirmationUrl: `${baseUrl}/email-confirmation/sample-token`,
} as EmailConfirmationProps;

export default SignupEmailConfirmation;

export const subject = () => "Confirm your email address";
