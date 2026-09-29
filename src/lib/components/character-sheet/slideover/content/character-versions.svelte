<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Dropdown from '$lib/components/utility/dropdown.svelte';
	import { getApi, postApi } from '$lib/api/client';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { toast } from 'svelte-sonner';

	type Version = {
		id: string;
		created_at: string;
		reason: string;
		name: string;
		level: number;
		primary_class_id: string | null;
		ancestry_card_id: string | null;
	};

	const characterCtx = getCharacterContext();

	let open = $state(false);
	let versions = $state<Version[] | undefined>();
	let failed = $state(false);
	let confirming = $state<string | undefined>();
	let restoring = $state(false);

	async function load() {
		failed = false;
		try {
			versions = await getApi<Version[]>(`/characters/${characterCtx.id}/versions`);
		} catch {
			failed = true;
		}
	}

	// Loaded when the section is opened, so an ordinary visit costs nothing.
	$effect(() => {
		if (open && versions === undefined && !failed) void load();
	});

	function describe(version: Version) {
		const when = new Date(version.created_at).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
		const who = [
			`Level ${version.level}`,
			version.primary_class_id ? version.primary_class_id.replaceAll('_', ' ') : 'no class'
		].join(' · ');
		return { when, who };
	}

	async function restore(version: Version) {
		restoring = true;
		try {
			await postApi(`/characters/${characterCtx.id}/versions/${version.id}/restore`, {});
			toast.success('Restored an earlier version', {
				description: 'Reloading your character…'
			});
			// The sheet holds the character it had before, and would save it over the restored one.
			setTimeout(() => window.location.reload(), 800);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Could not restore that version.');
			restoring = false;
		}
	}
</script>

<section class="flex flex-col gap-4">
	<Dropdown title="Restore an earlier version" subtitle="Undo a bad save" class="border" bind:open>
		<div class="flex flex-col gap-3">
			<p class="text-sm text-muted-foreground">
				Your character is saved as it was every so often while you edit it. Restoring one keeps what
				you have now as a version, so you can go back again.
			</p>

			{#if failed}
				<p class="text-sm text-destructive">Couldn't load the earlier versions.</p>
			{:else if versions === undefined}
				<p class="text-sm text-muted-foreground">Loading…</p>
			{:else if versions.length === 0}
				<p class="text-sm text-muted-foreground">
					There are no earlier versions yet. One is kept the first time you change something.
				</p>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each versions as version (version.id)}
						{@const info = describe(version)}
						<li class="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
							<div class="min-w-0">
								<p class="text-sm font-semibold">{info.when}</p>
								<p class="truncate text-xs text-muted-foreground">{info.who}</p>
							</div>
							{#if confirming === version.id}
								<div class="flex shrink-0 gap-2">
									<Button size="sm" disabled={restoring} onclick={() => restore(version)}>
										Restore
									</Button>
									<Button size="sm" variant="outline" onclick={() => (confirming = undefined)}>
										Cancel
									</Button>
								</div>
							{:else}
								<Button size="sm" variant="outline" onclick={() => (confirming = version.id)}>
									Restore…
								</Button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</Dropdown>
</section>
