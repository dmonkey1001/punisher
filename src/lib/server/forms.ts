/** Parse an optional numeric form field: '' / missing / junk → null. */
export function num(v: FormDataEntryValue | null): number | null {
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}
