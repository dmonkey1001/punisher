<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	const { muscleGroups } = $derived(data);

	let fatigue = $state<number | null>(null);
	let sleep = $state<number | null>(null);
	// muscleGroupId -> soreness level (0 none, 2 mild, 3 sore)
	let soreness = $state<Record<string, number>>({});

	function cycleSore(id: string) {
		const cur = soreness[id] ?? 0;
		const next = cur === 0 ? 2 : cur === 2 ? 3 : 0;
		soreness = { ...soreness, [id]: next };
	}

	const sorenessJson = $derived(
		JSON.stringify(Object.fromEntries(Object.entries(soreness).filter(([, v]) => v > 0)))
	);

	function soreClass(level: number): string {
		if (level === 3) return 'border-rose-500/60 bg-rose-500/20 text-rose-300';
		if (level === 2) return 'border-amber-500/50 bg-amber-500/15 text-amber-300';
		return 'border-zinc-800 bg-zinc-900 text-zinc-400';
	}
	function soreLabel(level: number): string {
		return level === 3 ? 'sore' : level === 2 ? 'mild' : '';
	}
</script>

<div class="flex items-center justify-between">
	<a href="/home" class="text-sm text-zinc-500">← Home</a>
	<span class="text-xs text-zinc-600">Readiness check-in</span>
</div>

<h1 class="mt-3 text-2xl font-bold">How are you feeling?</h1>
<p class="mt-1 text-sm text-zinc-500">This tunes today's volume and effort. Skip anything you like.</p>

<form method="POST" use:enhance class="mt-5">
	<input type="hidden" name="fatigue" value={fatigue ?? ''} />
	<input type="hidden" name="sleep" value={sleep ?? ''} />
	<input type="hidden" name="soreness" value={sorenessJson} />

	<!-- Fatigue -->
	<div class="mb-5">
		<div class="mb-2 flex justify-between text-sm">
			<span class="font-semibold">Energy / fatigue</span>
			<span class="text-zinc-600">{fatigue == null ? '—' : fatigue === 1 ? 'wrecked' : fatigue === 5 ? 'fresh' : ''}</span>
		</div>
		<div class="grid grid-cols-5 gap-2">
			{#each [1, 2, 3, 4, 5] as n (n)}
				<button
					type="button"
					onclick={() => (fatigue = fatigue === n ? null : n)}
					class="rounded-xl border py-3 text-base font-bold transition {fatigue === n ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}"
				>
					{n}
				</button>
			{/each}
		</div>
	</div>

	<!-- Sleep -->
	<div class="mb-5">
		<div class="mb-2 flex justify-between text-sm">
			<span class="font-semibold">Sleep quality</span>
			<span class="text-zinc-600">{sleep == null ? '—' : sleep === 1 ? 'poor' : sleep === 5 ? 'great' : ''}</span>
		</div>
		<div class="grid grid-cols-5 gap-2">
			{#each [1, 2, 3, 4, 5] as n (n)}
				<button
					type="button"
					onclick={() => (sleep = sleep === n ? null : n)}
					class="rounded-xl border py-3 text-base font-bold transition {sleep === n ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'}"
				>
					{n}
				</button>
			{/each}
		</div>
	</div>

	<!-- Soreness -->
	<div class="mb-6">
		<div class="mb-2 text-sm font-semibold">Anything sore? <span class="font-normal text-zinc-600">(tap to cycle: mild → sore)</span></div>
		<div class="flex flex-wrap gap-2">
			{#each muscleGroups as g (g.id)}
				{@const lvl = soreness[g.id] ?? 0}
				<button
					type="button"
					onclick={() => cycleSore(g.id)}
					class="rounded-full border px-3 py-1.5 text-sm font-medium transition {soreClass(lvl)}"
				>
					{g.name}{#if soreLabel(lvl)} · {soreLabel(lvl)}{/if}
				</button>
			{/each}
		</div>
	</div>

	<button class="w-full rounded-2xl bg-sky-500 py-4 text-lg font-bold text-sky-950 transition active:scale-[0.99]">
		Generate workout →
	</button>
	<p class="mt-3 text-center text-xs text-zinc-600">
		Sore muscles get less volume today; low energy trims sets and leaves a rep in reserve.
	</p>
</form>
