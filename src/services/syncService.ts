import { syncRepository, SyncRecord } from "../repositories/syncRepository";

const CHECKPOINT_TYPES = ["mandatory", "voluntary"];
const SYNC_ID_REGEX = /^[a-f0-9]{64}$/i; // SHA256 hex

interface SyncResult {
	inserted: number;
	skipped: number;
	errors: { sync_id: string; reason: string }[];
}

function validateRecord(record: any): string | null {
	if (!record.sync_id || typeof record.sync_id !== "string")
		return "sync_id obrigatório";
	if (!SYNC_ID_REGEX.test(record.sync_id))
		return "sync_id inválido: deve ser SHA256 hex (64 chars)";
	if (record.shift_id == null || !Number.isInteger(Number(record.shift_id)))
		return "shift_id inválido: inteiro obrigatório";
	if (record.distance == null || Number(record.distance) < 0 || isNaN(Number(record.distance)))
		return "distance inválido: número >= 0 obrigatório";
	if (!record.timestamp || isNaN(Date.parse(record.timestamp)))
		return "timestamp inválido: ISO 8601 obrigatório";
	if (record.checkpoint_type != null && !CHECKPOINT_TYPES.includes(record.checkpoint_type))
		return `checkpoint_type inválido: use 'mandatory' ou 'voluntary'`;
	return null;
}

export const syncService = {
	async syncCheckpoints(records: any[]): Promise<SyncResult> {
		const result: SyncResult = { inserted: 0, skipped: 0, errors: [] };

		for (const raw of records) {
			const sync_id = raw.sync_id ?? "(sem sync_id)";

			const validationError = validateRecord(raw);
			if (validationError) {
				result.errors.push({ sync_id, reason: validationError });
				continue;
			}

			const shift_id = Number(raw.shift_id);

			if (!(await syncRepository.shiftExists(shift_id))) {
				result.errors.push({ sync_id, reason: "turno não encontrado" });
				continue;
			}

			if (!(await syncRepository.shiftIsActive(shift_id))) {
				result.errors.push({ sync_id, reason: "turno não está em andamento" });
				continue;
			}

			const record: SyncRecord = {
				sync_id,
				shift_id,
				distance: Number(raw.distance),
				checkpoint_type: raw.checkpoint_type ?? "voluntary",
				timestamp: raw.timestamp,
			};

			const inserted = await syncRepository.insertCheckpoint(record);
			if (inserted) {
				result.inserted++;
			} else {
				result.skipped++;
			}
		}

		return result;
	},
};
