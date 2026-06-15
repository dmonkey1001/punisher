/**
 * Local calendar date as YYYY-MM-DD.
 *
 * Using toISOString() would format in UTC, which rolls the day over early in
 * the evening for western timezones — a workout logged at 9pm local could be
 * dated "tomorrow". This keeps day-stamps on the user's local calendar.
 */
export function today(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}
