<script lang="ts">
	import LineChart from '$lib/components/LineChart.svelte';

	let { data } = $props();
	const { strength, bodyweight, measurements } = $derived(data);

	let selectedId = $state<string | null>(null);
	const selected = $derived(
		strength.find((s) => s.id === selectedId) ?? strength[0] ?? null
	);

	function siteLabel(site: string): string {
		return site.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	const measurementSites = $derived(Object.keys(measurements));
</script>

<h1 class="text-2xl font-bold">Progress</h1>

<div class="lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
<section class="lg:col-span-2">
<!-- Strength -->
<h2 class="mt-5 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Strength</h2>
{#if strength.length === 0}
	<p class="rounded-2xl border border-dashed border-zinc-800 px-5 py-8 text-center text-sm text-zinc-500">
		Log a few sets and your strength trends show up here.
	</p>
{:else}
	<!-- exercise picker -->
	<div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
		{#each strength as s (s.id)}
			<button
				onclick={() => (selectedId = s.id)}
				class="shrink-0 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition {(selected?.id === s.id)
					? 'border-sky-500 bg-sky-500/20 text-sky-300'
					: 'border-zinc-800 bg-zinc-900 text-zinc-400'}"
			>
				{s.name}
			</button>
		{/each}
	</div>

	{#if selected}
		<div class="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
			<div class="flex items-start justify-between">
				<div>
					<div class="font-semibold">{selected.name}</div>
					<div class="text-xs text-zinc-500">
						{selected.metric === 'e1rm' ? 'Estimated 1-rep max' : 'Top reps'}
					</div>
				</div>
				<div class="text-right">
					<div class="text-2xl font-black">
						{selected.latest}<span class="text-sm font-normal text-zinc-500">{selected.metric === 'e1rm' ? ' lb' : ' reps'}</span>
					</div>
					{#if selected.changePct != null}
						<div class="text-xs font-semibold {selected.changePct >= 0 ? 'text-emerald-400' : 'text-amber-400'}">
							{selected.changePct >= 0 ? '+' : ''}{selected.changePct}% all-time
						</div>
					{/if}
				</div>
			</div>

			<div class="mt-3">
				<LineChart
					points={selected.points}
					unit={selected.metric === 'e1rm' ? ' lb' : ''}
					color="#38bdf8"
				/>
			</div>

			<div class="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
				<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 4L12 4l3.5 5L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
				PR: {selected.best}{selected.metric === 'e1rm' ? ' lb' : ' reps'} est.
			</div>
		</div>
	{/if}
{/if}

</section>
<section>
<!-- Bodyweight -->
<h2 class="mt-5 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase lg:mt-5">Bodyweight</h2>
{#if bodyweight.length < 2}
	<p class="rounded-2xl border border-dashed border-zinc-800 px-5 py-6 text-center text-sm text-zinc-500">
		<a href="/body" class="text-sky-400">Log your bodyweight</a> a few times to see the trend.
	</p>
{:else}
	<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
		<LineChart points={bodyweight} unit=" lb" decimals={1} color="#a78bfa" />
	</div>
{/if}

</section>
</div>

<!-- Measurements -->
{#if measurementSites.length}
	<h2 class="mt-7 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Measurements</h2>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each measurementSites as site (site)}
			<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
				<div class="mb-1 text-sm font-semibold">{siteLabel(site)}</div>
				<LineChart points={measurements[site]} unit="″" decimals={1} color="#34d399" height={110} />
			</div>
		{/each}
	</div>
{/if}
