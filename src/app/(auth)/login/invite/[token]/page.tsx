import { Suspense } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Feedback";
import { ar } from "@/i18n/ar";
import { previewInvitation } from "@/modules/identity";
import { AcceptInviteForm } from "./AcceptInviteForm.client";

export const metadata = { title: ar.auth.inviteTitle, robots: { index: false } };

export default function InvitePage({ params }: PageProps<"/login/invite/[token]">) {
  return (
    <Card className="bg-surface w-full">
      <CardTitle className="text-2xl">{ar.auth.inviteTitle}</CardTitle>
      <Suspense fallback={<Skeleton className="mt-6 h-64" />}>
        <InviteBody params={params} />
      </Suspense>
    </Card>
  );
}

async function InviteBody({ params }: Pick<PageProps<"/login/invite/[token]">, "params">) {
  const { token } = await params;
  const invitation = await previewInvitation(token);
  if (!invitation) {
    return (
      <p
        role="alert"
        className="rounded-input bg-warn-bg text-warn-ink mt-4 px-4 py-3 text-sm font-bold"
      >
        {ar.auth.inviteInvalid}
      </p>
    );
  }
  return (
    <>
      <CardDescription className="mb-6">{ar.auth.inviteSubtitle}</CardDescription>
      <AcceptInviteForm
        token={token}
        contact={invitation.contact}
        contactKind={invitation.contactKind}
      />
    </>
  );
}
