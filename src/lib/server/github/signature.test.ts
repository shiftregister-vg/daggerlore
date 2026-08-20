import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from './signature';

describe('GitHub webhook signatures', () => {
	it('accepts GitHub’s published HMAC-SHA256 test vector', () => {
		expect(
			verifyWebhookSignature(
				'Hello, World!',
				'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17',
				"It's a Secret to Everybody"
			)
		).toBe(true);
	});

	it('rejects missing, malformed, and incorrect signatures', () => {
		expect(verifyWebhookSignature('payload', null, 'secret')).toBe(false);
		expect(verifyWebhookSignature('payload', 'sha1=bad', 'secret')).toBe(false);
		expect(verifyWebhookSignature('payload', 'sha256=bad', 'secret')).toBe(false);
	});
});
