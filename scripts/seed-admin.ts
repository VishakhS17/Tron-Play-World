/**
 * Grants SUPER_ADMIN to an existing admin user, or creates a new admin_users row.
 *
 * Usage:
 *   npm run seed:admin -- --email=you@example.com --password=secret123
 *   npm run seed:admin -- --email=you@example.com --password=secret123 --name="John Doe"
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function arg(name: string): string | null {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.split("=").slice(1).join("=") : null;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password") ?? "";
  const name = arg("name")?.trim() ?? null;

  if (!email) {
    console.error("\nUsage: npm run seed:admin -- --email=you@example.com --password=yourpassword\n");
    process.exit(1);
  }

  console.log(`\n─── Admin seed ───\n`);

  const role = await prisma.roles.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {},
    create: { name: "SUPER_ADMIN" },
    select: { id: true },
  });

  const existing = await prisma.admin_users.findUnique({
    where: { email },
    select: {
      id: true,
      admin_user_roles: { select: { role_id: true, roles: { select: { name: true } } } },
    },
  });

  if (existing) {
    const alreadySuperAdmin = existing.admin_user_roles.some((ur) => ur.roles.name === "SUPER_ADMIN");

    if (alreadySuperAdmin) {
      console.log(`✓ "${email}" is already SUPER_ADMIN. Nothing changed.\n`);
      return;
    }

    await prisma.admin_user_roles.create({ data: { admin_user_id: existing.id, role_id: role.id } });

    if (password.length >= 8) {
      const password_hash = await bcrypt.hash(password, 12);
      await prisma.admin_users.update({ where: { id: existing.id }, data: { password_hash } });
      console.log(`✓ Existing admin "${email}" upgraded to SUPER_ADMIN (password updated).\n`);
    } else {
      console.log(`✓ Existing admin "${email}" upgraded to SUPER_ADMIN (password unchanged).\n`);
    }
    console.log(`  Login at: http://localhost:3000/admin/login\n`);
    return;
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters for a new account.");
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin_users.create({
    data: {
      email,
      password_hash,
      name,
      is_active: true,
      admin_user_roles: { create: { role_id: role.id } },
    },
    select: { id: true },
  });

  console.log(`✓ SUPER_ADMIN created!`);
  console.log(`  Email : ${email}`);
  console.log(`  ID    : ${admin.id}`);
  console.log(`\n  Login at: http://localhost:3000/admin/login\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
