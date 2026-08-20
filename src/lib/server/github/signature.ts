import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebhookSignature(payload: string, signature: string | null, secret: string) {
	if (!signature?.startsWith('sha256=')) return false;
	const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
	const actualBytes = Buffer.from(signature);
	const expectedBytes = Buffer.from(expected);
	return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
