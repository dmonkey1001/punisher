<script lang="ts">
	let { data } = $props();
	const { workouts } = $derived(data);

	function fmtDate(iso: string): string {
		return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	// Group by "Month Year".
	const groups = $derived.by(() => {
		const map = new Map<string, typeof workouts>();
		for (const w of workouts) {
			const key = new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, {
				month: 'long',
				year: 'numeric'
			});
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(w);
		}
		return [...map.entries()];
	});
</script>

<h1 class="text-2xl font-bold">History</h1>

{#if workouts.length === 0}
	<p class="mt-6 rounded-2xl border border-dashed border-zinc-800 px-5 py-10 text-center text-sm text-zinc-500">
		No workouts logged yet.
	</p>
{:else}
	{#each groups as [month, list] (month)}
		<h2 class="mt-6 mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{month}</h2>
		<ul class="grid grid-cols-1 gap-2 lg:grid-cols-2">
			{#each list as w (w.id)}
				<li>
					<a
						href="/workout/{w.id}"
						class="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
					>
						<div>
							<div class="font-semibold">
								{w.label ?? (w.kind === 'conditioning' ? 'Conditioning' : 'Lifting')}
							</div>
							<div class="text-xs text-zinc-500">{fmtDate(w.date)} · {w.exercises} exercises</div>
						</div>
						<div class="text-right text-xs text-zinc-400">
							{#if w.status === 'in_progress'}
								<span class="rounded bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-400">active</span>
							{:else}
								<div class="font-semibold text-zinc-300">{w.sets} sets</div>
								{#if w.volume > 0}<div class="text-zinc-600">{Math.round(w.volume).toLocaleString()} lb</div>{/if}
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/each}
{/if}
