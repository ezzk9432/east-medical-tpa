import { PrismaClient, UserRole, CaseStatus, Currency } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "layla.hassan@eastmedical.test" },
    update: {},
    create: {
      email: "layla.hassan@eastmedical.test",
      passwordHash,
      fullName: "Layla Hassan",
      role: UserRole.ADMIN,
    },
  });

  const caseManager = await prisma.user.upsert({
    where: { email: "sarah.mansour@eastmedical.test" },
    update: {},
    create: {
      email: "sarah.mansour@eastmedical.test",
      passwordHash,
      fullName: "Sarah Mansour",
      role: UserRole.CASE_MANAGER,
    },
  });

  await prisma.user.upsert({
    where: { email: "karim.adel@eastmedical.test" },
    update: {},
    create: {
      email: "karim.adel@eastmedical.test",
      passwordHash,
      fullName: "Karim Adel",
      role: UserRole.FINANCE,
    },
  });

  await prisma.user.upsert({
    where: { email: "omar.naguib@eastmedical.test" },
    update: {},
    create: {
      email: "omar.naguib@eastmedical.test",
      passwordHash,
      fullName: "Omar Naguib",
      role: UserRole.CASE_MANAGER,
    },
  });

  const contract = await prisma.contract.upsert({
    where: { contractNumber: "CTR-2026-001" },
    update: {},
    create: {
      contractNumber: "CTR-2026-001",
      insurerName: "EuroAssist Insurance",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      deductiblePct: 10,
      guaranteedAmount: 50000,
      currency: Currency.EUR,
    },
  });

  const provider = await prisma.provider.create({
    data: {
      name: "Cairo International Hospital",
      type: "hospital",
      country: "Egypt",
      city: "Cairo",
    },
  });

  const patient = await prisma.patient.create({
    data: {
      fullName: "Lucia Cardoso",
      nationality: "Portuguese",
      passportNumber: "PT1234567",
    },
  });

  const demoCase = await prisma.case.create({
    data: {
      caseNumber: "20261399021",
      status: CaseStatus.HAS_SERVICE,
      patientId: patient.id,
      contractId: contract.id,
      createdById: caseManager.id,
    },
  });

  await prisma.caseService.create({
    data: {
      caseId: demoCase.id,
      providerId: provider.id,
      serviceType: "consultation",
      priceIn: 1800,
      priceOut: 2208.79,
      currency: Currency.EUR,
    },
  });

  console.log("Seed complete.");
  console.log("Demo login: layla.hassan@eastmedical.test / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
