<script lang="ts">
	import { enhance } from '$app/forms';
	import Logo from '$lib/components/Logo.svelte';
	import { PROFILE_COLORS } from '$lib/profile-colors';

	let { data, form } = $props();
	const users = $derived(data.users);

	const firstRun = $derived(users.length === 0);
	let showCreate = $state(false);
	let color = $state(PROFILE_COLORS[0]);

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase();
	}
</script>

<div class="flex min-h-dvh flex-col items-center justify-center gap-10 py-12">
	<div class="flex flex-col items-center text-center">
		<Logo size={52} class="text-sky-500" />
		<h1 class="mt-3 text-4xl font-black tracking-tight">
			PUNISHER<span class="text-sky-500">.</span>
		</h1>
		<p class="mt-2 text-sm text-zinc-500">
			{firstRun ? 'Welcome! Create your first profile to get started.' : "Who's training?"}
		</p>
	</div>

	<div class="flex w-full max-w-sm flex-col gap-4">
		{#if !firstRun}
			<form method="POST" action="?/select" class="flex flex-col gap-4">
				{#each users as u (u.id)}
					<button
						name="userId"
						value={u.id}
						class="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-left transition active:scale-[0.98]"
					>
						<span
							class="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
							style="background-color: {u.color}"
						>
							{initial(u.name)}
						</span>
						<span class="text-xl font-semibold">{u.name}</span>
						<svg
							class="ml-auto h-5 w-5 text-zinc-600"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M9 18l6-6-6-6" />
						</svg>
					</button>
				{/each}
			</form>
		{/if}

		{#if firstRun || showCreate}
			<form
				method="POST"
				action="?/create"
				use:enhance
				class="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
			>
				<label class="flex flex-col gap-1.5">
					<span class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Name</span>
					<input
						name="name"
						required
						maxlength="30"
						placeholder="Your name"
						class="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-lg focus:border-sky-500 focus:outline-none"
					/>
				</label>

				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Color</span>
					<div class="flex flex-wrap gap-2.5">
						{#each PROFILE_COLORS as c (c)}
							<button
								type="button"
								onclick={() => (color = c)}
								aria-label="Pick color {c}"
								class="h-9 w-9 rounded-full transition {color === c
									? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
									: 'opacity-70'}"
								style="background-color: {c}"
							></button>
						{/each}
					</div>
					<input type="hidden" name="color" value={color} />
				</div>

				{#if form?.message}
					<p class="text-sm text-rose-400">{form.message}</p>
				{/if}

				<button class="rounded-xl bg-sky-500 py-3 font-bold text-sky-950 transition active:scale-[0.99]">
					Create profile
				</button>
				{#if !firstRun}
					<button type="button" onclick={() => (showCreate = false)} class="text-sm text-zinc-500">
						Cancel
					</button>
				{/if}
			</form>
		{:else}
			<button
				onclick={() => (showCreate = true)}
				class="rounded-2xl border border-dashed border-zinc-700 py-3 text-sm font-semibold text-zinc-400 transition active:scale-[0.99]"
			>
				+ Add profile
			</button>
		{/if}
	</div>
</div>
