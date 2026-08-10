<script lang="ts">
	import { page } from '$app/state';
	import { signIn } from '@auth/sveltekit/client';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Footer from '$lib/components/navigation/footer.svelte';
	import { Button } from '$lib/components/ui/button';
	import LoadError from '$lib/components/utility/load-error.svelte';
	import Loader from '$lib/components/utility/loader.svelte';
	import { createApiResource } from '$lib/state/api-resource.svelte';
	import { getApi, postApi } from '$lib/api/client';

	type AccessInvite = {
		id: string;
		invite_type: 'admin' | 'campaign';
		status: 'pending' | 'accepted' | 'revoked' | 'expired';
		accepted_by_user_id: string | null;
		accepted_by_name: string | null;
		created_by_name: string | null;
	};

	const inviteCode = $derived(page.params.code ?? '');
	const sessionUser = $derived(page.data.session?.user ?? null);
	const inviteQuery = createApiResource<AccessInvite | null>(
		async () => (inviteCode ? await getApi(`/access-invites/${inviteCode}`) : null)
	);
	const invite = $derived(inviteQuery.data ?? null);
	const isLoading = $derived(inviteQuery.isLoading);
	const loadError = $derived(inviteQuery.error);

	let accepting = $state(false);
	let acceptError = $state('');

	async function acceptInvite() {
		if (!invite || accepting) return;
		accepting = true;
		acceptError = '';
		try {
			await postApi(`/access-invites/${inviteCode}/accept`, {});
			window.location.href = '/';
		} catch (error) {
			acceptError = error instanceof Error ? error.message : 'Unable to accept invite';
			accepting = false;
		}
	}
</script>

<svelte:head>
	<title>Accept Invite | Daggerlore</title>
	<meta name="description" content="Accept a Daggerlore invite." />
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
	<Loader isLoading={isLoading} />
	<div class="rounded-full border border-accent/40 bg-accent/10 p-4 text-accent">
		<ShieldCheck class="size-8" />
	</div>

	{#if loadError || (!isLoading && !invite)}
		<div class="mt-6 w-full">
			<LoadError />
		</div>
	{:else if invite}
		<h1 class="mt-6 text-3xl font-bold text-foreground">Accept Daggerlore Invite</h1>
		{#if invite.status === 'pending'}
			<p class="mt-3 text-muted-foreground">
				This one-time invite grants access to Daggerlore.
			</p>
			{#if sessionUser}
				{#if acceptError}
					<p class="mt-5 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
						{acceptError}
					</p>
				{/if}
				<Button class="mt-6" disabled={accepting} onclick={acceptInvite}>
					{#if accepting}
						<LoaderCircle class="size-4 animate-spin" />
						Accepting...
					{:else}
						Accept Invite
					{/if}
				</Button>
			{:else}
				<Button class="mt-6" onclick={() => signIn('google', { redirectTo: page.url.pathname })}>
					Sign In to Accept Invite
				</Button>
			{/if}
		{:else if invite.status === 'accepted'}
			<p class="mt-3 text-muted-foreground">
				This invite has already been used{invite.accepted_by_name
					? ` by ${invite.accepted_by_name}`
					: ''}.
			</p>
			<Button href="/" class="mt-6" variant="outline">Back Home</Button>
		{:else if invite.status === 'revoked'}
			<p class="mt-3 text-muted-foreground">This invite has been revoked.</p>
			<Button href="/" class="mt-6" variant="outline">Back Home</Button>
		{:else}
			<p class="mt-3 text-muted-foreground">This invite has expired.</p>
			<Button href="/" class="mt-6" variant="outline">Back Home</Button>
		{/if}
	{/if}
</main>

<Footer />
