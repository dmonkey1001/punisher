<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();
	const users = $derived(data.users);

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
		<p class="mt-2 text-sm text-zinc-500">Who's training?</p>
	</div>

	<form method="POST" action="?/select" class="flex w-full max-w-sm flex-col gap-4">
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
</div>
