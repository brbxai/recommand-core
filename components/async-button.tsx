import * as React from "react";
import { Button, type ButtonProps } from "./ui/button";
import { Loader2 } from "lucide-react";

interface AsyncButtonProps extends Omit<ButtonProps, "onClick"> {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  loadingText?: string;
}

export function AsyncButton({
  onClick,
  loadingText,
  children,
  disabled,
  size,
  ...props
}: AsyncButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onClick(event);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || isLoading}
      size={size}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {size === "icon" ? null : loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
