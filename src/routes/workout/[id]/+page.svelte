<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data } = $props();
	const { workout, items, library, loadChoices } = $derived(data);

	// Auto-saving forms must NOT reset on submit (enhance resets by default),
	// otherwise the value the user just typed gets wiped before the reload.
	const keepValues: SubmitFunction = () => async ({ update }) => {
		await update({ reset: false });
	};

	// Per-set saves: keep values AND skip the full data reload, so saving one
	// field doesn't re-render (and clobber) another field you're mid-typing.
	// Deletes still reload so the removed row disappears.
	//
	// Because the reload is skipped, completion state is mirrored locally in
	// `doneOverlay` so the "X of N sets done" counters still update live.
	let doneOverlay = $state<Record<string, boolean>>({});
	const saveSetEnhance: SubmitFunction = ({ action, formData }) => {
		const isDelete = action.search.includes('deleteSet');
		const setId = String(formData.get('setId') ?? '');
		// Mirrors the server rule: a set is complete once reps are recorded.
		const reps = String(formData.get('reps') ?? '');
		const isWarmup = formData.get('isWarmup') != null;
		return async ({ update }) => {
			await update({ reset: false, invalidateAll: isDelete });
			if (!isDelete && setId) doneOverlay[setId] = reps !== '' && !isWarmup;
		};
	};

	function isSetDone(s: { id: string; completedAt: string | null; isWarmup: boolean }): boolean {
		return doneOverlay[s.id] ?? (!!s.completedAt && !s.isWarmup);
	}

	let showPicker = $state(false);
	let query = $state('');

	const isDone = $derived(workout.status === 'completed');

	const filtered = $derived(
		library.filter((e) => {
			const q = query.trim().toLowerCase();
			if (!q) return true;
			return e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q);
		})
	);

	function fmtDate(iso: string): string {
		return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		});
	}

	type Choice = { totalLb: number; hint: string };
	function nearest(equipment: string, weight: unknown): Choice | null {
		const choices = (loadChoices as Record<string, Choice[]>)[equipment];
		if (!choices?.length) return null;
		const w = Number(weight);
		if (!Number.isFinite(w)) return null;
		let best = choices[0];
		for (const c of choices)
			if (Math.abs(c.totalLb - w) < Math.abs(best.totalLb - w)) best = c;
		return best;
	}

	// Auto-save a set form on field change.
	function submitForm(e: Event) {
		(e.currentTarget as HTMLElement).closest('form')?.requestSubmit();
	}

	const totalSets = $derived(
		items.reduce((n, i) => n + i.sets.filter((s) => isSetDone(s)).length, 0)
	);
	const totalVolume = $derived(
		items.reduce(
			(v, i) =>
				v +
				i.sets
					.filter((s) => s.completedAt && !s.isWarmup)
					.reduce((sv, s) => sv + (s.actualReps ?? 0) * (s.actualWeightLb ?? 0), 0),
			0
		)
	);
</script>

