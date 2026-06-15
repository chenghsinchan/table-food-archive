import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata: Metadata = {
  title: "Login"
};

type LoginPageProps = {
  searchParams: Promise<{ private?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return <LoginScreen privateArchive={params.private === "1"} />;
}
