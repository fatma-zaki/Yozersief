import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "يوزرسيف | طباعة على التيشيرتات والمجات والهدايا في أسوان",
  description:
    "اطبع تصميمك على التيشيرتات والهوديز والمجات والكفرات والاستيكرات. ابدأ طلبك وتابعه خطوة بخطوة.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
