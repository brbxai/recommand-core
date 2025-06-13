import { Font, Head as ReactEmailHead } from "@react-email/components";

export const Head = () => (
  <ReactEmailHead>
    <Font
      fontFamily="Rethink Sans"
      fontWeight={400}
      fontStyle="normal"
      fallbackFontFamily="sans-serif"
    />
  </ReactEmailHead>
);
