import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { PasswordInput } from "../../../components/form/password-input";
import { type FormEvent, useState } from "react";
import { toast } from "../../../components/ui/sonner";
import { cn } from "../../../lib/utils";
import { useUserStore } from "../../../lib/user-store";
import { rc } from "@recommand/lib/client";
import type { Auth } from "api/auth";
import { stringifyActionFailure } from "@recommand/lib/utils";

const client = rc<Auth>("core");

export default function SignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignupComplete, setIsSignupComplete] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { signup } = useUserStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await signup(email, password);
      if (response?.success) {
        setIsSignupComplete(true);
        toast.success("Account created successfully!", {
          description:
            response.message ||
            "Please check your email to confirm your account.",
        });
      }
    } catch (error) {
      toast.error("Signup failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const res = await client.auth["resend-confirmation"].$post({
        json: { email },
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Confirmation email sent!", {
          description: data.message,
        });
      } else {
        toast.error("Failed to resend confirmation", {
          description: stringifyActionFailure(data.errors),
        });
      }
    } catch (error) {
      toast.error("Failed to resend confirmation", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isSignupComplete) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please check your email and click the confirmation link to
              activate your account.
            </p>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleResendConfirmation}
                disabled={isResending}
                variant="outline"
                className="w-full"
              >
                {isResending ? "Sending..." : "Resend confirmation email"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <a href="/login" className="underline underline-offset-4">
                Login
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  tabIndex={1}
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  name="password"
                  required
                  tabIndex={2}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                />
              </div>
              <Button type="submit" className="w-full" tabIndex={3}>
                Sign up
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <a
                href="/login"
                className="underline underline-offset-4"
                tabIndex={4}
              >
                Login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
