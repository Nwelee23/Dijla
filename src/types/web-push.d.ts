/**
 * Minimal ambient types for `web-push` — the package ships no types and we only
 * use two functions. Kept narrow on purpose.
 */
declare module "web-push" {
  export interface WebPushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }

  export interface SendResult {
    statusCode: number;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    subscription: WebPushSubscription,
    payload?: string | Buffer,
    options?: Record<string, unknown>
  ): Promise<SendResult>;

  const _default: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };
  export default _default;
}
