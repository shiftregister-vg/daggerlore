import { sentrySvelteKit } from '@sentry/sveltekit';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const useDevGateway = process.env.DAGGERLORE_DEV_GATEWAY === 'true';

export default defineConfig({
	server: useDevGateway
		? {
				hmr: {
					clientPort: 8080,
					host: 'localhost',
					protocol: 'ws'
				}
			}
		: undefined,
	plugins: [
		sentrySvelteKit({
			org: '<your-sentry-org>',
			project: '<your-sentry-project>'
		}),
		tailwindcss(),
		enhancedImages(),
		sveltekit()
	]
});
