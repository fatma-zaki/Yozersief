import { Suspense } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ar } from "@/i18n/ar";
import { TwoFactorForm } from "./TwoFactorForm.client";

export const metadata = { title: ar.auth.twoFactorTitle, robots: { index: false } };

export default function TwoFactorPage() {
  return (
    <Card className="bg-surface w-full">
      <CardTitle className="text-2xl">{ar.auth.twoFactorTitle}</CardTitle>
      <CardDescription className="mb-6">{ar.auth.twoFactorSubtitle}</CardDescription>
      <Suspense>
        <TwoFactorForm />
      </Suspense>
    </Card>
  );
}
