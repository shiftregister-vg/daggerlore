<script lang="ts">
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Search from '@lucide/svelte/icons/search';
	import Save from '@lucide/svelte/icons/save';
	import GitPullRequest from '@lucide/svelte/icons/git-pull-request';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import LinkIcon from '@lucide/svelte/icons/link';
	import Unlink from '@lucide/svelte/icons/unlink';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Footer from '$lib/components/navigation/footer.svelte';
	import { Button } from '$lib/components/ui/button';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Dialog from '$lib/components/ui/dialog';
	import { deleteApi, getApi, patchApi, postApi } from '$lib/api/client';
	import { buildGitHubIssueDraft, isGitHubEligibleFeedback } from '$lib/feedback/github';
	import type {
		Feedback,
		FeedbackStatus,
		GitHubIntegrationStatus,
		GitHubLabel,
		GitHubReconcileResult
	} from '$lib/types/feedback';
	import { onMount } from 'svelte';

	let feedback = $state<Feedback[]>([]);
	let selected = $state<Feedback | null>(null);
	let query = $state('');
	let statusFilter = $state<FeedbackStatus | 'all'>('all');
	let adminNotes = $state('');
	let status = $state<FeedbackStatus>('new');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let githubStatus = $state<GitHubIntegrationStatus | null>(null);
	let githubLabels = $state<GitHubLabel[]>([]);
	let isGithubBusy = $state(false);
	let issueDialogOpen = $state(false);
	let issueTitle = $state('');
	let issueBody = $state('');
	let issueLabels = $state<string[]>([]);
	let linkDialogOpen = $state(false);
	let linkIssueNumber = $state('');

	const filteredFeedback = $derived(
		feedback.filter((item) => {
			if (statusFilter !== 'all' && item.status !== statusFilter) return false;
			const text =
				`${item.subject} ${item.message} ${item.category} ${item.name ?? ''} ${item.email ?? ''} ${item.user_name ?? ''} ${item.user_email ?? ''}`.toLowerCase();
			return text.includes(query.trim().toLowerCase());
		})
	);
	const newCount = $derived(feedback.filter((item) => item.status === 'new').length);
	const openCount = $derived(
		feedback.filter((item) => item.status === 'new' || item.status === 'reviewing').length
	);
	const hasSelectionChanges = $derived(
		Boolean(selected && (selected.status !== status || (selected.admin_notes ?? '') !== adminNotes))
	);

	function formatDate(value: string | number | null) {
		if (!value) return 'None';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return String(value);
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}

	function reporter(item: Feedback) {
		return item.user_name || item.name || item.user_email || item.email || 'Anonymous';
	}

	function statusClass(value: FeedbackStatus) {
		if (value === 'new') return 'border-orange-500/70 bg-orange-500/15 text-orange-100';
		if (value === 'reviewing') return 'border-accent/70 bg-accent/10 text-accent';
		if (value === 'resolved') return 'border-emerald-500/70 bg-emerald-500/10 text-emerald-100';
		return 'border-muted bg-muted/30 text-muted-foreground';
	}

	function selectFeedback(item: Feedback) {
		selected = item;
		status = item.status;
		adminNotes = item.admin_notes ?? '';
		successMessage = '';
		errorMessage = '';
	}

	function replaceFeedback(updated: Feedback) {
		feedback = feedback.map((item) => (item.id === updated.id ? updated : item));
		selectFeedback(updated);
	}

	async function loadFeedback() {
		isLoading = true;
		errorMessage = '';
		try {
			const selectedId = selected?.id;
			const [loadedFeedback, integration] = await Promise.all([
				getApi<Feedback[]>('/admin/feedback'),
				getApi<GitHubIntegrationStatus>('/admin/github/status')
			]);
			feedback = loadedFeedback;
			githubStatus = integration;
			if (selectedId) {
				selected = feedback.find((item) => item.id === selectedId) ?? null;
				if (selected) {
					status = selected.status;
					adminNotes = selected.admin_notes ?? '';
				}
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load feedback';
		} finally {
			isLoading = false;
		}
	}

	async function saveFeedback() {
		if (!selected || isSaving || !hasSelectionChanges) return;
		isSaving = true;
		errorMessage = '';
		successMessage = '';
		try {
			const updated = await patchApi<Feedback>(`/admin/feedback/${selected.id}`, {
				status,
				admin_notes: adminNotes
			});
			if (selected.github_issue_number != null && selected.status !== updated.status) {
				await loadFeedback();
			} else {
				replaceFeedback(updated);
			}
			successMessage =
				updated.github_sync_status === 'error'
					? 'Feedback saved locally, but GitHub is out of sync.'
					: 'Feedback updated.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to update feedback';
		} finally {
			isSaving = false;
		}
	}

	async function loadGitHubLabels() {
		if (githubLabels.length || !githubStatus?.configured) return;
		githubLabels = await getApi<GitHubLabel[]>('/admin/github/labels');
	}

	async function openIssueDialog() {
		if (!selected || !isGitHubEligibleFeedback(selected)) return;
		const draft = buildGitHubIssueDraft(selected);
		issueTitle = draft.title;
		issueBody = draft.body;
		issueLabels = draft.labels;
		issueDialogOpen = true;
		try {
			await loadGitHubLabels();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load GitHub labels';
		}
	}

	function toggleIssueLabel(label: string) {
		issueLabels = issueLabels.includes(label)
			? issueLabels.filter((value) => value !== label)
			: [...issueLabels, label];
	}

	async function runGitHubAction(action: () => Promise<Feedback>, success: string) {
		if (isGithubBusy) return false;
		isGithubBusy = true;
		errorMessage = '';
		successMessage = '';
		try {
			const updated = await action();
			replaceFeedback(updated);
			successMessage = success;
			return true;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'GitHub operation failed';
			return false;
		} finally {
			isGithubBusy = false;
		}
	}

	async function createGitHubIssue() {
		if (!selected) return;
		const succeeded = await runGitHubAction(
			() =>
				postApi<Feedback>(`/admin/feedback/${selected!.id}/github-issue`, {
					title: issueTitle,
					body: issueBody,
					labels: issueLabels
				}),
			'GitHub issue created.'
		);
		if (succeeded) issueDialogOpen = false;
	}

	async function linkGitHubIssue() {
		if (!selected) return;
		const succeeded = await runGitHubAction(
			() =>
				postApi<Feedback>(`/admin/feedback/${selected!.id}/github-link`, {
					issue_number: Number(linkIssueNumber)
				}),
			'Existing GitHub issue linked.'
		);
		if (succeeded) {
			linkDialogOpen = false;
			linkIssueNumber = '';
		}
	}

	async function refreshGitHubIssue() {
		if (!selected) return;
		const succeeded = await runGitHubAction(
			() => postApi<Feedback>(`/admin/feedback/${selected!.id}/github-refresh`, {}),
			'GitHub issue state refreshed.'
		);
		if (succeeded) await loadFeedback();
	}

	async function retryGitHubSync() {
		if (!selected) return;
		const succeeded = await runGitHubAction(
			() => postApi<Feedback>(`/admin/feedback/${selected!.id}/github-retry`, {}),
			'GitHub synchronization completed.'
		);
		if (succeeded) await loadFeedback();
	}

	async function unlinkGitHubIssue() {
		if (
			!selected ||
			!window.confirm('Unlink this feedback from GitHub? The issue will not be changed.')
		)
			return;
		await runGitHubAction(
			() => deleteApi<Feedback>(`/admin/feedback/${selected!.id}/github-link`),
			'GitHub issue unlinked.'
		);
	}

	async function reconcileGitHubIssues() {
		if (isGithubBusy) return;
		isGithubBusy = true;
		errorMessage = '';
		successMessage = '';
		try {
			const result = await postApi<GitHubReconcileResult>('/admin/feedback/github-reconcile', {});
			await loadFeedback();
			successMessage = `Scanned ${result.scanned} issues; linked ${result.linked} and refreshed ${result.updated}.${
				result.conflicts.length ? ` ${result.conflicts.length} conflict(s) require attention.` : ''
			}`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to reconcile GitHub issues';
		} finally {
			isGithubBusy = false;
		}
	}

	onMount(loadFeedback);
</script>

<svelte:head>
	<title>Feedback Admin | Daggerlore</title>
	<meta name="description" content="Daggerlore feedback administration." />
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col px-6 py-10">
	<section class="border-b border-border/60 pb-8">
		<div class="flex items-center gap-3 text-accent">
			<ShieldCheck class="size-6" />
			<p class="text-sm font-semibold tracking-wide uppercase">Admin</p>
		</div>
		<div class="mt-4 flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Feedback Manager</h1>
				<p class="mt-2 text-sm text-muted-foreground">
					Review feedback submitted through the contact page.
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button
					variant="outline"
					disabled={!githubStatus?.configured || isGithubBusy}
					onclick={reconcileGitHubIssues}
				>
					<RefreshCw class="size-4" />
					{isGithubBusy ? 'Working...' : 'Reconcile GitHub'}
				</Button>
				<Button href="/admin" variant="outline">Dashboard</Button>
			</div>
		</div>
		{#if githubStatus && (!githubStatus.enabled || !githubStatus.configured)}
			<p
				class="mt-4 rounded border border-orange-500/50 bg-orange-500/10 p-3 text-sm text-orange-100"
			>
				GitHub integration is {githubStatus.enabled ? 'misconfigured' : 'disabled'}.
				{githubStatus.error ?? 'Feedback will continue to be stored locally.'}
			</p>
		{:else if githubStatus?.configured && !githubStatus.webhooks_enabled}
			<p class="mt-4 rounded border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
				GitHub outbound actions are enabled. This environment requires manual Refresh to import
				issue status changes.
			</p>
		{/if}
	</section>

	<section class="grid gap-4 py-8 md:grid-cols-3">
		<div class="rounded-lg border border-border/70 bg-card/50 p-5">
			<MessageSquare class="size-5 text-accent" />
			<p class="mt-4 text-3xl font-bold">{feedback.length}</p>
			<p class="text-sm text-muted-foreground">Total submissions</p>
		</div>
		<div class="rounded-lg border border-border/70 bg-card/50 p-5">
			<p class="text-3xl font-bold">{newCount}</p>
			<p class="text-sm text-muted-foreground">New</p>
		</div>
		<div class="rounded-lg border border-border/70 bg-card/50 p-5">
			<p class="text-3xl font-bold">{openCount}</p>
			<p class="text-sm text-muted-foreground">Open</p>
		</div>
	</section>

	{#if errorMessage}
		<p
			class="mb-4 rounded border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive"
		>
			{errorMessage}
		</p>
	{/if}
	{#if successMessage}
		<p
			class="mb-4 rounded border border-emerald-500/60 bg-emerald-500/10 p-3 text-sm text-emerald-100"
		>
			{successMessage}
		</p>
	{/if}

	<section class="grid gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
		<div class="overflow-hidden rounded-lg border border-border/70 bg-card/40">
			<div class="flex flex-wrap items-center gap-3 border-b border-border/70 p-4">
				<div class="relative min-w-64 flex-1">
					<Search class="absolute top-2.5 left-3 size-4 text-muted-foreground" />
					<input
						class="h-10 w-full rounded-md border border-border bg-card pr-3 pl-9 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
						placeholder="Search feedback"
						bind:value={query}
					/>
				</div>
				<select
					class="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
					bind:value={statusFilter}
				>
					<option value="all">All</option>
					<option value="new">New</option>
					<option value="reviewing">Reviewing</option>
					<option value="resolved">Resolved</option>
					<option value="archived">Archived</option>
				</select>
			</div>
			<div class="max-h-[720px] overflow-y-auto p-2">
				{#if isLoading}
					<p class="p-4 text-sm text-muted-foreground">Loading feedback...</p>
				{:else if filteredFeedback.length === 0}
					<p class="p-4 text-sm text-muted-foreground">No feedback found.</p>
				{:else}
					{#each filteredFeedback as item (item.id)}
						<button
							type="button"
							class="w-full rounded-md p-3 text-left hover:bg-muted/40 {selected?.id === item.id
								? 'bg-muted/60'
								: ''}"
							onclick={() => selectFeedback(item)}
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="truncate font-semibold text-foreground">{item.subject}</p>
									<p class="truncate text-sm text-muted-foreground">
										{reporter(item)} / {item.category}
									</p>
								</div>
								<div class="flex shrink-0 flex-col items-end gap-1">
									<span class="rounded-full border px-2 py-0.5 text-xs {statusClass(item.status)}">
										{item.status}
									</span>
									{#if item.github_issue_number != null}
										<span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
											<GitPullRequest class="size-3" /> #{item.github_issue_number}
										</span>
									{:else if item.github_sync_status === 'error'}
										<span class="inline-flex items-center gap-1 text-xs text-destructive">
											<CircleAlert class="size-3" /> sync error
										</span>
									{/if}
								</div>
							</div>
							<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.message}</p>
							<p class="mt-2 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
						</button>
					{/each}
				{/if}
			</div>
		</div>

		<div class="overflow-hidden rounded-lg border border-border/70 bg-card/40">
			<div
				class="flex flex-col gap-4 border-b border-border/70 bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
			>
				<div class="min-w-0">
					<h2 class="text-xl leading-tight font-semibold break-words">
						{selected?.subject ?? 'Select feedback'}
					</h2>
					<p class="mt-1 text-sm break-words text-muted-foreground">
						{selected
							? `${reporter(selected)} / ${formatDate(selected.created_at)}`
							: 'Choose a submission to review.'}
					</p>
				</div>
				<Button
					class="shrink-0 gap-2 self-start"
					disabled={!selected || isSaving || !hasSelectionChanges}
					onclick={saveFeedback}
				>
					<Save class="size-4" />
					{isSaving ? 'Saving...' : 'Save'}
				</Button>
			</div>

			{#if selected}
				<div class="space-y-6 p-5">
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<p class="text-xs font-semibold text-muted-foreground uppercase">Reporter</p>
							<p class="mt-1">{reporter(selected)}</p>
							{#if selected.email || selected.user_email}
								<a
									class="text-sm text-muted-foreground underline hover:text-accent"
									href={`mailto:${selected.email ?? selected.user_email}`}
								>
									{selected.email ?? selected.user_email}
								</a>
							{/if}
						</div>
						<div>
							<p class="text-xs font-semibold text-muted-foreground uppercase">Status</p>
							<select
								class="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/50"
								bind:value={status}
							>
								<option value="new">New</option>
								<option value="reviewing">Reviewing</option>
								<option value="resolved">Resolved</option>
								<option value="archived">Archived</option>
							</select>
						</div>
					</div>

					<div>
						<p class="text-xs font-semibold text-muted-foreground uppercase">Message</p>
						<p
							class="mt-2 rounded-md border border-border bg-background/40 p-4 text-sm whitespace-pre-wrap"
						>
							{selected.message}
						</p>
					</div>

					<div class="grid gap-4 text-sm sm:grid-cols-2">
						<div>
							<p class="text-xs font-semibold text-muted-foreground uppercase">Submitted From</p>
							{#if selected.page_url}
								<a
									class="break-all underline hover:text-accent"
									href={selected.page_url}
									target="_blank"
									rel="noreferrer"
								>
									{selected.page_url}
								</a>
							{:else}
								<p class="text-muted-foreground">None</p>
							{/if}
						</div>
						<div>
							<p class="text-xs font-semibold text-muted-foreground uppercase">Resolved</p>
							<p>{formatDate(selected.resolved_at)}</p>
						</div>
					</div>

					<section class="rounded-md border border-border bg-background/30 p-4">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p
									class="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase"
								>
									<GitPullRequest class="size-4" /> GitHub Issue
								</p>
								{#if selected.github_issue_number != null && selected.github_issue_url}
									<a
										class="mt-2 inline-block font-semibold underline hover:text-accent"
										href={selected.github_issue_url}
										target="_blank"
										rel="noreferrer"
									>
										{selected.github_repository}#{selected.github_issue_number}
									</a>
									<p class="mt-1 text-sm text-muted-foreground">
										{selected.github_issue_state ?? 'unknown'}{selected.github_issue_state_reason
											? ` / ${selected.github_issue_state_reason}`
											: ''}
										· Last synced {formatDate(selected.github_synced_at)}
									</p>
								{:else}
									<p class="mt-2 text-sm text-muted-foreground">No GitHub issue is associated.</p>
								{/if}
							</div>
							<div class="flex flex-wrap gap-2">
								{#if selected.github_issue_number != null}
									<Button
										size="sm"
										variant="outline"
										disabled={isGithubBusy}
										onclick={refreshGitHubIssue}
									>
										<RefreshCw class="size-3.5" /> Refresh
									</Button>
									{#if selected.github_sync_status === 'error'}
										<Button size="sm" disabled={isGithubBusy} onclick={retryGitHubSync}>
											<RefreshCw class="size-3.5" /> Retry Sync
										</Button>
									{/if}
									<Button
										size="sm"
										variant="outline"
										disabled={isGithubBusy}
										onclick={unlinkGitHubIssue}
									>
										<Unlink class="size-3.5" /> Unlink
									</Button>
								{:else if isGitHubEligibleFeedback(selected)}
									<Button
										size="sm"
										disabled={!githubStatus?.configured || isGithubBusy}
										onclick={openIssueDialog}
									>
										<GitPullRequest class="size-3.5" /> Create Issue
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={!githubStatus?.configured || isGithubBusy}
										onclick={() => (linkDialogOpen = true)}
									>
										<LinkIcon class="size-3.5" /> Link Existing
									</Button>
									{#if selected.github_sync_status === 'error'}
										<Button
											size="sm"
											variant="outline"
											disabled={isGithubBusy}
											onclick={retryGitHubSync}
										>
											<RefreshCw class="size-3.5" /> Retry Creation
										</Button>
									{/if}
								{:else}
									<p class="max-w-64 text-sm text-muted-foreground">
										Only bug and feature feedback can be linked to GitHub.
									</p>
								{/if}
							</div>
						</div>
						{#if selected.github_sync_error}
							<p
								class="mt-3 rounded border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive"
							>
								{selected.github_sync_error}
							</p>
						{/if}
					</section>

					<label class="grid gap-2">
						<span class="text-xs font-semibold text-muted-foreground uppercase">Admin Notes</span>
						<Textarea class="min-h-40" bind:value={adminNotes} />
					</label>

					<details class="rounded-md border border-border bg-background/30 p-4 text-sm">
						<summary class="cursor-pointer font-semibold">Technical Context</summary>
						<div class="mt-3 space-y-3 text-muted-foreground">
							<p><span class="font-semibold text-foreground">ID:</span> {selected.id}</p>
							<p>
								<span class="font-semibold text-foreground">User ID:</span>
								{selected.user_id ?? 'None'}
							</p>
							<p class="break-all">
								<span class="font-semibold text-foreground">User Agent:</span>
								{selected.user_agent ?? 'None'}
							</p>
						</div>
					</details>
				</div>
			{:else}
				<p class="p-5 text-sm text-muted-foreground">
					Select a feedback submission from the list to view details and update its status.
				</p>
			{/if}
		</div>
	</section>
</main>

<Dialog.Root bind:open={issueDialogOpen}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Create GitHub Issue</Dialog.Title>
			<Dialog.Description>
				Review the privacy-safe issue content before publishing it to {githubStatus?.repository ??
					'GitHub'}.
			</Dialog.Description>
		</Dialog.Header>
		<form
			class="space-y-4"
			onsubmit={(event) => {
				event.preventDefault();
				createGitHubIssue();
			}}
		>
			<label class="grid gap-2">
				<span class="text-sm font-medium">Title</span>
				<Input bind:value={issueTitle} maxlength={256} />
			</label>
			<label class="grid gap-2">
				<span class="text-sm font-medium">Body</span>
				<Textarea bind:value={issueBody} class="min-h-64 font-mono text-xs" />
			</label>
			<div class="grid gap-2">
				<p class="text-sm font-medium">Labels</p>
				{#if githubLabels.length}
					<div
						class="grid max-h-44 gap-2 overflow-y-auto rounded border border-border p-3 sm:grid-cols-2"
					>
						{#each githubLabels as label (label.name)}
							<label class="flex cursor-pointer items-start gap-2 text-sm">
								<input
									type="checkbox"
									checked={issueLabels.includes(label.name)}
									onchange={() => toggleIssueLabel(label.name)}
								/>
								<span>
									<span class="font-medium">{label.name}</span>
									{#if label.description}
										<span class="block text-xs text-muted-foreground">{label.description}</span>
									{/if}
								</span>
							</label>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No labels loaded.</p>
				{/if}
			</div>
			<Dialog.Footer class="gap-2">
				<Dialog.Close><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
				<Button type="submit" disabled={isGithubBusy || !issueTitle.trim() || !issueBody.trim()}>
					{isGithubBusy ? 'Creating...' : 'Create Issue'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={linkDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Link Existing GitHub Issue</Dialog.Title>
			<Dialog.Description>
				Enter an issue number from {githubStatus?.repository ?? 'the configured repository'}. Its
				current state will replace this feedback status.
			</Dialog.Description>
		</Dialog.Header>
		<form
			class="space-y-4"
			onsubmit={(event) => {
				event.preventDefault();
				linkGitHubIssue();
			}}
		>
			<label class="grid gap-2">
				<span class="text-sm font-medium">Issue number</span>
				<Input type="number" min="1" placeholder="15" bind:value={linkIssueNumber} />
			</label>
			<Dialog.Footer class="gap-2">
				<Dialog.Close><Button type="button" variant="outline">Cancel</Button></Dialog.Close>
				<Button type="submit" disabled={isGithubBusy || Number(linkIssueNumber) < 1}>
					{isGithubBusy ? 'Linking...' : 'Link Issue'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Footer />
