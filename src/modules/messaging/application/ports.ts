/**
 * Messaging port (brief A6.6). Implementations live in ../infrastructure.
 * - `prepared`: nothing sent automatically; staff send it themselves via `manualLink`.
 * - `sent`: the provider accepted it and returned an id.
 */
export type SendRequest = {
  /** Local Egyptian mobile, e.g. 01012345678. */
  to: string;
  body: string;
  templateKey: string | null;
  orderId: string;
};

export type SendResult =
  | { status: "prepared"; manualLink: string; providerMessageId: null }
  | { status: "sent"; providerMessageId: string };

export interface MessagingProvider {
  readonly name: string;
  send(request: SendRequest): Promise<SendResult>;
}
