<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Tabs from '$lib/components/ui/tabs';
	import Button from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import { getCharacterContext } from '$lib/state/character.svelte';
	import { getRequestsContext } from '$lib/state/character-requests.svelte';
	import { describeDelta, describeGrant, STATUS_LABELS } from '@domain/character-requests';
	import type {
		CharacterRequest,
		ReceivedGrant,
		RequestSide,
		RequestStatus
	} from '@domain/schemas/character-requests';
	import PartySendForm from './party-send-form.svelte';

	const characterCtx = getCharacterContext();
	const requests = getRequestsContext();

	// Inbox is everything that involves you; Send is the form. Sending switches you back to the inbox.
	let tab = $state<'inbox' | 'send'>('inbox');

	const OTHER_SIDE: Record<RequestSide, RequestSide> = { sender: 'recipient', recipient: 'sender' };

	const STATUS_STYLES: Record<RequestStatus, string> = {
		pending: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
		accepted: 'border-sky-500/50 bg-sky-500/10 text-sky-200',
		applied: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
		declined: 'text-muted-foreground',
		cancelled: 'text-muted-foreground',
		failed: 'border-destructive/50 bg-destructive/10 text-destructive',
		revert_requested: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
		reverting: 'border-sky-500/50 bg-sky-500/10 text-sky-200',
		reverted: 'text-muted-foreground'
	};

	const received = $derived(characterCtx.character?.received_grants ?? []);
	const attention = $derived(requests.needsAttention);
	const isAttention = (request: CharacterRequest) =>
		attention.some((entry) => entry.id === request.id);

	// Everything else that has not ended, then what has.
	const open = $derived(
		requests.requests.filter(
			(request) =>
				!isAttention(request) &&
				['pending', 'accepted', 'applied', 'revert_requested', 'reverting'].includes(request.status)
		)
	);
	const past = $derived(
		requests.requests.filter((request) =>
			['declined', 'cancelled', 'failed', 'reverted'].includes(request.status)
		)
	);

	function nameOf(request: CharacterRequest, side: RequestSide) {
		return (side === 'sender' ? request.from_name : request.to_name) || 'Someone';
	}

	function lines(request: CharacterRequest, side: RequestSide): string[] {
		const { payload } = request;
		return side === 'sender'
			? payload.sender_deltas.map(describeDelta)
			: [
					...payload.recipient_deltas.map(describeDelta),
					...(payload.recipient_grant ? [describeGrant(payload.recipient_grant)] : [])
				];
	}

	function receivedTitle(entry: ReceivedGrant) {
		return entry.grant.kind === 'note' ? 'Note' : 'Extra downtime move';
	}
	function receivedDetail(entry: ReceivedGrant) {
		return entry.grant.kind === 'note' ? entry.grant.text : describeGrant(entry.grant);
	}
</script>

