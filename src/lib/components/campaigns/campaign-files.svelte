<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { getCampaignContext } from '$lib/state/campaign.svelte';
	import type { CampaignFile } from '@domain/schemas/campaigns';
	import { delete_campaign_file, upload_campaign_file } from '$lib/remote/campaign-files.remote';
	import FileText from '@lucide/svelte/icons/file-text';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Upload from '@lucide/svelte/icons/upload';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';

	let { class: className = '' }: { class?: string } = $props();

	const campaignCtx = getCampaignContext();
	const files = $derived(campaignCtx.campaign?.files ?? []);
	let input: HTMLInputElement | null = $state(null);
	let uploading = $state(false);
	let deleting = $state(false);
	let pendingDelete: CampaignFile | null = $state(null);

	function fileUrl(file: CampaignFile) {
		return `/api/usercontent/campaigns/${campaignCtx.id}/${file.id}`;
	}

	function formatSize(size: number) {
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function fileToBase64(file: File) {
		return await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
			reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
			reader.readAsDataURL(file);
		});
	}

	async function upload(file: File) {
		if (!campaignCtx.id || !campaignCtx.campaign || !campaignCtx.isGm) return;
		if (file.size > 10 * 1024 * 1024) {
			toast.error('File size must be 10MB or less');
			return;
		}

		uploading = true;
		try {
			const result = await upload_campaign_file({
				campaignId: campaignCtx.id,
				data: await fileToBase64(file),
				name: file.name,
				type: file.type || (file.name.endsWith('.md') ? 'text/markdown' : 'text/plain')
			});
			if (!result.ok) throw new Error(result.message);
			campaignCtx.campaign = {
				...campaignCtx.campaign,
				files: [...(campaignCtx.campaign.files ?? []), result.data]
			};
			toast.success(`${file.name} shared with the campaign`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Unable to upload file');
		} finally {
			uploading = false;
			if (input) input.value = '';
		}
	}

	async function deleteFile() {
		if (!campaignCtx.id || !campaignCtx.campaign || !pendingDelete) return;
		deleting = true;
		try {
			const result = await delete_campaign_file({
				campaignId: campaignCtx.id,
				fileId: pendingDelete.id
			});
			if (!result.ok) throw new Error(result.message);
			const deletedName = pendingDelete.name;
			campaignCtx.campaign = {
				...campaignCtx.campaign,
				files: (campaignCtx.campaign.files ?? []).filter((file) => file.id !== pendingDelete?.id)
			};
			pendingDelete = null;
			toast.success(`${deletedName} removed`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Unable to delete file');
		} finally {
			deleting = false;
		}
	}
</script>

<section class={cn('rounded-lg border bg-background/70 p-4 shadow-sm', className)}>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="font-eveleth text-lg">Shared Files</h2>
			<p class="text-xs text-muted-foreground">
				Images, PDFs, Markdown, and text for everyone in the campaign.
			</p>
		</div>
		{#if campaignCtx.isGm}
			<input
				bind:this={input}
				type="file"
				class="hidden"
				accept="image/jpeg,image/png,image/gif,image/webp,image/avif,application/pdf,text/plain,text/markdown,.md,.txt"
				onchange={(event) => {
					const file = event.currentTarget.files?.[0];
					if (file) void upload(file);
				}}
			/>
			<Button size="sm" disabled={uploading} onclick={() => input?.click()}>
				{#if uploading}<LoaderCircle class="size-4 animate-spin" />{:else}<Upload
						class="size-4"
					/>{/if}
				{uploading ? 'Uploading…' : 'Share file'}
			</Button>
		{/if}
	</div>

	{#if files.length === 0}
		<div class="mt-4 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
			No files have been shared yet.
		</div>
	{:else}
		<div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each files as file (file.id)}
				<div class="group overflow-hidden rounded-md border bg-card">
					{#if file.content_type.startsWith('image/')}
						<a href={fileUrl(file)} target="_blank" rel="noreferrer">
							<img src={fileUrl(file)} alt={file.name} class="aspect-video w-full object-cover" />
						</a>
					{:else}
						<a
							href={fileUrl(file)}
							target="_blank"
							rel="noreferrer"
							class="grid aspect-video place-items-center bg-primary-muted/30"
						>
							<FileText class="size-12 text-primary" />
						</a>
					{/if}
					<div class="flex items-start gap-2 p-3">
						<a
							href={fileUrl(file)}
							target="_blank"
							rel="noreferrer"
							class="min-w-0 grow hover:underline"
						>
							<p class="truncate text-sm font-semibold">{file.name}</p>
							<p class="text-xs text-muted-foreground">{formatSize(file.size)}</p>
						</a>
						{#if campaignCtx.isGm}
							<Button
								size="icon"
								variant="ghost"
								class="size-8 text-destructive"
								aria-label={`Delete ${file.name}`}
								onclick={() => (pendingDelete = file)}
							>
								<Trash2 class="size-4" />
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<Dialog.Root open={pendingDelete !== null} onOpenChange={(open) => !open && (pendingDelete = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete shared file?</Dialog.Title>
			<Dialog.Description>
				{pendingDelete?.name} will no longer be available to campaign members.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" disabled={deleting} onclick={() => (pendingDelete = null)}
				>Cancel</Button
			>
			<Button variant="destructive" disabled={deleting} onclick={deleteFile}>
				{deleting ? 'Deleting…' : 'Delete'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
