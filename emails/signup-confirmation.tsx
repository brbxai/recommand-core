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
} from "@react-email/components";
import { Button } from "./components/button";
import { Head } from "./components/head";
import { SHADOW, DARK_SLATE, SHEET } from "../lib/config/colors";

interface EmailConfirmationProps {
  firstName: string;
  confirmationUrl: string;
}

export const SignupEmailConfirmation = ({
  firstName,
  confirmationUrl,
}: EmailConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Confirm your email address</Preview>
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
            Email confirmation
          </Heading>
          <Text className="mb-4">Hello {firstName},</Text>
          <Text className="mb-4">
            Thank you for signing up. Please confirm your email address by
            clicking the button below:
          </Text>
          <Section className="my-8 text-center">
            <Button variant="primary" href={confirmationUrl}>
              Confirm email
            </Button>
          </Section>
          <Text className="mb-4">
            If you didn't create an account, you can safely ignore this email.
          </Text>
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

SignupEmailConfirmation.PreviewProps = {
  firstName: "Max",
  confirmationUrl:
    "https://peppol.recommand.eu/email-confirmation/sample-token",
} as EmailConfirmationProps;

export default SignupEmailConfirmation;
