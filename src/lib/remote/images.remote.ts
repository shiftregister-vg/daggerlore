import { command, getRequestEvent } from '$app/server';
import { putUserContentImage } from '$lib/server/usercontent-storage';
import { z } from 'zod';
import { require_auth, is_failure, ok, fail } from './utils';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_IMAGE_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/bmp',
	'image/tiff'
]);

const imageDataSchema = z
	.object({
		data: z.string(), // base64 encoded image data
		name: z.string(),
		type: z.string()
	})
	.refine(
		(obj) => {
			// Validate size (base64 is ~33% larger than binary)
			const sizeInBytes = (obj.data.length * 3) / 4;
			return sizeInBytes <= MAX_IMAGE_SIZE;
		},
		{
			message: `Image size must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
		}
	)
	.refine((obj) => ALLOWED_IMAGE_MIME_TYPES.has(obj.type), {
		message: 'Unsupported image type'
	});

export const upload_user_image = command(imageDataSchema, async ({ data, name, type }) => {
	const event = getRequestEvent();
	const auth_result = await require_auth(event);
	if (is_failure(auth_result)) {
		return auth_result;
	}

	const { userId } = auth_result.data;

	// Decode base64 to ArrayBuffer
	const binaryString = atob(data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	// Generate a unique key for the image
	const fileExtension = name.split('.').pop() || 'bin';
	const imageKey = `${userId}/${crypto.randomUUID()}.${fileExtension}`;

	try {
		await putUserContentImage(event.platform, imageKey, bytes.buffer, type);
	} catch (error) {
		console.error('Failed to upload user image', error);
		return fail('dependency_unavailable', 'Image storage is not available', 503);
	}

	// Generate the URL for the image
	const url = new URL(`/api/usercontent/images/${imageKey}`, event.url.origin);

	console.log('uploaded user image to R2');
	return ok(url.toString());
});
