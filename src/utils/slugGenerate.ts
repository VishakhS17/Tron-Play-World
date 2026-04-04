export function generateSlug(text: string): string {
  return text
    .toString() // Convert to string if not already
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/&/g, "-") // Replace & with -
    .replace(/[^a-z0-9\s-]/g, "") // Remove all except alphanum, space, and hyphen
    .replace(/\s+/g, "-") // Replace spaces with hyphen
    .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
}

/** Same rules as the admin “new product” form when auto-filling slug from the name. */
export function slugFromProductName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
