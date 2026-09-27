import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/AppShell";

export default async function OmborchiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (
    !user ||
    (user.role !== "WAREHOUSEMAN" &&
      user.role !== "PHARMACY_ADMIN" &&
      user.role !== "SUPER_ADMIN")
  ) {
    redirect("/login");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
