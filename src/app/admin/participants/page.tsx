import { prisma } from "../../../lib/prisma";
import { revalidatePath } from "next/cache";

async function createParticipant(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await prisma.participant.create({ data: { name } });
  revalidatePath("/admin/participants");
}

async function deleteParticipant(formData: FormData) {
  "use server";

  const participantId = String(formData.get("participant_id") || "").trim();
  if (!participantId) return;

  await prisma.participant.delete({ where: { id: participantId } });
  revalidatePath("/admin/participants");
}

export default async function ParticipantsPage() {
  const participants = await prisma.participant.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <form action={createParticipant} className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Crear participante</h2>
        <div className="mt-3 flex gap-2">
          <input name="name" placeholder="Nombre completo" required className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Guardar</button>
        </div>
      </form>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Listado</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Nombre</th>
                <th className="py-2">Creado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-800">{participant.name}</td>
                  <td className="py-2 text-slate-600">{participant.createdAt.toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <form action={deleteParticipant}>
                      <input type="hidden" name="participant_id" value={participant.id} />
                      <button type="submit" className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
