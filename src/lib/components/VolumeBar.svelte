<script lang="ts">
	let {
		sets,
		mev,
		mav,
		mrv,
		color
	}: { sets: number; mev: number; mav: number; mrv: number; color: string } = $props();

	// Scale so the MRV tick sits a bit inside the track; overflow shows past MRV.
	const scaleMax = $derived(Math.max(mrv, sets) * 1.08 || 1);
	const pct = (v: number) => Math.max(0, Math.min(100, (v / scaleMax) * 100));
</script>

<div class="relative h-2.5 w-full rounded-full bg-zinc-800">
	<!-- current volume fill -->
	<div
		class="absolute inset-y-0 left-0 rounded-full"
		style="width: {pct(sets)}%; background-color: {color}"
	></div>
	<!-- landmark ticks: MEV, MAV, MRV -->
	<span class="absolute top-[-3px] bottom-[-3px] w-px bg-zinc-500/80" style="left: {pct(mev)}%"></span>
	<span class="absolute top-[-3px] bottom-[-3px] w-px bg-zinc-500/80" style="left: {pct(mav)}%"></span>
	<span class="absolute top-[-3px] bottom-[-3px] w-px bg-zinc-400" style="left: {pct(mrv)}%"></span>
</div>
