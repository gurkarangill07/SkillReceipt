import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer, Navigation } from "../components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SkillReceipt — Let your work do the talking", template: "%s | SkillReceipt" },
  description: "Add your resume, choose a role, complete a practical work sample, and get a transparent skill score with a plan to improve.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" data-scroll-behavior="smooth"><body><a className="skip-link" href="#main-content">Skip to content</a><Navigation /><main id="main-content" tabIndex={-1}>{children}</main><Footer /></body></html>;
}