{#snippet sectionHeading(title: string, count?: number, hint?: string)}
	<div class="flex flex-col gap-0.5">
		<h3 class="flex items-center gap-2 text-base font-bold">
			{title}
			{#if count}
				<span class="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
					{count}
				</span>
			{/if}
		</h3>
		{#if hint}<p class="text-sm text-muted-foreground">{hint}</p>{/if}
	</div>
{/snippet}

{#snippet requestCard(request: CharacterRequest)}
	{@const mine = requests.mySide(request)}
	{@const blocked = mine === 'recipient' ? requests.blockedReason(request, 'recipient') : undefined}
	<div class="flex flex-col gap-3 rounded-lg border p-4">
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				<p class="text-base leading-snug font-semibold text-foreground">{request.payload.title}</p>
				<p class="text-sm text-muted-foreground">
					{nameOf(request, 'sender')} → {nameOf(request, 'recipient')}
				</p>
			</div>
			<span
				class={cn(
					'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium',
					STATUS_STYLES[request.status]
				)}
			>
				{request.status === 'pending' && mine === 'recipient'
					? 'Needs your reply'
					: STATUS_LABELS[request.status]}
			</span>
		</div>

		{#if request.payload.message}
			<p class="text-sm text-muted-foreground italic">“{request.payload.message}”</p>
		{/if}

		<ul class="flex flex-col gap-1 text-sm">
			{#each ['recipient', 'sender'] as const as side (side)}
				{#each lines(request, side) as line (side + line)}
					<li>
						<span class="font-semibold">{mine === side ? 'You' : nameOf(request, side)}:</span>
						<span class="text-muted-foreground">{line}</span>
					</li>
				{/each}
			{/each}
		</ul>

		{#if !mine}
			<p class="text-sm text-muted-foreground">
				You can see this request, but only the players involved can act on it.
			</p>
		{:else if request.status === 'pending' && mine === 'recipient'}
			{#if blocked}<p class="text-sm text-destructive">{blocked}</p>{/if}
			<div class="flex gap-2">
				<Button disabled={!!blocked} onclick={() => requests.accept(request)}>Accept</Button>
				<Button variant="outline" onclick={() => requests.decline(request)}>Decline</Button>
			</div>
		{:else if request.status === 'pending'}
			<Button variant="outline" class="w-fit" onclick={() => requests.cancel(request)}>
				Cancel request
			</Button>
		{:else if request.status === 'applied'}
			<Button variant="outline" class="w-fit" onclick={() => requests.requestUndo(request)}>
				Undo
			</Button>
		{:else if request.status === 'revert_requested' && request.revert_requested_by}
			{#if mine === OTHER_SIDE[request.revert_requested_by]}
				<p class="text-sm font-medium">
					{nameOf(request, request.revert_requested_by)} asks to undo this.
				</p>
				<div class="flex gap-2">
					<Button onclick={() => requests.confirmUndo(request)}>Undo it</Button>
					<Button variant="outline" onclick={() => requests.declineUndo(request)}>Keep it</Button>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">
					Waiting for {nameOf(request, OTHER_SIDE[mine])} to confirm the undo.
				</p>
			{/if}
		{/if}
	</div>
{/snippet}

{#snippet inbox()}
	{@const empty =
		attention.length === 0 && received.length === 0 && open.length === 0 && past.length === 0}
	<div class="flex flex-col gap-10">
		{#if empty}
			<div class="flex flex-col items-start gap-3 rounded-lg border border-dashed p-5">
				<p class="text-base font-semibold">Nothing here yet</p>
				<p class="text-sm text-muted-foreground">
					{#if characterCtx.isOwner}
						Requests you send or receive, and anything an ally gives you, show up here.
					{:else}
						No requests involve this character. Only the character's player can send and answer
						requests.
					{/if}
				</p>
				{#if characterCtx.isOwner}
					<Button variant="outline" onclick={() => (tab = 'send')}>Send something</Button>
				{/if}
			</div>
		{/if}

		{#if attention.length > 0}
			<section class="flex flex-col gap-4">
				{@render sectionHeading('Waiting for you', attention.length)}
				{#each attention as request (request.id)}
					{@render requestCard(request)}
				{/each}
			</section>
		{/if}

		{#if received.length > 0}
			<section class="flex flex-col gap-4">
				{@render sectionHeading(
					'Received',
					received.length,
					'Kept on your sheet until they are used or you remove them.'
				)}
				{#each received as entry (entry.id)}
					<div class="flex items-start justify-between gap-3 rounded-lg border p-4">
						<div class="min-w-0">
							<p class="text-base font-semibold">{receivedTitle(entry)}</p>
							<p class="text-sm text-muted-foreground">
								From {entry.from_name || 'an ally'}
							</p>
							<p class="mt-1 text-sm">{receivedDetail(entry)}</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={!characterCtx.canEdit}
							onclick={() => requests.dismissGrant(entry.id)}
						>
							Remove
						</Button>
					</div>
				{/each}
			</section>
		{/if}

		{#if open.length > 0}
			<section class="flex flex-col gap-4">
				{@render sectionHeading('Requests', open.length)}
				{#each open as request (request.id)}
					{@render requestCard(request)}
				{/each}
			</section>
		{/if}

		{#if past.length > 0}
			<section class="flex flex-col gap-4">
				{@render sectionHeading('Earlier')}
				{#each past as request (request.id)}
					{@render requestCard(request)}
				{/each}
			</section>
		{/if}
	</div>
{/snippet}

<Sheet.Header>
	<Sheet.Title class="flex gap-2">Party</Sheet.Title>
</Sheet.Header>

<div class="flex flex-col gap-6 overflow-y-auto px-5 pb-10">
	{#if !requests.inCampaign}
		<p class="text-sm text-muted-foreground">
			Add this character to a campaign to share grants and resources with your allies.
		</p>
	{:else if characterCtx.isOwner}
		<Tabs.Root bind:value={tab}>
			<Tabs.List class="grid h-11 w-full grid-cols-2 rounded-lg bg-muted p-1">
				<Tabs.Trigger
					value="inbox"
					class="gap-2 text-sm data-[state=active]:border-primary/50 data-[state=active]:bg-primary/15 data-[state=active]:font-semibold data-[state=active]:text-foreground"
				>
					Inbox
					{#if attention.length > 0}
						<span
							class="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground"
							aria-label="{attention.length} waiting for you"
						>
							{attention.length}
						</span>
					{/if}
				</Tabs.Trigger>
				<Tabs.Trigger
					value="send"
					class="text-sm data-[state=active]:border-primary/50 data-[state=active]:bg-primary/15 data-[state=active]:font-semibold data-[state=active]:text-foreground"
					>Send</Tabs.Trigger
				>
			</Tabs.List>

			<Tabs.Content value="inbox" class="mt-6">
				{@render inbox()}
			</Tabs.Content>
			<Tabs.Content value="send" class="mt-6 flex flex-col gap-4">
				{@render sectionHeading(
					'Send to an ally',
					undefined,
					'Nothing changes on their character until they accept.'
				)}
				<PartySendForm onSent={() => (tab = 'inbox')} />
			</Tabs.Content>
		</Tabs.Root>
	{:else}
		{@render inbox()}
	{/if}
</div>
