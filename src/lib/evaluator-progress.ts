import { prisma } from "./prisma";

export type DashboardParticipantResult = {
  id: string;
  name: string;
  total: number;
};

export type DashboardResults = {
  total: number;
  participants: DashboardParticipantResult[];
  winner: DashboardParticipantResult | null;
};

export async function isEvaluatorWorkComplete(
  evaluatorId: string,
  evaluationGroupId: string,
  evaluationDefinitionId?: string,
): Promise<boolean> {
  const hasAssignment = await prisma.evaluationAssignment.count({
    where: {
      evaluator_id: evaluatorId,
      evaluation_group_id: evaluationGroupId,
      ...(evaluationDefinitionId ? { evaluation_definition_id: evaluationDefinitionId } : {}),
    },
  });

  if (hasAssignment === 0) return false;

  const pendingCount = await prisma.participantEvaluation.count({
    where: {
      assignment: {
        evaluator_id: evaluatorId,
        evaluation_group_id: evaluationGroupId,
        ...(evaluationDefinitionId ? { evaluation_definition_id: evaluationDefinitionId } : {}),
      },
      is_complete: false,
    },
  });

  return pendingCount === 0;
}

export async function getWeightedResultsByGroup(
  evaluationGroupId: string,
  evaluationDefinitionId?: string,
): Promise<DashboardResults> {
    const participantEvaluations = await prisma.participantEvaluation.findMany({
    where: {
      is_complete: true,
      assignment: {
        evaluation_group_id: evaluationGroupId,
        ...(evaluationDefinitionId ? { evaluation_definition_id: evaluationDefinitionId } : {}),
      },
    },
    include: {
      participant: true,
      responses: {
        include: {
          question: true,
        },
      },
    },
  });

  const perParticipant = new Map<string, { id: string; name: string; totalScore: number; evaluatorCount: number }>();

  for (const participantEvaluation of participantEvaluations) {
    let participantTotal = 0;

    for (const response of participantEvaluation.responses) {
      const weight = Number(response.question.weight);
      const scaleMax = Number(response.question.scale_max || 10);
      const normalizedScore = scaleMax > 0 ? Number(response.score) / scaleMax : 0;
      participantTotal += normalizedScore * weight;
    }

    const existing = perParticipant.get(participantEvaluation.participant.id) || {
      id: participantEvaluation.participant.id,
      name: participantEvaluation.participant.name,
      totalScore: 0,
      evaluatorCount: 0,
    };

    existing.totalScore += participantTotal;
    existing.evaluatorCount += 1;
    perParticipant.set(participantEvaluation.participant.id, existing);
  }

  const participants: DashboardParticipantResult[] = Array.from(perParticipant.values())
    .map((p) => ({
      id: p.id,
      name: p.name,
      total: p.evaluatorCount > 0 ? p.totalScore / p.evaluatorCount : 0,
    }))
    .sort((left, right) => right.total - left.total);

  const globalTotal = participants.reduce((sum, p) => sum + p.total, 0);

  return {
    total: globalTotal,
    participants,
    winner: participants[0] || null,
  };
}
