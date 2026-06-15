<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	const { user, bars, plates, dumbbells, feedback } = $derived(data);

	function submitForm(e: Event) {
		(e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
	}
</script>

<h1 class="text-2xl font-bold">Gear</h1>
<p class="mt-1 text-sm text-zinc-500">Your equipment drives every prescribed load.</p>

<!-- Plate-math feedback -->
<div class="mt-4 grid grid-cols-3 gap-2">
	<div class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-center">
		<div class="text-lg font-black">{feedback.barbellMax}</div>
		<div class="text-[10px] text-zinc-500">max barbell (lb)</div>
	</div>
	<div class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-center">
		<div class="text-lg font-black">{feedback.barbellSmallestJump ?? '—'}</div>
		<div class="text-[10px] text-zinc-500">smallest jump (lb)</div>
	</div>
	<div class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-center">
		<div class="text-lg font-black">{feedback.cableMax}</div>
		<div class="text-[10px] text-zinc-500">max cable (lb)</div>
	</div>
</div>

<!-- Bars -->
<h2 class="mt-6 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Bars</h2>
<div class="flex flex-col gap-2">
	{#each bars as bar (bar.id)}
		<form method="POST" action="?/updateBar" use:enhance class="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5">
			<input type="hidden" name="id" value={bar.id} />
			<span class="flex-1 text-sm font-medium">{bar.name}</span>
			<input
				name="weight"
				type="number"
				step="0.5"
				inputmode="decimal"
				value={bar.weightLb}
				onchange={submitForm}
				class="w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center focus:border-sky-500 focus:outline-none"
			/>
			<span class="text-xs text-zinc-500">lb</span>
		</form>
	{/each}
</div>

<!-- Plates -->
<h2 class="mt-6 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Plates (shared: bar + cables)</h2>
<div class="flex flex-col gap-2">
	{#each plates as plate (plate.id)}
		<form method="POST" action="?/updatePlate" use:enhance class="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5">
			<input type="hidden" name="id" value={plate.id} />
			<span class="flex-1 text-sm font-medium">{plate.weightLb} lb</span>
			<span class="text-xs text-zinc-500">qty</span>
			<input
				name="quantity"
				type="number"
				inputmode="numeric"
				value={plate.quantity}
				onchange={submitForm}
				class="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center focus:border-sky-500 focus:outline-none"
			/>
			<button type="submit" formaction="?/deletePlate" class="text-zinc-700 hover:text-rose-400" aria-label="Delete">✕</button>
		</form>
	{/each}
</div>
<form method="POST" action="?/addPlate" use:enhance class="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-4 py-2.5">
	<input name="weight" type="number" step="0.25" inputmode="decimal" placeholder="weight" required class="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center focus:border-sky-500 focus:outline-none" />
	<input name="quantity" type="number" inputmode="numeric" placeholder="qty" class="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center focus:border-sky-500 focus:outline-none" />
	<button class="ml-auto rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-sky-400">+ Add plate</button>
</form>

<!-- Dumbbells -->
<h2 class="mt-6 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Dumbbells</h2>
<div class="flex flex-col gap-2">
	{#each dumbbells as d (d.id)}
		<form method="POST" action="?/updateDumbbell" use:enhance class="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5">
			<input type="hidden" name="id" value={d.id} />
			<span class="flex-1 text-sm font-medium">{d.weightLb} lb</span>
			<span class="text-xs text-zinc-500">pairs</span>
			<input
				name="pairs"
				type="number"
				inputmode="numeric"
				value={d.pairs}
				onchange={submitForm}
				class="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center focus:border-sky-500 focus:outline-none"
			/>
			<button type="submit" formaction="?/deleteDumbbell" class="text-zinc-700 hover:text-rose-400" aria-label="Delete">✕</button>
		</form>
	{/each}
</div>
<form method="POST" action="?/addDumbbell" use:enhance class="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-zinc-700 px-4 py-2.5">
	<input name="weight" type="number" step="0.5" inputmode="decimal" placeholder="weight" required class="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center focus:border-sky-500 focus:outline-none" />
	<input name="pairs" type="number" inputmode="numeric" placeholder="pairs" value="1" class="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center focus:border-sky-500 focus:outline-none" />
	<button class="ml-auto rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-sky-400">+ Add</button>
</form>

<!-- Cable calibration -->
<h2 class="mt-6 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Cable calibration ({user.name})</h2>
<form method="POST" action="?/updateRatio" use:enhance class="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
	<p class="text-xs text-zinc-500">
		Pulley ratio — felt resistance ÷ plates hung. 1 = same as plates, 0.5 = a 2:1 trainer (feels lighter).
	</p>
	<div class="mt-2 flex items-center gap-3">
		<input
			name="ratio"
			type="number"
			step="0.05"
			inputmode="decimal"
			value={user.cablePulleyRatio}
			onchange={submitForm}
			class="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-center focus:border-sky-500 focus:outline-none"
		/>
		<span class="text-sm text-zinc-500">× plates</span>
	</div>
</form>

<div class="mt-8 text-center">
	<a href="/" class="text-sm text-zinc-500">Switch profile →</a>
</div>
