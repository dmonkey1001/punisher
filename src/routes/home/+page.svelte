<script lang="ts">
	import { enhance } from '$app/forms';

	let { data } = $props();
	const { user, active, recent, latestBw } = $derived(data);

	function fmtDate(iso: string): string {
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<h1 class="text-2xl font-bold">Hey, {user.name} 👋</h1>
<p class="mt-1 text-sm text-zinc-500">Ready to put in the work?</p>

{#if active}
	<a
		href="/workout/{active.id}"
		class="mt-5 flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4"
	>
		<div>
			<div class="text-xs font-semibold tracking-wide text-amber-400 uppercase">In progress</div>
			<div class="font-semibold">{active.label ?? 'Workout'} · {fmtDate(active.date)}</div>
		</div>
		<span class="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-bold text-amber-950">Resume</span>
	</a>
{/if}

<form method="POST" action="?/generate" use:enhance class="mt-5">
	<button
		class="flex w-full items-center gap-4 rounded-2xl bg-sky-500 px-5 py-5 text-left font-bold text-sky-950 transition active:scale-[0.98]"
	>
		<svg class="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" />
		</svg>
		<span>
			Generate workout
			<span class="block text-xs font-medium text-sky-900/80">Auto-built from your progress</span>
		</span>
	</button>
</form>

<div class="mt-3 grid grid-cols-2 gap-3">
	<form method="POST" action="?/start" use:enhance>
		<input type="hidden" name="kind" value="lifting" />
		<button
			class="flex w-full flex-col items-start gap-2 rounded-2xl bg-zinc-800 px-5 py-4 text-left font-semibold transition active:scale-[0.98]"
		>
			<svg class="h-6 w-6 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
				<path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" />
			</svg>
			Empty workout
		</button>
	</form>
	<form method="POST" action="?/start" use:enhance>
		<input type="hidden" name="kind" value="conditioning" />
		<button
			class="flex w-full flex-col items-start gap-2 rounded-2xl bg-zinc-800 px-5 py-4 text-left font-semibold transition active:scale-[0.98]"
		>
			<svg class="h-6 w-6 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-2 5 5 0 0 1 9 2c-2 4.5-9 9-9 9z" />
			</svg>
			Conditioning
		</button>
	</form>
</div>

<div class="mt-3 grid grid-cols-2 gap-3">
	<a href="/body" class="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
		<div class="text-xs text-zinc-500">Bodyweight</div>
		<div class="mt-1 text-xl font-bold">
			{#if latestBw}{latestBw.weightLb}<span class="text-sm font-normal text-zinc-500"> lb</span>{:else}<span class="text-sm font-normal text-zinc-500">Log it →</span>{/if}
		</div>
	</a>
	<a href="/history" class="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4">
		<div class="text-xs text-zinc-500">Sessions</div>
		<div class="mt-1 text-xl font-bold">
			{recent.length}<span class="text-sm font-normal text-zinc-500"> recent</span>
		</div>
	</a>
</div>

<h2 class="mt-8 mb-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase">Recent</h2>
{#if recent.length === 0}
	<p class="rounded-2xl border border-dashed border-zinc-800 px-5 py-8 text-center text-sm text-zinc-500">
		No workouts yet. Hit <span class="font-semibold text-zinc-300">Start Lifting</span> to log your first one.
	</p>
{:else}
	<ul class="flex flex-col gap-2">
		{#each recent as w (w.id)}
			<li>
				<a
					href="/workout/{w.id}"
					class="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
				>
					<div>
						<div class="font-semibold">{w.label ?? (w.kind === 'conditioning' ? 'Conditioning' : 'Lifting')}</div>
						<div class="text-xs text-zinc-500">{fmtDate(w.date)}</div>
					</div>
					<div class="text-right text-xs text-zinc-400">
						{#if w.status === 'in_progress'}
							<span class="rounded bg-amber-500/20 px-2 py-0.5 font-semibold text-amber-400">active</span>
						{:else}
							<div>{w.sets} sets</div>
							{#if w.volume > 0}<div class="text-zinc-600">{Math.round(w.volume).toLocaleString()} lb vol</div>{/if}
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
