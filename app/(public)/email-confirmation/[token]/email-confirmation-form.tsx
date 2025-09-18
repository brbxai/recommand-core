import { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { rc } from "@recommand/lib/client";
import type { Auth } from "api/auth";
import { toast } from "../../../../components/ui/sonner";
import { stringifyActionFailure } from "@recommand/lib/utils";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../../../lib/user-store";

const client = rc<Auth>("core");

interface EmailConfirmationFormProps {
  token: string;
}

export default function EmailConfirmationForm({
  token,
}: EmailConfirmationFormProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { fetchUser } = useUserStore();

  useEffect(() => {
    if (token) {
      confirmEmail();
    }
  }, [token]);

  const confirmEmail = async () => {
    if (!token) {
      setError("Invalid confirmation link");
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const res = await client.auth["confirm-email"].$post({
        json: { token },
      });
      const data = await res.json();

      if (data.success) {
        setIsConfirmed(true);
        // Fetch user data after successful confirmation
        await fetchUser();
        toast.success("Email confirmed successfully!");
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setError(stringifyActionFailure(data.errors));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsConfirming(false);
    }
  };

  if (isConfirming) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-center mb-4">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="h-12 w-auto"
          />
        </div>
        <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Confirming Email</CardTitle>
          <CardDescription>
            Please wait while we confirm your email address...
          </CardDescription>
        </CardHeader>
      </Card>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-center mb-4">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="h-12 w-auto"
          />
        </div>
        <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Email Confirmed!</CardTitle>
          <CardDescription>
            Your email has been successfully confirmed. You are now logged in
            and will be redirected to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate("/")} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-center mb-4">
          <img 
            src="/logo.svg" 
            alt="Logo" 
            className="h-12 w-auto"
          />
        </div>
        <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Confirmation Failed</CardTitle>
          <CardDescription className="text-destructive">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your confirmation link may have expired or been used already.
          </p>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => navigate("/signup")}
              variant="outline"
              className="w-full"
            >
              Create New Account
            </Button>
            <Button onClick={() => navigate("/login")} className="w-full">
              Try Logging In
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center mb-4">
        <img 
          src="/logo.svg" 
          alt="Logo" 
          className="h-12 w-auto"
        />
      </div>
      <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Invalid Link</CardTitle>
        <CardDescription>
          The confirmation link appears to be invalid or missing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => navigate("/login")} className="w-full">
          Go to Login
        </Button>
      </CardContent>
    </Card>
    </div>
  );
}
