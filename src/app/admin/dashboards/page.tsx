import { revalidatePath } from "next/cache";
import GroupParticipantSelector from "../../../components/admin/GroupParticipantSelector";
import { requireRoles } from "../../../lib/auth-server";
import { prisma } from "../../../lib/prisma";

async function createGroup(formData: FormData) {
  "use server";

  await requireRoles(["ADMIN", "OPERATOR"]);
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!name) return;

  await prisma.evaluationGroup.create({ data: { name, description } });
  revalidatePath("/admin/dashboards");
}

async function associateDefinition(formData: FormData) {
  "use server";

  await requireRoles(["ADMIN", "OPERATOR"]);
  const definitionId = String(formData.get("definition_id") || "");
  const groupId = String(formData.get("group_id") || "");
  if (!definitionId || !groupId) return;

  await prisma.evaluationDefinition.update({
    where: { id: definitionId },
    data: { evaluation_group_id: groupId },
  });

  revalidatePath("/admin/dashboards");
}

async function assignParticipantsToGroup(formData: FormData) {
  "use server";

  await requireRoles(["ADMIN", "OPERATOR"]);
  const groupId = String(formData.get("group_id") || "").trim();
  if (!groupId) return;

  const participantIds = Array.from(
    new Set(
      formData
        .getAll("participant_ids")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );

  await prisma.groupParticipant.deleteMany({ where: { evaluation_group_id: groupId } });

  if (participantIds.length > 0) {
    await prisma.groupParticipant.createMany({
      data: participantIds.map((participantId) => ({
        evaluation_group_id: groupId,
        participant_id: participantId,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/admin/dashboards");
}

async function deleteGroup(formData: FormData) {
  "use server";

  await requireRoles(["ADMIN", "OPERATOR"]);
  const groupId = String(formData.get("group_id") || "").trim();
  if (!groupId) return;

  await prisma.$transaction(async (tx) => {
    await tx.evaluationDefinition.updateMany({
      where: { evaluation_group_id: groupId },
      data: { evaluation_group_id: null },
    });

    await tx.groupParticipant.deleteMany({ where: { evaluation_group_id: groupId } });

    await tx.participantEvaluation.deleteMany({
      where: {
        assignment: {
          evaluation_group_id: groupId,
        },
      },
    });

    await tx.evaluationAssignment.deleteMany({ where: { evaluation_group_id: groupId } });
    await tx.evaluationGroup.delete({ where: { id: groupId } });
  });

  revalidatePath("/admin/dashboards");
  revalidatePath("/dashboards");
}

export default async function DashboardsPage() {
  const [groups, definitions, participants] = await Promise.all([
    prisma.evaluationGroup.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.evaluationDefinition.findMany({ include: { evaluation_group: true }, orderBy: { createdAt: "desc" } }),
    prisma.participant.findMany({ orderBy: { name: "asc" } }),
  ]);

  const groupParticipants = await prisma.groupParticipant.findMany({
    where: { evaluation_group_id: { in: groups.map((group) => group.id) } },
    select: { evaluation_group_id: true, participant_id: true },
  });

  const groupParticipantsMap = groupParticipants.reduce<Record<string, Set<string>>>((acc, item) => {
    if (!acc[item.evaluation_group_id]) acc[item.evaluation_group_id] = new Set<string>();
    acc[item.evaluation_group_id].add(item.participant_id);
    return acc;
  }, {});

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <form action={createGroup} className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Crear grupo de dashboard</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input name="name" placeholder="Nombre del grupo" required className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
          <input name="description" placeholder="Descripcion" className="h-10 rounded-lg border border-slate-300 px-3 text-sm" />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Crear</button>
        </div>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Grupos existentes</h3>
        <div className="mt-4 space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{group.name}</p>
                <p className="text-xs text-slate-500">{group.description || "Sin descripcion"}</p>
              </div>
              <form action={deleteGroup}>
                <input type="hidden" name="group_id" value={group.id} />
                <button type="submit" className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                  Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Asociar evaluaciones a grupo</h3>
        <div className="mt-4 space-y-3">
          {definitions.map((definition) => (
            <form key={definition.id} action={associateDefinition} className="grid gap-2 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_260px_auto] md:items-center">
              <div>
                <p className="text-sm font-semibold text-slate-900">{definition.title}</p>
                <p className="text-xs text-slate-500">Actual: {definition.evaluation_group?.name || "Sin grupo"}</p>
              </div>
              <select
                name="group_id"
                defaultValue={definition.evaluation_group_id || ""}
                className="h-11 appearance-none rounded-lg border border-slate-300 bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M6%208l4%204%204-4%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:14px_14px] bg-[right_0.75rem_center] bg-no-repeat px-3 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="" disabled>Seleccionar grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              <input type="hidden" name="definition_id" value={definition.id} />
              <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Guardar</button>
            </form>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Asignar participantes por grupo</h3>
        <div className="mt-4 space-y-3">
          {groups.map((group) => {
            const selectedParticipants = groupParticipantsMap[group.id] || new Set<string>();

            const selectedArray = Array.from(selectedParticipants);

            return (
              <GroupParticipantSelector
                key={`${group.id}-${[...selectedArray].sort().join(",")}`}
                groupId={group.id}
                groupName={group.name}
                participants={participants.map((p) => ({ id: p.id, name: p.name }))}
                initialSelected={selectedArray}
                action={assignParticipantsToGroup}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
