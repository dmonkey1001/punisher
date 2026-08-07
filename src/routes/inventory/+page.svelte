<script lang="ts">
	import { enhance } from '$app/forms';
	import { PROFILE_COLORS } from '$lib/profile-colors';

	let { data } = $props();
	const { user, bars, plates, dumbbells, feedback, exercises, blockedIds } = $derived(data);

	let exQuery = $state('');
	const blocked = $derived(new Set(blockedIds));
	const filteredExercises = $derived(
		exercises.filter((e) => {
			const q = exQuery.trim().toLowerCase();
			if (!q) return true;
			return e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q);
		})
	);

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

<!-- Exercise rotation blacklist -->
<h2 class="mt-6 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
	Exercise rotation ({user.name})
</h2>
<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
	<p class="px-1 pb-2 text-xs text-zinc-600">
		Blocked exercises are never auto-programmed for you. You can still add them to a workout manually.
		{#if blocked.size > 0}<span class="text-rose-400/80">{blocked.size} blocked.</span>{/if}
	</p>
	<input
		bind:value={exQuery}
		placeholder="Search exercises…"
		class="mb-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
	/>
	<div class="max-h-72 overflow-y-auto">
		{#each filteredExercises as e (e.id)}
			<form
				method="POST"
				action="?/toggleBlock"
				use:enhance
				class="flex items-center justify-between gap-2 border-b border-zinc-800/60 px-1 py-2 last:border-0"
			>
				<input type="hidden" name="exerciseId" value={e.id} />
				<span class="min-w-0">
					<span class="block truncate text-sm font-medium {blocked.has(e.id) ? 'text-zinc-500 line-through' : ''}">{e.name}</span>
					<span class="text-[11px] text-zinc-600">{e.muscle}</span>
				</span>
				<button
					class="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition {blocked.has(e.id)
						? 'border-rose-700/60 bg-rose-950/40 text-rose-300'
						: 'border-zinc-700 text-zinc-400'}"
				>
					{blocked.has(e.id) ? 'Blocked' : 'Block'}
				</button>
			</form>
		{/each}
	</div>
</div>

<!-- Profile -->
<h2 class="mt-6 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Profile</h2>
<form method="POST" action="?/updateProfile" use:enhance class="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
	<label class="flex items-center gap-3">
		<span class="w-14 text-xs text-zinc-500">Name</span>
		<input
			name="name"
			value={user.name}
			required
			maxlength="30"
			onchange={submitForm}
			class="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 focus:border-sky-500 focus:outline-none"
		/>
	</label>
	<div class="flex items-center gap-3">
		<span class="w-14 text-xs text-zinc-500">Color</span>
		<div class="flex flex-wrap gap-2">
			{#each PROFILE_COLORS as c (c)}
				<button
					name="color"
					value={c}
					aria-label="Set color {c}"
					class="h-8 w-8 rounded-full transition {user.color === c
						? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
						: 'opacity-70'}"
					style="background-color: {c}"
				></button>
			{/each}
		</div>
	</div>
</form>

<!-- Danger zone -->
<h2 class="mt-8 mb-2 text-sm font-semibold tracking-wide text-rose-500/80 uppercase">Danger zone ({user.name})</h2>
<div class="flex flex-col gap-2 rounded-2xl border border-rose-900/50 bg-rose-950/20 p-3">
	<form
		method="POST"
		action="?/resetTraining"
		use:enhance
		onsubmit={(e) => { if (!confirm(`Delete ALL of ${user.name}'s workout history (workouts, sets, cycles, soreness)? This cannot be undone.`)) e.preventDefault(); }}
	>
		<button class="w-full rounded-xl border border-rose-800/60 py-2.5 text-sm font-semibold text-rose-300">
			Reset workout history
		</button>
	</form>
	<form
		method="POST"
		action="?/resetBody"
		use:enhance
		onsubmit={(e) => { if (!confirm(`Delete ALL of ${user.name}'s bodyweight + measurement logs? This cannot be undone.`)) e.preventDefault(); }}
	>
		<button class="w-full rounded-xl border border-rose-800/60 py-2.5 text-sm font-semibold text-rose-300">
			Reset body logs
		</button>
	</form>
	<p class="px-1 text-xs text-zinc-600">Profiles, equipment, and the exercise library are kept.</p>
	<form
		method="POST"
		action="?/deleteProfile"
		use:enhance
		onsubmit={(e) => { if (!confirm(`Permanently delete the profile "${user.name}" and ALL of its data (workouts, body logs, everything)? This cannot be undone.`)) e.preventDefault(); }}
	>
		<button class="w-full rounded-xl border border-rose-700 bg-rose-950/40 py-2.5 text-sm font-bold text-rose-300">
			Delete this profile
		</button>
	</form>
</div>

<div class="mt-8 text-center">
	<a href="/" class="text-sm text-zinc-500">Switch profile →</a>
</div>
