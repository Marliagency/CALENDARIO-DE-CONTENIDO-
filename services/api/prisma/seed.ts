import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Pulse database...");

  const user = await prisma.user.upsert({
    where: { email: "diego@qyro.app" },
    update: {},
    create: { email: "diego@qyro.app", name: "Diego" },
  });

  const qyro = await prisma.workspace.upsert({
    where: { slug: "qyro" },
    update: {},
    create: {
      slug: "qyro",
      name: "QYRO",
      type: "brand",
      description:
        "Sistema operativo personal — app móvil que centraliza vida, salud, hábitos y finanzas.",
      brandColorPrimary: "#3B82F6",
      brandColorSecondary: "#7C5CFC",
      defaultTimezone: "Europe/Madrid",
      createdById: user.id,
      members: { create: { userId: user.id, role: "owner", acceptedAt: new Date() } },
    },
  });

  const personal = await prisma.workspace.upsert({
    where: { slug: "personal" },
    update: {},
    create: {
      slug: "personal",
      name: "Diego Personal",
      type: "personal",
      brandColorPrimary: "#64748B",
      brandColorSecondary: "#94A3B8",
      defaultTimezone: "Europe/Madrid",
      createdById: user.id,
      members: { create: { userId: user.id, role: "owner", acceptedAt: new Date() } },
    },
  });

  for (const ws of [qyro, personal]) {
    await prisma.brandBrain.upsert({
      where: { workspaceId: ws.id },
      update: {},
      create: { workspaceId: ws.id },
    });
  }

  await prisma.brandBrain.update({
    where: { workspaceId: qyro.id },
    data: {
      productDescription:
        "QYRO es una app móvil que funciona como tu sistema operativo personal.",
      taglineMain: "Tu sistema operativo personal",
      uniqueValueProp:
        "Una sola app que entiende tu vida entera y te dice, con un solo número, si vas bien.",
      brandAdjectives: JSON.stringify(["calmado", "premium", "inteligente"]),
      claimsForbidden: JSON.stringify([
        "Te ayuda a perder X kilos",
        "Sincronizado en la nube",
      ]),
    },
  });

  console.log(`Created workspaces: ${qyro.slug}, ${personal.slug}`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
