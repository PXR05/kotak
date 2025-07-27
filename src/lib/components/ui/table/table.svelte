<script lang="ts">
	import type { HTMLTableAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		containerRef = $bindable(null),
		...restProps
	}: WithElementRef<HTMLTableAttributes> & {
		containerRef?: HTMLDivElement | null;	
	} = $props();
</script>

<div data-slot="table-container" bind:this={containerRef} class="relative w-full overflow-x-auto">
	<table
		bind:this={ref}
		data-slot="table"
		class={cn("w-full caption-bottom text-sm", className)}
		{...restProps}
	>
		{@render children?.()}
	</table>
</div>
