import { notFound } from "next/navigation";

/**
 * Design QA sandbox — development only.
 *
 * Its content is hardcoded Arabic by design (it exists to exercise RTL and the
 * shadcn primitives), which would contradict the translated product if a
 * customer ever landed on it.
 */
export default function UiDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  return children;
}
