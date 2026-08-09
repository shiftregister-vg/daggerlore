<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { getUserContext } from '$lib/state/user.svelte';
	import { cn } from '$lib/utils';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	let {
		placeholderImage: placeholderUrl = '/images/art/placeholder-art.webp',
		autoUpload = false,
		cropSquare = false,
		cropSize = 512,
		hasImage = false,
		id,
		alt = 'Image preview',
		onUpload = () => {},
		onSelect = () => {},
		disabled = false,
		class: className = ''
	}: {
		placeholderImage?: string;
		autoUpload?: boolean;
		cropSquare?: boolean;
		cropSize?: number;
		hasImage?: boolean;
		onUpload?: (url: string) => void;
		onSelect?: (file: File) => void;
		id?: string;
		alt?: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	const userContext = getUserContext();

	let previewUrl: string | null = $state(null);
	let fileInput: HTMLInputElement | null = $state(null);
	let pendingFile: File | null = $state(null);
	let uploading = $state(false);
	let cropDialogOpen = $state(false);
	let cropSourceName = $state('avatar.webp');
	let cropSourceImage: HTMLImageElement | null = $state(null);
	let cropLoadError: string | null = $state(null);
	let cropFrame = $state({ x: 32, y: 32, size: 256 });
	let cropImageBounds = $state({ x: 0, y: 0, width: 320, height: 320 });
	let cropInteraction:
		| {
				mode: 'move' | 'resize';
				pointerX: number;
				pointerY: number;
				frame: typeof cropFrame;
		  }
		| null = null;

	const cropViewportSize = 320;
	const minCropFrameSize = 80;

	// method to clear the internal state
	export async function clear() {
		pendingFile = null;
		previewUrl = null;
		cropSourceImage = null;
		cropLoadError = null;
		cropDialogOpen = false;
	}

	// Method to upload the pending file and return the URL
	// This should be called by the parent form on save
	export async function upload() {
		if (!pendingFile || disabled) {
			// No pending file, return current value
			console.error('No file to upload or image uploader is disabled.');
			return;
		}

		uploading = true;

		try {
			// Convert file to base64
			const base64 = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const dataUrl = reader.result as string;
					// Remove the "data:image/...;base64," prefix
					const base64 = dataUrl.split(',')[1];
					resolve(base64);
				};
				reader.onerror = reject;
				reader.readAsDataURL(pendingFile!);
			});

			const newUrl = await userContext.uploadImage({
				data: base64,
				name: pendingFile.name,
				type: pendingFile.type
			});

			// Update the value and clear pending file

			pendingFile = null;
			previewUrl = null;

			onUpload(newUrl);
		} catch (error) {
			console.error('Failed to upload image:', error);
			throw error;
		} finally {
			uploading = false;
		}
	}

	// Default placeholder image if no image URL is set
	const imageUrl = $derived(previewUrl || placeholderUrl);

	function handleSelectedFile(file: File) {
		if (cropSquare) {
			openCropDialogFromFile(file);
			return;
		}

		pendingFile = file;
		onSelect(file);

		// Create preview URL from the file
		const reader = new FileReader();
		reader.onload = () => {
			previewUrl = reader.result as string;
		};
		reader.readAsDataURL(file);

		if (autoUpload) {
			upload().catch((error) => {
				console.error('Failed to upload image:', error);
			});
		}
	}

	function handleUploadButtonClick() {
		if (!cropSquare || !hasImage) {
			fileInput?.click();
			return;
		}

		openCropDialogFromImageUrl(imageUrl, alt || 'avatar');
	}

	function openCropDialogFromFile(file: File) {
		const reader = new FileReader();
		reader.onload = () => {
			openCropDialogFromImageUrl(reader.result as string, file.name);
		};
		reader.readAsDataURL(file);
	}

	function openCropDialogFromImageUrl(url: string, sourceName: string) {
		cropLoadError = null;
		const image = new Image();
		image.onload = () => {
			cropSourceImage = image;
			cropSourceName = sourceName;
			initializeCropFrame(image);
			cropDialogOpen = true;
		};
		image.onerror = () => {
			cropLoadError = 'Unable to load avatar for resizing.';
			fileInput?.click();
		};
		image.src = url;
	}

	function selectNewAvatar() {
		cropDialogOpen = false;
		fileInput?.click();
	}

	async function applyCrop() {
		if (!cropSourceImage) return;

		const canvas = document.createElement('canvas');
		canvas.width = cropSize;
		canvas.height = cropSize;
		drawCroppedImage(canvas, cropSourceImage);

		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) => {
					if (result) resolve(result);
					else reject(new Error('Unable to resize image'));
				},
				'image/webp',
				0.9
			);
		});
		const fileName = cropSourceName.replace(/\.[^.]+$/, '') || 'avatar';
		const file = new File([blob], `${fileName}.webp`, { type: 'image/webp' });

		pendingFile = file;
		previewUrl = canvas.toDataURL('image/webp', 0.9);
		cropDialogOpen = false;
		onSelect(file);

		if (autoUpload) {
			await upload();
		}
	}

	function drawCroppedImage(canvas: HTMLCanvasElement, image: HTMLImageElement) {
		const context = canvas.getContext('2d');
		if (!context) return;

		const scale = image.naturalWidth / cropImageBounds.width;
		const sourceX = (cropFrame.x - cropImageBounds.x) * scale;
		const sourceY = (cropFrame.y - cropImageBounds.y) * scale;
		const sourceSize = cropFrame.size * scale;

		context.clearRect(0, 0, cropSize, cropSize);
		context.drawImage(
			image,
			sourceX,
			sourceY,
			sourceSize,
			sourceSize,
			0,
			0,
			cropSize,
			cropSize
		);
	}

	function initializeCropFrame(image: HTMLImageElement) {
		const imageScale = Math.min(
			cropViewportSize / image.naturalWidth,
			cropViewportSize / image.naturalHeight
		);
		const width = image.naturalWidth * imageScale;
		const height = image.naturalHeight * imageScale;
		const bounds = {
			x: (cropViewportSize - width) / 2,
			y: (cropViewportSize - height) / 2,
			width,
			height
		};
		const size = Math.max(minCropFrameSize, Math.min(width, height) * 0.8);

		cropImageBounds = bounds;
		cropFrame = {
			x: bounds.x + (width - size) / 2,
			y: bounds.y + (height - size) / 2,
			size
		};
	}

	function startCropInteraction(event: PointerEvent, mode: 'move' | 'resize') {
		event.preventDefault();
		event.stopPropagation();

		cropInteraction = {
			mode,
			pointerX: event.clientX,
			pointerY: event.clientY,
			frame: { ...cropFrame }
		};
	}

	function handleCropPointerMove(event: PointerEvent) {
		if (!cropInteraction) return;

		const deltaX = event.clientX - cropInteraction.pointerX;
		const deltaY = event.clientY - cropInteraction.pointerY;

		if (cropInteraction.mode === 'move') {
			cropFrame = clampCropFrame({
				...cropInteraction.frame,
				x: cropInteraction.frame.x + deltaX,
				y: cropInteraction.frame.y + deltaY
			});
			return;
		}

		const maxSize = Math.min(
			cropImageBounds.x + cropImageBounds.width - cropInteraction.frame.x,
			cropImageBounds.y + cropImageBounds.height - cropInteraction.frame.y
		);
		cropFrame = clampCropFrame({
			...cropInteraction.frame,
			size: Math.max(
				minCropFrameSize,
				Math.min(maxSize, cropInteraction.frame.size + Math.max(deltaX, deltaY))
			)
		});
	}

	function stopCropInteraction() {
		cropInteraction = null;
	}

	function clampCropFrame(frame: typeof cropFrame) {
		const size = Math.max(
			minCropFrameSize,
			Math.min(frame.size, cropImageBounds.width, cropImageBounds.height)
		);

		return {
			size,
			x: Math.min(
				Math.max(frame.x, cropImageBounds.x),
				cropImageBounds.x + cropImageBounds.width - size
			),
			y: Math.min(
				Math.max(frame.y, cropImageBounds.y),
				cropImageBounds.y + cropImageBounds.height - size
			)
		};
	}
