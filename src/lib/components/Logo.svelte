<script lang="ts">
	let { size = 28, class: cls = '' }: { size?: number; class?: string } = $props();
</script>

<!-- Dumbbell mark -->
<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="currentColor"
	class={cls}
	aria-hidden="true"
>
	<rect x="0.5" y="6.5" width="3" height="11" rx="1.2" />
	<rect x="4" y="8.5" width="2.6" height="7" rx="1" />
	<rect x="17.4" y="8.5" width="2.6" height="7" rx="1" />
	<rect x="20.5" y="6.5" width="3" height="11" rx="1.2" />
	<rect x="6" y="10.4" width="12" height="3.2" rx="1.6" />
</svg>
