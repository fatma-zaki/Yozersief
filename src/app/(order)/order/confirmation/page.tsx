import { redirect } from "next/navigation";

/** The confirmation is shown inside the builder right after sending (design: Flow-P6/B6). */
export default function ConfirmationPage() {
  redirect("/order");
}
