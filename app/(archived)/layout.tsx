import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ArchivedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  redirect("/");
}
