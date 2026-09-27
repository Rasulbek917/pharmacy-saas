import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  switch (user.role) {
    case "SUPER_ADMIN":
      redirect("/super-admin");
    case "PHARMACY_ADMIN":
      redirect("/admin");
    case "WAREHOUSEMAN":
      redirect("/omborchi");
    case "CASHIER":
      redirect("/kassir");
    default:
      redirect("/login");
  }
}
