import ResetPasswordForm from "./reset-password-form";
import { useParams } from "react-router-dom";

interface ResetPasswordPageProps {
  params: {
    token: string;
  };
}

export default function ResetPasswordPage() {
  const { token } = useParams();
  if (!token) {
    return <div>Invalid token</div>;
  }
  return (
    <main className="flex min-h-svh w-full items-center justify-center">
      <ResetPasswordForm token={token} />
    </main>
  );
}
