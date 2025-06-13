import { SLATE, SHEET, FILES, DARK_SLATE } from "../../lib/config/colors";
import { Button as ReactEmailButton } from "@react-email/components";
import { cva } from "class-variance-authority";

export const Button = ({
  children,
  variant = "primary",
  href,
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) => {
  const buttonVariants = cva(
    "cursor-pointer whitespace-nowrap rounded-none px-4 py-2 text-base font-medium text-white",
    {
      variants: {
        variant: {
          primary: `bg-[${SLATE}] text-[${SHEET}]`,
          secondary: `bg-[${FILES}] text-[${DARK_SLATE}]`,
        },
      },
    }
  );

  return (
    <ReactEmailButton href={href} className={buttonVariants({ variant })}>
      {children}
    </ReactEmailButton>
  );
};
