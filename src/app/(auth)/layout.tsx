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
        width={220}
        height={220}
        className="pointer-events-none absolute bottom-0 left-0 opacity-30"
      />
      <Image
        src="/brand/ornament-mint.svg"
        alt=""
        aria-hidden="true"
        width={200}
        height={200}
        className="pointer-events-none absolute top-0 right-0 rotate-180 opacity-25"
      />
      <div className="relative flex w-full max-w-md flex-col items-center gap-6">
        <Logo size={72} />
        {children}
      </div>
    </main>
  );
}
