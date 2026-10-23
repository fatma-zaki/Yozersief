import { Suspense } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ar } from "@/i18n/ar";
import { LoginForm } from "./LoginForm.client";

export const metadata = { title: ar.auth.loginTitle, robots: { index: false } };

export default function LoginPage() {
  return (
    <Card className="bg-surface w-full">
      <CardTitle className="text-2xl">{ar.auth.loginTitle}</CardTitle>
      <CardDescription className="mb-6">{ar.auth.loginSubtitle}</CardDescription>
      {/* useSearchParams (?next=) needs a Suspense boundary under Cache Components. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </Card>
  );
}
