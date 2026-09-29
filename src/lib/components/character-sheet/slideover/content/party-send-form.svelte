<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Check from '@lucide/svelte/icons/check';
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { getRequestsContext } from '$lib/state/character-requests.svelte';
	import { describeDelta, describeGrant } from '@domain/character-requests';
	import {
		RequestPayloadSchema,
		type RequestDelta,
		type RequestField,
		type RequestGrant,
		type RequestPayload
	} from '@domain/schemas/character-requests';
	import type { PoolEvent } from '@domain/schemas/rules';

	let { onSent }: { onSent?: () => void } = $props();

	const requests = getRequestsContext();

	type Kind = 'extra_move' | 'transfer' | 'note';
	type Side = 'ally' | 'me';
	// direction: 1 marks Stress/HP or gains Hope; -1 clears Stress/HP or spends Hope
	type Row = { field: RequestField; direction: 1 | -1; amount: number };

	const KINDS: { value: Kind; title: string; hint: string; icon: typeof Hourglass }[] = [
		{
			value: 'extra_move',
			title: 'Extra downtime move',
			hint: 'One more move at their next rest',
			icon: Hourglass
		},
		{
			value: 'transfer',
			title: 'Trade Stress, HP or Hope',
			hint: 'Change resources for them, you, or both',
			icon: ArrowLeftRight
		},
		{
			value: 'note',
			title: 'Leave a note',
			hint: 'Something for them to keep, like a favor owed',
			icon: StickyNote
		}
	];
	const KIND_TITLES = Object.fromEntries(KINDS.map((kind) => [kind.value, kind.title])) as Record<
		Kind,
		string
	>;
	const RESOURCES: { field: RequestField; label: string }[] = [
		{ field: 'marked_stress', label: 'Stress' },
		{ field: 'marked_hp', label: 'HP' },
		{ field: 'marked_hope', label: 'Hope' }
	];
	const REST_CHOICES = [
		{ value: 'any', label: 'Either rest' },
		{ value: 'short', label: 'Short rest' },
		{ value: 'long', label: 'Long rest' }
	] as const;
	const RESETS: { value: PoolEvent | ''; label: string }[] = [
		{ value: '', label: 'When they remove it' },
		{ value: 'scene', label: 'End of scene' },
		{ value: 'short_rest', label: 'After a short rest' },
		{ value: 'long_rest', label: 'After a long rest' },
		{ value: 'session_end', label: 'End of session' }
	];

	const fieldClass =
		'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/50';

	let toCharacterId = $state('');
	let kind = $state<Kind>('extra_move');
	let title = $state('');
	let message = $state('');
	let moveRest = $state<'short' | 'long' | 'any'>('any');
	let moveCount = $state(1);
	let noteText = $state('');
	let noteReset = $state<PoolEvent | ''>('');
	let allyRows = $state<Row[]>([]);
	let myRows = $state<Row[]>([]);
	let sending = $state(false);

	// With one ally there is nothing to choose, so they start selected.
	$effect(() => {
		if (!requests.recipients.some((entry) => entry.character_id === toCharacterId)) {
			toCharacterId = requests.recipients[0]?.character_id ?? '';
		}
	});

	const ally = $derived(requests.recipients.find((entry) => entry.character_id === toCharacterId));
	const allyName = $derived(ally?.name ?? 'They');

	function deltasOf(rows: Row[]): RequestDelta[] {
		return rows.map((row) => ({ field: row.field, delta: row.direction * row.amount }));
	}

	function directionLabels(field: RequestField) {
		return field === 'marked_hope' ? { up: 'Gain', down: 'Spend' } : { up: 'Mark', down: 'Clear' };
	}

	function rowsFor(side: Side) {
		return side === 'ally' ? allyRows : myRows;
	}
	function setRows(side: Side, next: Row[]) {
		if (side === 'ally') allyRows = next;
		else myRows = next;
	}
	function addRow(side: Side, field: RequestField) {
		if (rowsFor(side).some((row) => row.field === field)) return;
		// Clearing (or gaining Hope) is the usual first move; it is one tap to flip.
		const direction = field === 'marked_hope' ? 1 : -1;
		setRows(side, [...rowsFor(side), { field, direction, amount: 1 }]);
	}
	function updateRow(side: Side, field: RequestField, changes: Partial<Row>) {
		setRows(
			side,
			rowsFor(side).map((row) => (row.field === field ? { ...row, ...changes } : row))
		);
	}
	function removeRow(side: Side, field: RequestField) {
		setRows(
			side,
			rowsFor(side).filter((row) => row.field !== field)
		);
	}

	const grant = $derived.by((): RequestGrant | undefined => {
		if (kind === 'extra_move') return { kind, rest: moveRest, count: moveCount };
		if (kind === 'note') return { kind, text: noteText, clear_on: noteReset ? [noteReset] : [] };
		return undefined;
	});

	const draft = $derived(
		RequestPayloadSchema.safeParse({
			title: title.trim() || KIND_TITLES[kind],
			message: message.trim() || undefined,
			sender_deltas: kind === 'transfer' ? deltasOf(myRows) : [],
			recipient_deltas: kind === 'transfer' ? deltasOf(allyRows) : [],
			recipient_grant: grant
		})
	);
	const payload = $derived<RequestPayload | undefined>(draft.success ? draft.data : undefined);

	// What is still missing (a gentle hint) or impossible (a warning), in words a player can act on.
	const problem = $derived.by((): { text: string; blocking: boolean } | undefined => {
		if (!ally) return { text: 'Choose who to send this to.', blocking: false };
		if (kind === 'transfer' && allyRows.length === 0 && myRows.length === 0) {
			return { text: 'Add at least one change.', blocking: false };
		}
		if (kind === 'note' && !noteText.trim()) return { text: 'Write the note.', blocking: false };
		if (!draft.success) return { text: draft.error.issues[0]?.message ?? '', blocking: true };
		const blocked = requests.blockedReason({ payload: draft.data }, 'sender');
		return blocked ? { text: blocked, blocking: true } : undefined;
	});

	async function submit() {
		if (!payload || problem || sending) return;
		sending = true;
		try {
			if (await requests.send(toCharacterId, payload)) {
				title = '';
				message = '';
				noteText = '';
				allyRows = [];
				myRows = [];
				moveCount = 1;
				onSent?.();
			}
		} finally {
			sending = false;
		}
	}
