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
      gender: "Female",
      nationality: "Portuguese",
      passportNumber: "PT1234567",
      country: "Egypt",
      province: "Red Sea",
      county: "Hurghada",
    },
  });

  const demoCase = await prisma.case.create({
    data: {
      caseNumber: "20261399021",
      status: CaseStatus.HAS_SERVICE,
      patientId: patient.id,
      contractId: contract.id,
      createdById: caseManager.id,
      caseType: "MEDICAL",
      caseTypeDetail: "SIMPLE_MEDICAL_OUTPATIENT",
      arrivalChannel: "PHONE",
      callerName: "Ahmed Medhat",
      callerPhone: "+20 100 000 0000",
      tourAgency: "RNA (Rede Nacional de Assistencia)",
      description: "GOP for Alfa hospital with limit 1000 euros.",
      hasMedicalReport: true,
      hasPolicyDoc: true,
    },
  });

  await prisma.caseDiagnosis.create({
    data: {
      caseId: demoCase.id,
      label: "UPPER RESPIRATORY TRACT INFECTION",
      icdCode: "J06.9",
      notes: "Acute respiratory tract infection with high fever",
    },
  });

  await prisma.caseActivity.create({
    data: {
      caseId: demoCase.id,
      message: `Case created by ${caseManager.email} for contract ${contract.insurerName}`,
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
