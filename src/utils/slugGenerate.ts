/** Same rules as the admin “new product” form when auto-filling slug from the name. */
export function slugFromProductName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
