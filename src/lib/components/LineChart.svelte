<script lang="ts">
	interface Point {
		label: string; // x-axis label (e.g. a date)
		value: number;
	}

	let {
		points,
		color = '#38bdf8',
		height = 150,
		unit = '',
		decimals = 0
	}: { points: Point[]; color?: string; height?: number; unit?: string; decimals?: number } =
		$props();

	const W = 320;
	const padL = 6;
	const padR = 8;
	const padT = 12;
	const padB = 20;

	const min = $derived(Math.min(...points.map((p) => p.value)));
	const max = $derived(Math.max(...points.map((p) => p.value)));
	const span = $derived(max - min || 1);

	function x(i: number): number {
		const n = points.length;
		if (n <= 1) return padL;
		return padL + (i / (n - 1)) * (W - padL - padR);
	}
	function y(v: number): number {
		return padT + (1 - (v - min) / span) * (height - padT - padB);
	}

	const linePath = $derived(
		points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
	);
	const areaPath = $derived(
		points.length
			? `${linePath} L${x(points.length - 1).toFixed(1)},${(height - padB).toFixed(1)} L${x(0).toFixed(1)},${(height - padB).toFixed(1)} Z`
			: ''
	);

	const fmt = (v: number) => v.toFixed(decimals);
	const last = $derived(points.at(-1));
	// Sanitize the color into a valid id ('#' breaks url(#...) references).
	const gradId = $derived('grad-' + color.replace(/[^a-z0-9]/gi, ''));
</script>

{#if points.length < 2}
	<div class="flex h-24 items-center justify-center text-sm text-zinc-600">
		Not enough data yet — log a couple sessions.
	</div>
{:else}
	<svg viewBox="0 0 {W} {height}" class="w-full" style="height: {height}px" role="img">
		<defs>
			<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color={color} stop-opacity="0.25" />
				<stop offset="100%" stop-color={color} stop-opacity="0" />
			</linearGradient>
		</defs>

		<!-- area + line -->
		<path d={areaPath} fill="url(#{gradId})" />
		<path d={linePath} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />

		<!-- points -->
		{#each points as p, i (i)}
			<circle cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 3.5 : 2} fill={color} />
		{/each}

		<!-- y-range labels -->
		<text x={padL} y={padT - 2} fill="#71717a" font-size="9">{fmt(max)}{unit}</text>
		<text x={padL} y={height - padB + 9} fill="#71717a" font-size="9">{fmt(min)}{unit}</text>

		<!-- x endpoints -->
		<text x={padL} y={height - 4} fill="#52525b" font-size="9">{points[0].label}</text>
		<text x={W - padR} y={height - 4} fill="#52525b" font-size="9" text-anchor="end">{points.at(-1)!.label}</text>
	</svg>
	{#if last}
		<div class="mt-1 text-right text-xs text-zinc-500">
			latest <span class="font-semibold text-zinc-300">{fmt(last.value)}{unit}</span>
		</div>
	{/if}
{/if}