<div class="flex items-center justify-between gap-2">
	<a href="/home" class="text-sm text-zinc-500">← Home</a>
	<div class="flex items-center gap-3">
		{#if isDone}
			<span class="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
				Completed ✓
			</span>
		{:else}
			<span class="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">
				In progress
			</span>
		{/if}
		<form
			method="POST"
			action="?/deleteWorkout"
			use:enhance
			onsubmit={(e) => {
				if (!confirm(totalSets > 0 ? 'Delete this workout and its logged sets? This cannot be undone.' : 'Discard this workout?')) e.preventDefault();
			}}
		>
			<button class="text-sm font-medium text-zinc-500 hover:text-rose-400">
				{isDone ? 'Delete' : 'Cancel'}
			</button>
		</form>
	</div>
</div>

<!-- Header / meta -->
<form method="POST" action="?/updateMeta" use:enhance={keepValues} class="mt-3">
	<input
		name="label"
		value={workout.label ?? ''}
		placeholder={workout.kind === 'conditioning' ? 'Conditioning' : 'Untitled workout'}
		onchange={submitForm}
		class="w-full bg-transparent text-2xl font-bold placeholder:text-zinc-700 focus:outline-none"
	/>
	<div class="text-sm text-zinc-500">{fmtDate(workout.date)}</div>
</form>

<!-- Readiness -->
<form method="POST" action="?/updateReadiness" use:enhance={keepValues} class="mt-4 grid grid-cols-2 gap-3">
	<label class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
		<span class="text-xs text-zinc-500">Fatigue</span>
		<select
			name="fatigue"
			onchange={submitForm}
			class="mt-0.5 w-full bg-transparent text-sm font-semibold focus:outline-none"
		>
			<option value="" selected={workout.fatigue == null}>—</option>
			{#each [1, 2, 3, 4, 5] as n (n)}
				<option value={n} selected={workout.fatigue === n}>{n} {n === 1 ? '(wrecked)' : n === 5 ? '(fresh)' : ''}</option>
			{/each}
		</select>
	</label>
	<label class="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
		<span class="text-xs text-zinc-500">Sleep</span>
		<select
			name="sleep"
			onchange={submitForm}
			class="mt-0.5 w-full bg-transparent text-sm font-semibold focus:outline-none"
		>
			<option value="" selected={workout.sleep == null}>—</option>
			{#each [1, 2, 3, 4, 5] as n (n)}
				<option value={n} selected={workout.sleep === n}>{n} {n === 1 ? '(poor)' : n === 5 ? '(great)' : ''}</option>
			{/each}
		</select>
	</label>
</form>

<!-- Exercises -->
<div class="mt-6 flex flex-col gap-4">
	{#each items as item (item.weId)}
		{@const doneSets = item.sets.filter((s) => isSetDone(s)).length}
		{@const goalSets = item.targetSets ?? item.sets.filter((s) => !s.isWarmup).length}
		{@const meta =
			item.targetRepLow && item.targetRepHigh
				? `${item.muscle} · target ${item.targetSets ? item.targetSets + ' × ' : ''}${item.targetRepLow}–${item.targetRepHigh} reps${item.targetRir != null ? ' @ ' + item.targetRir + ' RIR' : ''}`
				: item.muscle}
		<section class="rounded-2xl border border-zinc-800 bg-zinc-900/60">
			<header class="flex items-start justify-between gap-2 border-b border-zinc-800 px-4 py-3">
				<div>
					<div class="font-semibold">{item.name}</div>
					<div class="text-xs text-zinc-500">{meta}</div>
					<div class="mt-0.5 text-xs font-medium {doneSets >= goalSets ? 'text-emerald-400' : 'text-zinc-400'}">
						{doneSets} of {goalSets} sets done{#if doneSets >= goalSets && goalSets > 0} ✓{/if}
					</div>
					{#if item.weNotes}<div class="mt-1 text-xs text-sky-400/90">💡 {item.weNotes}</div>{/if}
					{#if item.exNotes}<div class="mt-1 text-xs text-zinc-600 italic">{item.exNotes}</div>{/if}
				</div>
				<form method="POST" action="?/removeExercise" use:enhance>
					<input type="hidden" name="weId" value={item.weId} />
					<button class="text-zinc-600 hover:text-rose-400" aria-label="Remove exercise" title="Remove">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
					</button>
				</form>
			</header>

			<!-- column headers -->
			<div class="grid grid-cols-[2rem_1fr_1fr_3.5rem_2rem] items-center gap-2 px-4 pt-3 text-[10px] font-semibold tracking-wide text-zinc-600 uppercase">
				<span>Set</span><span>Weight</span><span>Reps</span><span>RIR</span><span></span>
			</div>

			<div class="flex flex-col gap-1.5 px-4 py-2">
				{#each item.sets as s, idx (s.id)}
					{@const hint = item.equipment === 'bodyweight' ? null : nearest(item.equipment, s.actualWeightLb ?? s.targetWeightLb)}
					<form
						method="POST"
						action="?/saveSet"
						use:enhance={saveSetEnhance}
						class="grid grid-cols-[2rem_1fr_1fr_3.5rem_2rem] items-center gap-2"
					>
						<input type="hidden" name="setId" value={s.id} />
						<div class="flex items-center">
							{#if s.isWarmup}
								<span class="text-[10px] font-bold text-amber-500/80">W</span>
							{:else}
								<span class="text-sm font-bold text-zinc-500">{idx + 1 - item.sets.slice(0, idx).filter((x) => x.isWarmup).length}</span>
							{/if}
						</div>
						<input
							name="weight"
							type="number"
							inputmode="decimal"
							step="0.5"
							placeholder={item.equipment === 'bodyweight' ? 'BW' : '—'}
							value={s.actualWeightLb ?? s.targetWeightLb ?? ''}
							onchange={submitForm}
							class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center text-base focus:border-sky-500 focus:outline-none {s.completedAt ? 'border-emerald-700/50' : ''}"
						/>
						<input
							name="reps"
							type="number"
							inputmode="numeric"
							placeholder="—"
							value={s.actualReps ?? s.targetReps ?? ''}
							onchange={submitForm}
							class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-center text-base focus:border-sky-500 focus:outline-none {s.completedAt ? 'border-emerald-700/50' : ''}"
						/>
						<select
							name="rir"
							onchange={submitForm}
							class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-1 py-2 text-center text-sm focus:border-sky-500 focus:outline-none"
						>
							<option value="" selected={s.rir == null}>—</option>
							{#each [0, 1, 2, 3, 4, 5] as r (r)}
								<option value={r} selected={s.rir === r}>{r}</option>
							{/each}
						</select>
						<div class="flex items-center justify-end">
							<button
								type="submit"
								formaction="?/deleteSet"
								class="text-zinc-700 hover:text-rose-400"
								aria-label="Delete set"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
							</button>
						</div>
						{#if hint}
							<div class="col-span-5 -mt-0.5 pl-9 text-[11px] text-zinc-500">
								{#if hint.totalLb !== Number(s.actualWeightLb ?? s.targetWeightLb)}<span class="text-zinc-600">≈{hint.totalLb} lb · </span>{/if}{hint.hint}
							</div>
						{/if}
						<label class="col-span-5 flex items-center gap-1.5 pl-9 text-[11px] text-zinc-600">
							<input type="checkbox" name="isWarmup" checked={s.isWarmup} onchange={submitForm} class="h-3 w-3 rounded" />
							warm-up
						</label>
					</form>
				{/each}
			</div>

			<form method="POST" action="?/addSet" use:enhance class="px-4 pb-3">
				<input type="hidden" name="weId" value={item.weId} />
				<button class="w-full rounded-lg border border-dashed border-zinc-700 py-2 text-sm font-medium text-zinc-400 active:scale-[0.99]">
					+ Add set
				</button>
			</form>
		</section>
	{/each}
</div>

<!-- Add exercise -->
<div class="mt-4">
	{#if showPicker}
		<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
			<div class="flex items-center gap-2">
				<input
					bind:value={query}
					placeholder="Search exercises…"
					class="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
				/>
				<button onclick={() => (showPicker = false)} class="text-sm text-zinc-500">Close</button>
			</div>
			<div class="mt-2 max-h-80 overflow-y-auto">
				{#each filtered as e (e.id)}
					<form method="POST" action="?/addExercise" use:enhance={() => {
						return async ({ update }) => {
							await update();
							showPicker = false;
							query = '';
						};
					}}>
						<input type="hidden" name="exerciseId" value={e.id} />
						<button class="flex w-full items-center justify-between border-b border-zinc-800/60 px-1 py-2.5 text-left last:border-0">
							<span>
								<span class="text-sm font-medium">{e.name}</span>
								<span class="block text-[11px] text-zinc-500">{e.muscle} · {e.equipment}{e.isConditioning ? ' · conditioning' : ''}</span>
							</span>
							<span class="text-sky-500">+</span>
						</button>
					</form>
				{/each}
			</div>
		</div>
	{:else}
		<button
			onclick={() => (showPicker = true)}
			class="w-full rounded-2xl border border-zinc-700 bg-zinc-900 py-3 font-semibold text-sky-400 active:scale-[0.99]"
		>
			+ Add exercise
		</button>
	{/if}
</div>

<!-- Summary + finish -->
<div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
	<div class="flex justify-between text-sm">
		<span class="text-zinc-500">Working sets</span><span class="font-bold">{totalSets}</span>
	</div>
	<div class="mt-1 flex justify-between text-sm">
		<span class="text-zinc-500">Volume</span><span class="font-bold">{Math.round(totalVolume).toLocaleString()} lb</span>
	</div>
</div>

<div class="mt-4 flex flex-col gap-2">
	{#if isDone}
		<form method="POST" action="?/reopen" use:enhance>
			<button class="w-full rounded-xl border border-zinc-700 py-3 font-semibold text-zinc-300">Reopen to edit</button>
		</form>
	{:else}
		<form method="POST" action="?/finish" use:enhance>
			<button class="w-full rounded-xl bg-emerald-500 py-3.5 font-bold text-emerald-950 active:scale-[0.99]">Finish workout</button>
		</form>
	{/if}
	<form method="POST" action="?/deleteWorkout" use:enhance onsubmit={(e) => { if (!confirm('Delete this entire workout?')) e.preventDefault(); }}>
		<button class="w-full py-2 text-sm text-zinc-600 hover:text-rose-400">Delete workout</button>
	</form>
</div>