</script>

{#snippet stepper(
	value: number,
	min: number,
	max: number,
	label: string,
	onChange: (next: number) => void
)}
	<div class="inline-flex items-center rounded-md border" role="group" aria-label={label}>
		<button
			type="button"
			class="flex size-9 items-center justify-center rounded-l-md hover:bg-muted disabled:opacity-40"
			aria-label="Decrease {label}"
			disabled={value <= min}
			onclick={() => onChange(value - 1)}
		>
			<Minus class="size-4" />
		</button>
		<span class="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite"
			>{value}</span
		>
		<button
			type="button"
			class="flex size-9 items-center justify-center rounded-r-md hover:bg-muted disabled:opacity-40"
			aria-label="Increase {label}"
			disabled={value >= max}
			onclick={() => onChange(value + 1)}
		>
			<Plus class="size-4" />
		</button>
	</div>
{/snippet}

{#snippet choiceButtons(
	label: string,
	options: readonly { value: string; label: string }[],
	current: string,
	onPick: (value: string) => void
)}
	<div class="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
		{#each options as option (option.value)}
			<button
				type="button"
				role="radio"
				aria-checked={current === option.value}
				class={cn(
					'rounded-full border px-3 py-1.5 text-sm transition-colors',
					current === option.value
						? 'border-primary bg-primary/15 font-semibold text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'
				)}
				onclick={() => onPick(option.value)}
			>
				{option.label}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet changeEditor(side: Side, owner: string)}
	{@const rows = rowsFor(side)}
	<div class="flex flex-col gap-3 rounded-md border p-3">
		<p class="text-sm font-semibold">{owner}</p>

		{#if rows.length === 0}
			<p class="text-sm text-muted-foreground">No change yet. Add one below.</p>
		{/if}

		{#each rows as row (row.field)}
			{@const labels = directionLabels(row.field)}
			{@const resource = RESOURCES.find((entry) => entry.field === row.field)}
			<div class="flex flex-col gap-2 rounded-md bg-muted/40 p-3">
				<div class="flex items-center justify-between gap-2">
					<p class="text-sm font-semibold">
						{describeDelta({ field: row.field, delta: row.direction * row.amount })}
					</p>
					<button
						type="button"
						class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
						aria-label="Remove {resource?.label} change for {owner}"
						onclick={() => removeRow(side, row.field)}
					>
						<Trash2 class="size-4" />
					</button>
				</div>
				<div class="flex flex-wrap items-center gap-3">
					{@render choiceButtons(
						`${resource?.label} direction`,
						[
							{ value: '-1', label: labels.down },
							{ value: '1', label: labels.up }
						],
						String(row.direction),
						(value) => updateRow(side, row.field, { direction: value === '1' ? 1 : -1 })
					)}
					{@render stepper(row.amount, 1, 12, `${resource?.label} amount`, (next) =>
						updateRow(side, row.field, { amount: next })
					)}
				</div>
			</div>
		{/each}

		{#if rows.length < RESOURCES.length}
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs text-muted-foreground">Add</span>
				{#each RESOURCES.filter((resource) => !rows.some((row) => row.field === resource.field)) as resource (resource.field)}
					<Button variant="outline" size="sm" onclick={() => addRow(side, resource.field)}>
						<Plus class="size-3.5" />
						{resource.label}
					</Button>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<div class="flex flex-col gap-6">
	{#if requests.recipients.length === 0}
		<p class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
			There is nobody to send to yet. Allies appear here once their characters are active in your
			campaign.
		</p>
	{:else}
		<section class="flex flex-col gap-2" aria-labelledby="party-who">
			<h4 id="party-who" class="text-sm font-semibold">1. Who is it for?</h4>
			<Select.Root type="single" bind:value={toCharacterId}>
				<Select.Trigger
					aria-label="Send to"
					class="w-full justify-between rounded-md border-primary bg-primary/10 p-3 text-left data-[size=default]:h-auto"
				>
					<span class="flex flex-col items-start">
						<span class="text-sm font-semibold">{ally?.name ?? 'Choose an ally'}</span>
						{#if ally?.player_name}
							<span class="text-xs text-muted-foreground">{ally.player_name}</span>
						{/if}
					</span>
				</Select.Trigger>
				<Select.Content class="min-w-(--bits-select-anchor-width) rounded-md" align="start">
					{#each requests.recipients as recipient (recipient.character_id)}
						<Select.Item
							value={recipient.character_id}
							label={recipient.name}
							class="items-start py-2.5 pl-3"
						>
							<span class="flex flex-col items-start!">
								<span class="text-sm font-semibold">{recipient.name}</span>
								{#if recipient.player_name}
									<span class="text-xs text-muted-foreground">{recipient.player_name}</span>
								{/if}
							</span>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</section>

		<section class="flex flex-col gap-2" aria-labelledby="party-what">
			<h4 id="party-what" class="text-sm font-semibold">2. What are you sending?</h4>
			<div class="flex flex-col gap-2" role="radiogroup" aria-label="What to send">
				{#each KINDS as option (option.value)}
					{@const selected = kind === option.value}
					<button
						type="button"
						role="radio"
						aria-checked={selected}
						class={cn(
							'flex items-start gap-3 rounded-md border p-3 text-left transition-colors',
							selected ? 'border-primary bg-primary/10' : 'hover:bg-muted/60'
						)}
						onclick={() => (kind = option.value)}
					>
						<option.icon
							class={cn(
								'mt-0.5 size-5 shrink-0',
								selected ? 'text-primary' : 'text-muted-foreground'
							)}
						/>
						<span>
							<span class="block text-sm font-semibold">{option.title}</span>
							<span class="block text-xs text-muted-foreground">{option.hint}</span>
						</span>
					</button>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="party-details">
			<h4 id="party-details" class="text-sm font-semibold">3. Details</h4>

			{#if kind === 'extra_move'}
				<div class="flex flex-col gap-2">
					<p class="text-sm text-muted-foreground">
						{allyName} can take it at their next…
					</p>
					{@render choiceButtons('Which rest', REST_CHOICES, moveRest, (value) => {
						moveRest = value as typeof moveRest;
					})}
				</div>
				<div class="flex items-center justify-between gap-3">
					<p class="text-sm text-muted-foreground">How many extra moves</p>
					{@render stepper(moveCount, 1, 5, 'moves', (next) => (moveCount = next))}
				</div>
			{:else if kind === 'transfer'}
				{@render changeEditor('ally', `${allyName} will…`)}
				{@render changeEditor('me', 'You will…')}
			{:else}
				<label class="flex flex-col gap-1.5">
					<span class="text-sm text-muted-foreground">What should they remember?</span>
					<textarea
						class={cn(fieldClass, 'min-h-24 resize-y')}
						bind:value={noteText}
						maxlength="500"
						placeholder="e.g. Owes me a favor"
					></textarea>
				</label>
				<div class="flex flex-col gap-2">
					<p class="text-sm text-muted-foreground">Take the note away…</p>
					{@render choiceButtons('When the note goes away', RESETS, noteReset, (value) => {
						noteReset = value as typeof noteReset;
					})}
				</div>
			{/if}
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="party-extra">
			<h4 id="party-extra" class="text-sm font-semibold">
				4. Anything to add? <span class="font-normal text-muted-foreground">(optional)</span>
			</h4>
			<label class="flex flex-col gap-1.5">
				<span class="text-xs text-muted-foreground">
					What is it for? Shown as the request's name, e.g. the card you're using.
				</span>
				<input
					class={fieldClass}
					bind:value={title}
					maxlength="80"
					placeholder={KIND_TITLES[kind]}
				/>
			</label>
			<label class="flex flex-col gap-1.5">
				<span class="text-xs text-muted-foreground">A message for {ally ? ally.name : 'them'}</span>
				<input class={fieldClass} bind:value={message} maxlength="500" />
			</label>
		</section>

		<section class="flex flex-col gap-3 rounded-md border bg-muted/30 p-4" aria-label="Summary">
			<p class="text-sm font-semibold">
				{ally ? `If ${ally.name} accepts` : 'If they accept'}
			</p>
			{#if payload}
				<ul class="flex flex-col gap-1.5 text-sm">
					{#each payload.recipient_deltas as delta (delta.field)}
						<li class="flex gap-2">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />
							<span><span class="font-semibold">{allyName}:</span> {describeDelta(delta)}</span>
						</li>
					{/each}
					{#if payload.recipient_grant}
						<li class="flex gap-2">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />
							<span>
								<span class="font-semibold">{allyName}:</span>
								{describeGrant(payload.recipient_grant)}
							</span>
						</li>
					{/if}
					{#each payload.sender_deltas as delta (delta.field)}
						<li class="flex gap-2">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />
							<span><span class="font-semibold">You:</span> {describeDelta(delta)}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted-foreground">Nothing chosen yet.</p>
			{/if}
			<p class="text-xs text-muted-foreground">Nothing changes until they accept.</p>
		</section>

		{#if problem}
			<p
				class={cn(
					'rounded-md border p-3 text-sm',
					problem.blocking
						? 'border-destructive/40 bg-destructive/10 text-destructive'
						: 'text-muted-foreground'
				)}
			>
				{problem.text}
			</p>
		{/if}

		<Button size="lg" disabled={!payload || !!problem || sending} onclick={submit}>
			Send request
		</Button>
	{/if}
</div>
