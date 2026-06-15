<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	const { bodyweight, measurements, latestBySite, sites } = $derived(data);

	const today = new Date().toISOString().slice(0, 10);

	const latest = $derived(bodyweight.at(-1) ?? null);
	const previous = $derived(bodyweight.at(-2) ?? null);
	const delta = $derived(latest && previous ? latest.weightLb - previous.weightLb : null);

	function label(site: string): string {
		return site.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function fmtDate(iso: string): string {
		return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
	}

	// Sparkline path from the last 20 bodyweight points.
	const spark = $derived.by(() => {
		const pts = bodyweight.slice(-20);
		if (pts.length < 2) return null;
		const vals = pts.map((p) => p.weightLb);
		const min = Math.min(...vals);
		const max = Math.max(...vals);
		const span = max - min || 1;
		const W = 300;
		const H = 60;
		const d = pts
			.map((p, i) => {
				const x = (i / (pts.length - 1)) * W;
				const y = H - ((p.weightLb - min) / span) * H;
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
		return { d, W, H };
	});
</script>

<h1 class="text-2xl font-bold">Body</h1>

<!-- Bodyweight -->
<section class="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
	<div class="flex items-end justify-between">
		<div>
			<div class="text-xs text-zinc-500">Bodyweight</div>
			<div class="text-3xl font-black">
				{#if latest}{latest.weightLb}<span class="text-base font-normal text-zinc-500"> lb</span>{:else}<span class="text-base font-normal text-zinc-500">—</span>{/if}
			</div>
		</div>
		{#if delta != null}
			<div class="text-sm font-semibold {delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-sky-400' : 'text-zinc-500'}">
				{delta > 0 ? '+' : ''}{delta.toFixed(1)} lb
			</div>
		{/if}
	</div>

	{#if spark}
		<svg viewBox="0 0 {spark.W} {spark.H}" class="mt-3 h-16 w-full" preserveAspectRatio="none">
			<path d={spark.d} fill="none" stroke="#38bdf8" stroke-width="2" vector-effect="non-scaling-stroke" />
		</svg>
	{/if}

	<form method="POST" action="?/logBodyweight" use:enhance class="mt-3 flex gap-2">
		<input
			name="weight"
			type="number"
			step="0.1"
			inputmode="decimal"
			placeholder="Weight"
			required
			class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-base focus:border-sky-500 focus:outline-none"
		/>
		<input
			name="date"
			type="date"
			value={today}
			class="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2.5 text-sm text-zinc-400 focus:border-sky-500 focus:outline-none"
		/>
		<button class="rounded-lg bg-sky-500 px-4 py-2.5 font-bold text-sky-950">Log</button>
	</form>

	{#if bodyweight.length}
		<details class="mt-3">
			<summary class="cursor-pointer text-xs text-zinc-500">History ({bodyweight.length})</summary>
			<ul class="mt-2 flex flex-col gap-1">
				{#each [...bodyweight].reverse() as b (b.id)}
					<li class="flex items-center justify-between text-sm">
						<span class="text-zinc-400">{fmtDate(b.date)}</span>
						<span class="font-semibold">{b.weightLb} lb</span>
						<form method="POST" action="?/deleteBodyweight" use:enhance>
							<input type="hidden" name="id" value={b.id} />
							<button class="text-zinc-700 hover:text-rose-400" aria-label="Delete">✕</button>
						</form>
					</li>
				{/each}
			</ul>
		</details>
	{/if}
</section>

<!-- Measurements -->
<section class="mt-6">
	<h2 class="mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Measurements (in)</h2>

	<div class="grid grid-cols-2 gap-2">
		{#each sites as site (site)}
			<div class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
				<div class="text-xs text-zinc-500">{label(site)}</div>
				<div class="text-lg font-bold">
					{#if latestBySite[site]}{latestBySite[site].valueIn}″{:else}<span class="text-sm font-normal text-zinc-600">—</span>{/if}
				</div>
			</div>
		{/each}
	</div>

	<form method="POST" action="?/logMeasurement" use:enhance class="mt-3 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
		<select name="site" required class="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none">
			{#each sites as site (site)}
				<option value={site}>{label(site)}</option>
			{/each}
		</select>
		<input name="value" type="number" step="0.1" inputmode="decimal" placeholder="inches" required class="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-base focus:border-sky-500 focus:outline-none" />
		<input name="date" type="date" value={today} class="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2.5 text-sm text-zinc-400 focus:border-sky-500 focus:outline-none" />
		<button class="rounded-lg bg-sky-500 px-4 py-2.5 font-bold text-sky-950">Add</button>
	</form>

	{#if measurements.length}
		<details class="mt-3">
			<summary class="cursor-pointer text-xs text-zinc-500">All entries ({measurements.length})</summary>
			<ul class="mt-2 flex flex-col gap-1">
				{#each measurements as m (m.id)}
					<li class="flex items-center justify-between text-sm">
						<span class="text-zinc-400">{fmtDate(m.date)}</span>
						<span class="text-zinc-500">{label(m.site)}</span>
						<span class="font-semibold">{m.valueIn}″</span>
						<form method="POST" action="?/deleteMeasurement" use:enhance>
							<input type="hidden" name="id" value={m.id} />
							<button class="text-zinc-700 hover:text-rose-400" aria-label="Delete">✕</button>
						</form>
					</li>
				{/each}
			</ul>
		</details>
	{/if}
</section>