</script>

<svelte:window onpointermove={handleCropPointerMove} onpointerup={stopCropInteraction} />

<!-- Hidden file input for image upload -->
<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	{disabled}
	onchange={(event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		// Reset the input so the same file can be selected again
		target.value = '';

		handleSelectedFile(file);
	}}
	class={cn(disabled && 'pointer-events-none', 'hidden')}
	{id}
/>

<button
	type="button"
	class={cn(
		'group aspect-square w-full max-w-[200px] cursor-pointer overflow-hidden rounded-lg border-2 p-1 transition-colors hover:border-primary/50 disabled:cursor-not-allowed',
		disabled && 'pointer-events-none',
		className
	)}
	onclick={() => {
		handleUploadButtonClick();
	}}
	disabled={uploading || disabled}
	title={cropSquare && hasImage ? 'Resize avatar' : 'Click to select image'}
>
	{#if uploading}
		<div class="flex h-full w-full items-center justify-center rounded-md bg-muted">
			<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
		</div>
	{:else}
		<img class="h-full w-full rounded-md object-cover" src={imageUrl} {alt} />
	{/if}
</button>

<Dialog.Root bind:open={cropDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Resize Avatar</Dialog.Title>
		</Dialog.Header>

		<div class="grid gap-4">
			{#if cropLoadError}
				<p class="rounded border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
					{cropLoadError}
				</p>
			{/if}

			<div
				class="relative mx-auto aspect-square w-full max-w-80 overflow-hidden rounded-lg border bg-muted"
				style="width: {cropViewportSize}px; max-width: 100%;"
			>
				{#if cropSourceImage}
					<img
						src={cropSourceImage.src}
						alt=""
						class="h-full w-full select-none object-contain"
						draggable="false"
					/>
					<div class="absolute inset-0 bg-black/35"></div>
					<div
						class="absolute cursor-move border-2 border-dashed border-white shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"
						style="left: {cropFrame.x}px; top: {cropFrame.y}px; width: {cropFrame.size}px; height: {cropFrame.size}px;"
						role="presentation"
						onpointerdown={(event) => startCropInteraction(event, 'move')}
					>
						<div class="absolute inset-0 ring-1 ring-black/50"></div>
						<button
							type="button"
							class="absolute right-0 bottom-0 size-5 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-full border-2 border-white bg-primary shadow"
							aria-label="Resize crop area"
							onpointerdown={(event) => startCropInteraction(event, 'resize')}
						></button>
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer class="flex flex-wrap gap-3">
			<Button type="button" variant="link" class="mr-auto px-0" onclick={selectNewAvatar}>
				Select new avatar
			</Button>
			<Button type="button" variant="outline" onclick={() => (cropDialogOpen = false)}>Cancel</Button>
			<Button type="button" onclick={applyCrop}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
