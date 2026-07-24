import { Wordmark } from "@/components/brand/wordmark";

/** The Dijla lockup, used in the onboarding and trial-expired shells. */
export function Brand({ href = "/" }: { href?: string }) {
  return <Wordmark href={href} showLatin={false} />;
}
