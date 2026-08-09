import { env } from '$env/dynamic/private';
import type { R2Bucket } from '@cloudflare/workers-types';

type PlatformWithUserContent = {
	env?: {
		R2_USERCONTENT?: R2Bucket;
	};
};

type StoredObject = {
	body: ArrayBuffer;
	contentType: string | null;
	cacheControl: string | null;
	etag: string | null;
	lastModified: string | null;
	size: number | null;
};

const encoder = new TextEncoder();
const service = 's3';
const region = 'auto';
const algorithm = 'AWS4-HMAC-SHA256';
export const USER_CONTENT_CACHE_CONTROL =
	'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable';

export async function putUserContentImage(
	platform: PlatformWithUserContent | undefined,
	key: string,
	body: ArrayBuffer,
	contentType: string
) {
	const binding = platform?.env?.R2_USERCONTENT;
	if (binding) {
		await binding.put(key, body, {
			httpMetadata: {
				contentType,
				cacheControl: USER_CONTENT_CACHE_CONTROL
			}
		});
		return;
	}

	const config = getR2S3Config();
	const url = getR2ObjectUrl(config, key);
	const payloadHash = await sha256Hex(body);
	const headers = await signedR2Headers(config, 'PUT', url, payloadHash, {
		'cache-control': USER_CONTENT_CACHE_CONTROL,
		'content-type': contentType
	});

	const response = await fetch(url, {
		method: 'PUT',
		headers,
		body
	});

	if (!response.ok) {
		throw new Error(`R2 upload failed with status ${response.status}`);
	}
}

export async function getUserContentImage(
	platform: PlatformWithUserContent | undefined,
	key: string
): Promise<StoredObject | null> {
	const binding = platform?.env?.R2_USERCONTENT;
	if (binding) {
		const object = await binding.get(key);
		if (!object) return null;

		return {
			body: await object.arrayBuffer(),
			cacheControl: object.httpMetadata?.cacheControl ?? null,
			contentType: object.httpMetadata?.contentType ?? null,
			etag: object.httpEtag,
			lastModified: object.uploaded.toUTCString(),
			size: object.size
		};
	}

	const config = getR2S3Config();
	const url = getR2ObjectUrl(config, key);
	const payloadHash = await sha256Hex(new Uint8Array());
	const headers = await signedR2Headers(config, 'GET', url, payloadHash);
	const response = await fetch(url, { headers });

	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(`R2 fetch failed with status ${response.status}`);
	}

	return {
		body: await response.arrayBuffer(),
		cacheControl: response.headers.get('cache-control'),
		contentType: response.headers.get('content-type'),
		etag: response.headers.get('etag'),
		lastModified: response.headers.get('last-modified'),
		size: numberHeader(response.headers.get('content-length'))
	};
}

function getR2S3Config() {
	const accountId = env.R2_ACCOUNT_ID;
	const accessKeyId = env.R2_ACCESS_KEY_ID;
	const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
	const bucketName = env.R2_BUCKET_NAME;

	if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
		throw new Error('R2 user content storage is not configured');
	}

	return {
		accountId,
		accessKeyId,
		secretAccessKey,
		bucketName
	};
}

function getR2ObjectUrl(config: ReturnType<typeof getR2S3Config>, key: string) {
	const host = `${config.accountId}.r2.cloudflarestorage.com`;
	return new URL(`/${encodePathPart(config.bucketName)}/${encodeKey(key)}`, `https://${host}`);
}

async function signedR2Headers(
	config: ReturnType<typeof getR2S3Config>,
	method: string,
	url: URL,
	payloadHash: string,
	extraHeaders: Record<string, string> = {}
) {
	const now = new Date();
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const dateStamp = amzDate.slice(0, 8);
	const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
	const host = url.host;
	const headers: Record<string, string> = {
		host,
		'x-amz-content-sha256': payloadHash,
		'x-amz-date': amzDate,
		...extraHeaders
	};
	const signedHeaders = Object.keys(headers).sort().join(';');
	const canonicalHeaders = Object.keys(headers)
		.sort()
		.map((header) => `${header}:${headers[header].trim()}\n`)
		.join('');
	const canonicalRequest = [
		method,
		url.pathname,
		'',
		canonicalHeaders,
		signedHeaders,
		payloadHash
	].join('\n');
	const stringToSign = [
		algorithm,
		amzDate,
		credentialScope,
		await sha256Hex(encoder.encode(canonicalRequest))
	].join('\n');
	const signingKey = await getSignatureKey(config.secretAccessKey, dateStamp);
	const signature = await hmacHex(signingKey, stringToSign);

	return {
		...headers,
		authorization: `${algorithm} Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
	};
}

async function getSignatureKey(secretAccessKey: string, dateStamp: string) {
	const dateKey = await hmacBytes(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
	const dateRegionKey = await hmacBytes(dateKey, region);
	const dateRegionServiceKey = await hmacBytes(dateRegionKey, service);
	return hmacBytes(dateRegionServiceKey, 'aws4_request');
}

async function hmacBytes(key: BufferSource, message: string) {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

async function hmacHex(key: BufferSource, message: string) {
	return toHex(await hmacBytes(key, message));
}

async function sha256Hex(data: BufferSource) {
	return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}

function toHex(bytes: Uint8Array) {
	return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function encodeKey(key: string) {
	return key.split('/').map(encodePathPart).join('/');
}

function encodePathPart(value: string) {
	return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
		`%${char.charCodeAt(0).toString(16).toUpperCase()}`
	);
}

function numberHeader(value: string | null) {
	if (!value) return null;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}
