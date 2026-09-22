<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import type { LongTermProject } from '@domain/schemas/characters';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const characterCtx = getCharacterContext();
	const character = $derived(characterCtx.character);
	let projectName = $state('');
	let projectGoal = $state(6);

	function addProject() {
		if (!character || !characterCtx.canEdit || !projectName.trim()) return;
		character.long_term_projects = [
			...character.long_term_projects,
			{
				id: crypto.randomUUID(),
				name: projectName.trim(),
				progress: 0,
				goal: Math.max(1, Math.min(20, Math.trunc(projectGoal) || 6))
			}
		];
		projectName = '';
		projectGoal = 6;
	}

	function updateProject(id: string, update: (project: LongTermProject) => LongTermProject) {
		if (!character || !characterCtx.canEdit) return;
		character.long_term_projects = character.long_term_projects.map((project) =>
			project.id === id ? update(project) : project
		);
	}

	function changeProgress(project: LongTermProject, amount: number) {
		updateProject(project.id, (current) => ({
			...current,
			progress: Math.max(0, Math.min(current.goal, current.progress + amount))
		}));
	}

	function removeProject(id: string) {
		if (!character || !characterCtx.canEdit) return;
		character.long_term_projects = character.long_term_projects.filter(
			(project) => project.id !== id
		);
	}
</script>

{#if character}
	<div class="space-y-4 px-4 pb-4">
		{#if characterCtx.canEdit}
			<form
				class="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-[1fr_6rem_auto]"
				onsubmit={(event) => {
					event.preventDefault();
					addProject();
				}}
			>
				<Input
					bind:value={projectName}
					maxlength={100}
					placeholder="New project"
					aria-label="Project name"
				/>
				<Input type="number" min={1} max={20} bind:value={projectGoal} aria-label="Project goal" />
				<Button type="submit" disabled={!projectName.trim()}><Plus class="size-4" /> Add</Button>
			</form>
		{/if}

		{#if character.long_term_projects.length === 0}
			<p class="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
				No long-term projects yet.
			</p>
		{:else}
			<div class="space-y-3">
				{#each character.long_term_projects as project (project.id)}
					<div class="rounded-md border bg-background/60 p-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-semibold">{project.name}</p>
								<p class="text-xs text-muted-foreground">
									{project.progress} of {project.goal} complete
								</p>
							</div>
							{#if characterCtx.canEdit}
								<Button
									size="icon"
									variant="ghost"
									class="size-8 text-destructive"
									aria-label={`Delete ${project.name}`}
									onclick={() => removeProject(project.id)}
								>
									<Trash2 class="size-4" />
								</Button>
							{/if}
						</div>

						<div class="mt-3 flex flex-wrap items-center gap-2">
							{#each Array(project.goal) as _, index (index)}
								<span
									class="size-4 rounded-full border-2 border-primary"
									class:bg-primary={index < project.progress}
									aria-hidden="true"
								></span>
							{/each}
							{#if characterCtx.canEdit}
								<div class="ml-auto flex gap-1">
									<Button
										size="icon"
										variant="outline"
										class="size-8"
										disabled={project.progress === 0}
										aria-label={`Decrease ${project.name} progress`}
										onclick={() => changeProgress(project, -1)}
									>
										<Minus class="size-4" />
									</Button>
									<Button
										size="icon"
										class="size-8"
										disabled={project.progress >= project.goal}
										aria-label={`Increase ${project.name} progress`}
										onclick={() => changeProgress(project, 1)}
									>
										<Plus class="size-4" />
									</Button>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
