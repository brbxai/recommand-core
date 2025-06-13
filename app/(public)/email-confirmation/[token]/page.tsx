import EmailConfirmationForm from "./email-confirmation-form";
import { useParams } from "react-router-dom";

export default function EmailConfirmationPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <EmailConfirmationForm token={token || ""} />
      </div>
    </div>
  );
}
