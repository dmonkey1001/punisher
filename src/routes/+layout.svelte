<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';

	let { children, data } = $props();

	const user = $derived(data.user);
	const path = $derived(page.url.pathname);
	// Hide chrome on the profile picker.
	const showChrome = $derived(!!user && path !== '/');

	const tabs = [
		{ href: '/home', label: 'Today', icon: 'home' },
		{ href: '/progress', label: 'Progress', icon: 'chart' },
		{ href: '/history', label: 'History', icon: 'history' },
		{ href: '/body', label: 'Body', icon: 'body' },
		{ href: '/inventory', label: 'Gear', icon: 'gear' }
	];

	function isActive(href: string): boolean {
		if (href === '/home') return path === '/home';
		return path.startsWith(href);
	}

	// Results/dashboard pages use the full width; logging & settings stay narrow.
	const wide = $derived(path.startsWith('/progress') || path.startsWith('/history'));

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase();
	}
</script>

{#snippet icon(name: string)}
	<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		{#if name === 'home'}
			<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
		{:else if name === 'chart'}
			<path d="M4 19V5M4 19h16M8 16l3-4 3 2 4-6" />
		{:else if name === 'history'}
			<path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 8v4l3 2" />
		{:else if name === 'body'}
			<circle cx="12" cy="5" r="2.5" /><path d="M12 8v8" /><path d="M8 11h8" /><path d="M9 21l3-5 3 5" />
		{:else if name === 'gear'}
			<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6.3 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.5 6.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11 3.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9z" />
		{/if}
	</svg>
{/snippet}

<div class="flex min-h-dvh flex-col">
	{#if showChrome && user}
		<header
			class="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur"
			style="padding-top: calc(env(safe-area-inset-top) + 0.85rem)"
		>
			<div class="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pb-3">
				<a href="/home" class="flex items-center gap-2 text-lg font-black tracking-tight text-zinc-100">
					<Logo size={26} class="text-sky-500" />
					<span>PUNISHER<span class="text-zinc-600">.</span></span>
				</a>

				<!-- Desktop nav -->
				<nav class="hidden items-center gap-1 md:flex">
					{#each tabs as tab (tab.href)}
						<a
							href={tab.href}
							class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive(tab.href)
								? 'bg-zinc-800/70 text-sky-400'
								: 'text-zinc-400 hover:text-zinc-200'}"
						>
							{@render icon(tab.icon)}
							{tab.label}
						</a>
					{/each}
				</nav>

				<a href="/" class="flex items-center gap-2" title="Switch profile">
					<span class="hidden text-sm text-zinc-400 sm:inline">{user.name}</span>
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
						style="background-color: {user.color}"
					>
						{initial(user.name)}
					</span>
				</a>
			</div>
		</header>
	{/if}

	<main class="mx-auto w-full flex-1 px-4 pt-5 {wide ? 'max-w-5xl' : 'max-w-2xl'} {showChrome ? 'pb-28 md:pb-12' : 'pb-6'}">
		{@render children()}
	</main>

	<!-- Mobile bottom nav -->
	{#if showChrome}
		<nav
			class="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-xl items-stretch justify-around border-t border-zinc-800/80 bg-zinc-950/90 px-2 pt-2 backdrop-blur md:hidden"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class="flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium transition-colors {isActive(tab.href)
						? 'text-sky-400'
						: 'text-zinc-500'}"
				>
					{@render icon(tab.icon)}
					{tab.label}
				</a>
			{/each}
		</nav>
	{/if}
</div>
