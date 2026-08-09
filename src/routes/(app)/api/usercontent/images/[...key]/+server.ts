import { error } from '@sveltejs/kit';
import {
	getUserContentImage,
	USER_CONTENT_CACHE_CONTROL
} from '$lib/server/usercontent-storage';
import type { RequestHandler } from './$types';

/**
 * User content images (character portraits) are intentionally public.
 * URLs contain user ID + random UUID making them effectively unguessable.
 * This allows easy sharing in campaigns without complex auth flows.
 */
// Serves images from the daggerbrain-usercontent R2 bucket (user-uploaded images)
export const GET: RequestHandler = async ({ params, platform, request }) => {
	const { key } = params;

	if (!key) {
		throw error(400, 'Image key is required');
	}

	// key is an array when using catch-all, join it back to the original path
	const imageKey = Array.isArray(key) ? key.join('/') : key;

	let object;
	try {
		object = await getUserContentImage(platform, imageKey);
	} catch (err) {
		console.error('Failed to fetch user image', err);
		throw error(500, 'Internal server error');
	}

	if (!object) {
		throw error(404, 'Image not found');
	}

	const headers = new Headers();
	headers.set('Cache-Control', object.cacheControl || USER_CONTENT_CACHE_CONTROL);
	headers.set('Vary', 'Accept-Encoding');

	if (object.etag) {
		headers.set('ETag', object.etag);
	}

	if (object.lastModified) {
		headers.set('Last-Modified', object.lastModified);
	}

	if (object.size !== null) {
		headers.set('Content-Length', String(object.size));
	}

	// Set content type from R2 metadata or default to image
	const contentType = object.contentType || 'image/webp';
	headers.set('Content-Type', contentType);

	if (object.etag && request.headers.get('if-none-match') === object.etag) {
		return new Response(null, { status: 304, headers });
	}

	// Return the image as a Response
	return new Response(object.body, { headers });
};
