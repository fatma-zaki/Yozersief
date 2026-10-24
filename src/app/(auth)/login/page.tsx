import { Suspense } from "react";
import { ar } from "@/i18n/ar";
import { LoginForm } from "./LoginForm.client";
import s from "./login.module.css";

export const metadata = { title: ar.auth.loginTitle, robots: { index: false } };

export default function LoginPage() {
  return (
    <div className={s.card}>
      <h1 className={s.title}>{ar.auth.loginTitle}</h1>
      <p className={s.subtitle}>{ar.auth.loginSubtitle}</p>
      {/* useSearchParams (?next=) needs a Suspense boundary under Cache Components. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
