import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-24">
      <EmptyState
        className="w-full"
        icon={<SearchX />}
        title={ar.notFound.title}
        description={ar.notFound.body}
        action={
          <Button asChild>
            <Link href="/">{ar.notFound.backHome}</Link>
          </Button>
        }
      />
    </main>
  );
}
