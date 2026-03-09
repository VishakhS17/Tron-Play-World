import { redirect } from "next/navigation";

export const metadata = {
  title: "Shop | i-Robox",
  description: "Browse toys and games at i-Robox.",
};

export default async function ShopWithSidebarPage() {
  redirect("/shop");
}
