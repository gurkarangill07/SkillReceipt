import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer, Navigation } from "../components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkillReceipt — Let your work do the talking", template: "%s | SkillReceipt" },
  description: "Complete a practical sales-data challenge, inspect transparent checks, and share evidence of your submitted work.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><Navigation /><main id="main-content" tabIndex={-1}>{children}</main><Footer /></body></html>;
}
