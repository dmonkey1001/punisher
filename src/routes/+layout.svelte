<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';

	let { children, data } = $props();

	const user = $derived(data.user);
	const path = $derived(page.url.pathname);
	// Hide chrome on the profile picker.
	const showChrome = $derived(!!user && path !== '/');

	const tabs = [
		{ href: '/home', label: 'Today', icon: 'home' },
		{ href: '/history', label: 'History', icon: 'history' },
		{ href: '/body', label: 'Body', icon: 'body' },
		{ href: '/inventory', label: 'Gear', icon: 'gear' }
	];

	function isActive(href: string): boolean {
		if (href === '/home') return path === '/home';
		return path.startsWith(href);
	}

	function initial(name: string): string {
		return name.trim().charAt(0).toUpperCase();
	}
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
	{#if showChrome && user}
		<header
			class="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 backdrop-blur"
		>
			<a href="/home" class="text-lg font-black tracking-tight">
				PUNISHER<span class="text-zinc-600">.</span>
			</a>
			<a href="/" class="flex items-center gap-2" title="Switch profile">
				<span class="text-sm text-zinc-400">{user.name}</span>
				<span
					class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
					style="background-color: {user.color}"
				>
					{initial(user.name)}
				</span>
			</a>
		</header>
	{/if}

	<main class="flex-1 px-4 pt-4 {showChrome ? 'pb-28' : 'pb-6'}">
		{@render children()}
	</main>

	{#if showChrome}
		<nav
			class="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-xl items-stretch justify-around border-t border-zinc-800/80 bg-zinc-950/90 px-2 pt-2 backdrop-blur"
		>
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					class="flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium transition-colors {isActive(
						tab.href
					)
						? 'text-sky-400'
						: 'text-zinc-500'}"
				>
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						{#if tab.icon === 'home'}
							<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
						{:else if tab.icon === 'history'}
							<path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 8v4l3 2" />
						{:else if tab.icon === 'body'}
							<circle cx="12" cy="5" r="2.5" /><path d="M12 8v8" /><path d="M8 11h8" /><path d="M9 21l3-5 3 5" />
						{:else if tab.icon === 'gear'}
							<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 6.3 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.5 6.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11 3.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9z" />
						{/if}
					</svg>
					{tab.label}
				</a>
			{/each}
		</nav>
	{/if}
</div>
