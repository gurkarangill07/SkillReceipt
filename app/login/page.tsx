import type { Metadata } from "next";
import { LoginForm } from "../../components/login-form";
export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const role = (await searchParams).role === "employer" ? "employer" : "candidate";
  return <div className="shell auth-shell"><LoginForm key={role} initialRole={role} /></div>;
}
