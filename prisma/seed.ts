import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();
const db = prisma as any;

function hashPassword(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  await db.response.deleteMany();
  await db.participantEvaluation.deleteMany();
  await db.evaluationAssignment.deleteMany();
  await db.question.deleteMany();
  await db.evaluationDefinition.deleteMany();
  await db.participant.deleteMany();
  await db.evaluationGroup.deleteMany();
  await db.user.deleteMany();

  const admin = await db.user.create({
    data: {
      email: "admin@demo.com",
      password_hash: hashPassword("uees2026#"),
      role: "ADMIN",
    },
  });

  await db.user.create({
    data: {
      email: "operator@demo.com",
      password_hash: hashPassword("uees2026#"),
      role: "OPERATOR",
    },
  });

  const eval1 = await db.user.create({
    data: {
      email: "eval1@demo.com",
      password_hash: hashPassword("uees2026#"),
      role: "EVALUATOR",
    },
  });

  const eval2 = await db.user.create({
    data: {
      email: "eval2@demo.com",
      password_hash: hashPassword("uees2026#"),
      role: "EVALUATOR",
    },
  });

  const group = await db.evaluationGroup.create({
    data: {
      name: "Estudiantes 2026",
      description: "Demo de evaluacion de ponencias TEDx UEES",
    },
  });

  const definition = await db.evaluationDefinition.create({
    data: {
      title: "Evaluación de ponencias - ESTUDIANTES",
      creator_id: admin.id,
      evaluation_group_id: group.id,
    },
  });

  const questions = [
    "¿El tema se ajusta al concepto POLARIS?",
    "¿El participante transmite su idea con una pronunciación adecuada y palabras comprensibles?",
    "¿El participante transmite a través de sus gestos faciales y corporales, la importancia de su idea, generando interés?",
    "¿El participante muestra cuidado en su imagen personal (vestimenta y cara)?",
    "¿El tema genera interés para que sea una charla TED?",
  ];

  for (const text of questions) {
    await db.question.create({
      data: {
        evaluation_definition_id: definition.id,
        text,
        weight: 1,
        scale_min: 1,
        scale_max: 10,
      },
    });
  }

  const participants = await db.$transaction([
    db.participant.create({ data: { name: "Ana Salazar" } }),
    db.participant.create({ data: { name: "Bruno Mendoza" } }),
    db.participant.create({ data: { name: "Carla Pineda" } }),
    db.participant.create({ data: { name: "Diego Herrera" } }),
  ]);

  const assignment1 = await db.evaluationAssignment.create({
    data: {
      evaluator_id: eval1.id,
      evaluation_definition_id: definition.id,
      evaluation_group_id: group.id,
    },
  });

  const assignment2 = await db.evaluationAssignment.create({
    data: {
      evaluator_id: eval2.id,
      evaluation_definition_id: definition.id,
      evaluation_group_id: group.id,
    },
  });

  await db.participantEvaluation.createMany({
    data: [
      { assignment_id: assignment1.id, participant_id: participants[0].id },
      { assignment_id: assignment1.id, participant_id: participants[1].id },
      { assignment_id: assignment2.id, participant_id: participants[2].id },
      { assignment_id: assignment2.id, participant_id: participants[3].id },
    ],
  });

  console.log("Seed completado");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
