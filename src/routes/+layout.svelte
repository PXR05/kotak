<script lang="ts">
	import '../app.css';
	
	let { children } = $props();
</script>

<div class="select-none">
	{@render children()}
</div>
