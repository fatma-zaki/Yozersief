import Image from "next/image";
import { Logo } from "@/components/layout/Logo";

/** Staff auth screens: a centered glass card on the dark band. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main
      id="main"
      className="bg-band relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16"
    >
      <Image
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        width={620}
        height={620}
        className="pointer-events-none absolute -top-32 -left-64 opacity-40"
      />
      <div className="relative flex w-full max-w-md flex-col items-center gap-6">
        <Logo size={72} />
        {children}
      </div>
    </main>
  );
}
