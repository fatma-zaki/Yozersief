import { env } from "@/env";
import { toInternational } from "@/lib/phone";
import { whatsappLink } from "../domain/template";
import type { MessagingProvider, SendRequest, SendResult } from "../application/ports";

/**
 * MVP provider: prepares a wa.me link that a staff member taps to send from the shop's WhatsApp.
 * Nothing leaves the server; the message stays `prepared` until staff mark it sent.
 */
export class ManualLinkProvider implements MessagingProvider {
  readonly name = "manual";

  async send(request: SendRequest): Promise<SendResult> {
    return {
      status: "prepared",
      manualLink: whatsappLink(toInternational(request.to), request.body),
      providerMessageId: null,
    };
  }
}

/**
 * WhatsApp Business Cloud API, for when the business account is connected (B13 #6).
 * Free-form text only works inside the 24h customer-service window; outside it Meta requires
 * approved templates, which is why this stays a stub until the account and templates exist.
 */
export class WhatsAppCloudProvider implements MessagingProvider {
  readonly name = "whatsapp_cloud";

  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
  ) {}

  async send(request: SendRequest): Promise<SendResult> {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toInternational(request.to),
          type: "text",
          text: { body: request.body },
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`WhatsApp Cloud API ${response.status}`);
    }
    const data = (await response.json()) as { messages?: { id: string }[] };
    const id = data.messages?.[0]?.id;
    if (!id) throw new Error("WhatsApp Cloud API returned no message id");
    return { status: "sent", providerMessageId: id };
  }
}

export function createMessagingProvider(): MessagingProvider {
  if (env.MESSAGING_PROVIDER === "whatsapp_cloud") {
    if (!env.WHATSAPP_CLOUD_TOKEN || !env.WHATSAPP_CLOUD_PHONE_NUMBER_ID) {
      throw new Error("WHATSAPP_CLOUD_TOKEN and WHATSAPP_CLOUD_PHONE_NUMBER_ID are required.");
    }
    return new WhatsAppCloudProvider(env.WHATSAPP_CLOUD_TOKEN, env.WHATSAPP_CLOUD_PHONE_NUMBER_ID);
  }
  return new ManualLinkProvider();
}
