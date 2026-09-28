<script lang="ts">
	import type { UsageReset } from '@domain/schemas/rules';
	import { USAGE_RESET_CAPTIONS, generateUsageId } from '$lib/state/feature-usage';

	type MutableFeature = {
		title?: string;
		usage?: { id: string; label?: string; max_uses: number; reset: UsageReset };
	};

	let {
		feature = $bindable(),
		siblings = [],
		fallbackId
	}: {
		feature: MutableFeature;
		/** Other features on the same item, so generated ids stay unique. */
		siblings?: MutableFeature[];
		fallbackId: string;
	} = $props();

	const RESETS: UsageReset[] = ['rest', 'long_rest', 'scene', 'session', 'never'];

	function toggle(enabled: boolean) {
		if (!enabled) {
			delete feature.usage;
			return;
		}
		// Generated once; kept afterwards because character state is keyed by it across versions.
		const takenIds = siblings.flatMap((other) =>
			other !== feature && other.usage ? [other.usage.id] : []
		);
		feature.usage = {
			id: generateUsageId(feature.title ?? '', takenIds, fallbackId),
			max_uses: 1,
			reset: 'rest'
		};
	}
</script>

<div class="mt-3 grid gap-3">
	<label class="flex items-center gap-2 text-sm text-muted-foreground">
		<input
			type="checkbox"
			checked={!!feature.usage}
			onchange={(event) => toggle(event.currentTarget.checked)}
		/>
		Limited uses
		{#if feature.usage}
			<code class="text-xs">{feature.usage.id}</code>
		{/if}
	</label>
	{#if feature.usage}
		<div class="grid gap-3 md:grid-cols-3">
			<label class="usage-field">
				<span>Label</span>
				<input
					class="usage-input"
					placeholder="Optional, e.g. Relaxing Song"
					value={feature.usage.label ?? ''}
					oninput={(event) => {
						if (!feature.usage) return;
						const value = event.currentTarget.value;
						feature.usage.label = value.trim() ? value : undefined;
					}}
				/>
			</label>
			<label class="usage-field">
				<span>Uses</span>
				<input
					class="usage-input"
					type="number"
					min="1"
					max="20"
					value={feature.usage.max_uses}
					onchange={(event) => {
						if (!feature.usage) return;
						const value = Math.trunc(Number(event.currentTarget.value) || 1);
						feature.usage.max_uses = Math.max(1, Math.min(20, value));
					}}
				/>
			</label>
			<label class="usage-field">
				<span>Refreshes</span>
				<select class="usage-input" bind:value={feature.usage.reset}>
					{#each RESETS as reset (reset)}
						<option value={reset}>{USAGE_RESET_CAPTIONS[reset]}</option>
					{/each}
				</select>
			</label>
		</div>
	{/if}
</div>

<style>
	.usage-field {
		display: grid;
		gap: 0.375rem;
		font-size: 0.875rem;
	}

	.usage-field span {
		font-weight: 500;
		color: hsl(var(--foreground));
	}

	.usage-input {
		width: 100%;
		height: 2.5rem;
		padding: 0 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid #5a4b78;
		background: #16121f;
		color: #f4f0ff;
		font-size: 0.875rem;
	}
</style>
