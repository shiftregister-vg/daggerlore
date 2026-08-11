import { FAQ_ITEMS } from '../../../routes/(app)/faq/faqs';

export const SITE_NAME = 'Daggerlore';
export const SITE_LOCALE = 'en_US';
export const DEFAULT_ROBOTS =
	'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
export const PRIVATE_ROBOTS = 'noindex,nofollow';
export const DEFAULT_OG_IMAGE_PATH = '/favicon.webp';
export const DEFAULT_OG_IMAGE_ALT = 'Daggerlore banner artwork';
export const SITE_DESCRIPTION =
	'Build Daggerheart characters, run campaigns, prep encounters, and create homebrew content with Daggerlore.';
export const CONTACT_EMAIL = 'scribe@daggerlore.com';
export const SITE_LOGO_PATH = '/images/logos/daggerlore.svg';

export type PublicPageDefinition = {
	routeId: string;
	pathname: string;
	title: string;
	description: string;
	summary: string;
	changefreq: 'weekly' | 'monthly';
	priority: string;
	imagePath?: string;
	imageAlt?: string;
};

export const PUBLIC_PAGE_DEFINITIONS = {
	home: {
		routeId: '/(app)',
		pathname: '/',
		title: 'Daggerlore | Digital Character Builder for Daggerheart',
		description: SITE_DESCRIPTION,
		summary:
			'Overview of Daggerlore, including its Daggerheart character builder, campaign tools, encounter builder, homebrew tools, pricing, and roadmap.',
		changefreq: 'weekly',
		priority: '1.0'
	},
	characters: {
		routeId: '/(app)/characters',
		pathname: '/characters',
		title: 'Daggerheart Character Builder | Daggerlore',
		description:
			'Create Daggerheart characters online with interactive sheets, cards, dice rolling, and campaign-ready tools.',
		summary:
			'Public landing page for the Daggerlore character builder with feature highlights, screenshots, and sign-up calls to action.',
		changefreq: 'weekly',
		priority: '0.9'
	},
	campaigns: {
		routeId: '/(app)/campaigns',
		pathname: '/campaigns',
		title: 'Daggerheart Campaign Manager | Daggerlore',
		description:
			'Run Daggerheart campaigns with live dashboards, player management, notes, countdowns, and encounter support.',
		summary:
			'Public landing page for Daggerlore campaign tools, including campaign dashboards, player management, countdowns, and GM workflows.',
		changefreq: 'weekly',
		priority: '0.9'
	},
	encounters: {
		routeId: '/(app)/encounters',
		pathname: '/encounters',
		title: 'Daggerheart Encounter Builder | Daggerlore',
		description:
			'Plan Daggerheart encounters with adversaries, environments, battle point support, and built-in prep notes.',
		summary:
			'Public landing page for the Daggerlore encounter builder with encounter prep workflows and balancing tools for GMs.',
		changefreq: 'weekly',
		priority: '0.8'
	},
	homebrew: {
		routeId: '/(app)/homebrew',
		pathname: '/homebrew',
		title: 'Daggerheart Homebrew Tools | Daggerlore',
		description:
			'Create custom Daggerheart weapons, classes, adversaries, environments, and more with Daggerlore homebrew tools.',
		summary:
			'Public landing page for Daggerlore homebrew tools, covering custom content creation for players and GMs.',
		changefreq: 'weekly',
		priority: '0.8'
	},
	roadmap: {
		routeId: '/(app)/roadmap',
		pathname: '/roadmap',
		title: 'Roadmap | Daggerlore',
		description:
			'See what is next for Daggerlore, from campaign tools and encounter prep to art, content, and future features.',
		summary:
			'Public roadmap for Daggerlore covering shipped features, work in progress, and upcoming plans.',
		changefreq: 'weekly',
		priority: '0.8'
	},
	posts: {
		routeId: '/(app)/posts',
		pathname: '/posts',
		title: 'Posts | Daggerlore',
		description:
			'Read Daggerlore product updates, development notes, and behind-the-screen posts from the app build process.',
		summary:
			'Public posts index for Daggerlore covering updates, design notes, implementation details, and release writeups.',
		changefreq: 'weekly',
		priority: '0.7'
	},
	changelog: {
		routeId: '/(app)/changelog',
		pathname: '/changelog',
		title: 'Changelog | Daggerlore',
		description:
			'Follow shipped updates, product improvements, and notable changes across Daggerlore.',
		summary:
			'Public changelog for Daggerlore with release notes, shipped improvements, and ongoing product updates.',
		changefreq: 'weekly',
		priority: '0.7'
	},
	faq: {
		routeId: '/(app)/faq',
		pathname: '/faq',
		title: 'FAQ | Daggerlore',
		description:
			'Answers to common questions about Daggerlore, including who it is for, what it does, and how pricing works.',
		summary:
			'Public FAQ for Daggerlore covering product capabilities, audience, free access, and upgrade questions.',
		changefreq: 'monthly',
		priority: '0.7'
	},
	contact: {
		routeId: '/(app)/contact',
		pathname: '/contact',
		title: 'Contact | Daggerlore',
		description:
			'Contact Daggerlore for questions, feedback, support, partnerships, or community discussions.',
		summary: 'Public contact page for Daggerlore with email, Discord, and support options.',
		changefreq: 'monthly',
		priority: '0.8',
		imagePath: '/images/me.webp',
		imageAlt: 'Portrait Photo'
	},
	terms: {
		routeId: '/(app)/terms',
		pathname: '/terms',
		title: 'Terms of Service | Daggerlore',
		description:
			'Review the Daggerlore terms for accounts, user-created content, marketplace purchases, Stripe payments, refunds, and platform use.',
		summary:
			'Daggerlore Terms of Service covering user content, marketplace rules, payments, refunds, accounts, compatibility, and platform policies.',
		changefreq: 'monthly',
		priority: '0.5'
	},
	privacy: {
		routeId: '/(app)/privacy',
		pathname: '/privacy',
		title: 'Privacy Policy | Daggerlore',
		description:
			'Learn how Daggerlore collects, uses, shares, and protects information for accounts, user content, marketplace purchases, Stripe payments, and support.',
		summary:
			'Daggerlore Privacy Policy covering account data, user content, marketplace and purchase data, Stripe payments, service providers, retention, and privacy rights.',
		changefreq: 'monthly',
		priority: '0.5'
	}
} as const satisfies Record<string, PublicPageDefinition>;

export const PUBLIC_PAGES = Object.values(PUBLIC_PAGE_DEFINITIONS);
export const PUBLIC_ROUTE_DEFINITIONS = {
	[PUBLIC_PAGE_DEFINITIONS.home.routeId]: PUBLIC_PAGE_DEFINITIONS.home,
	[PUBLIC_PAGE_DEFINITIONS.characters.routeId]: PUBLIC_PAGE_DEFINITIONS.characters,
	[PUBLIC_PAGE_DEFINITIONS.campaigns.routeId]: PUBLIC_PAGE_DEFINITIONS.campaigns,
	[PUBLIC_PAGE_DEFINITIONS.encounters.routeId]: PUBLIC_PAGE_DEFINITIONS.encounters,
	[PUBLIC_PAGE_DEFINITIONS.homebrew.routeId]: PUBLIC_PAGE_DEFINITIONS.homebrew,
	[PUBLIC_PAGE_DEFINITIONS.roadmap.routeId]: PUBLIC_PAGE_DEFINITIONS.roadmap,
	[PUBLIC_PAGE_DEFINITIONS.posts.routeId]: PUBLIC_PAGE_DEFINITIONS.posts,
	[PUBLIC_PAGE_DEFINITIONS.changelog.routeId]: PUBLIC_PAGE_DEFINITIONS.changelog,
	[PUBLIC_PAGE_DEFINITIONS.faq.routeId]: PUBLIC_PAGE_DEFINITIONS.faq,
	[PUBLIC_PAGE_DEFINITIONS.contact.routeId]: PUBLIC_PAGE_DEFINITIONS.contact,
	[PUBLIC_PAGE_DEFINITIONS.terms.routeId]: PUBLIC_PAGE_DEFINITIONS.terms,
	[PUBLIC_PAGE_DEFINITIONS.privacy.routeId]: PUBLIC_PAGE_DEFINITIONS.privacy
} as const;

export type PrivateRouteDefinition = {
	title: string;
	description: string;
	robots: typeof PRIVATE_ROBOTS;
};

export const PRIVATE_ROUTE_DEFINITIONS = {
	'/(app)/profile': {
		title: 'Your Profile | Daggerlore',
		description: 'Manage your Daggerlore account settings and profile details.',
		robots: PRIVATE_ROBOTS
	},
	'/(app)/characters/[id]': {
		title: 'Character Sheet | Daggerlore',
		description: 'View and edit a private Daggerlore character sheet.',
		robots: PRIVATE_ROBOTS
	},
	'/(app)/campaigns/[id]': {
		title: 'Campaign Dashboard | Daggerlore',
		description: 'View and manage a private Daggerlore campaign dashboard.',
		robots: PRIVATE_ROBOTS
	},
	'/(app)/encounters/[id]': {
		title: 'Encounter Builder | Daggerlore',
		description: 'View and edit a private Daggerlore encounter.',
		robots: PRIVATE_ROBOTS
	},
	'/(app)/homebrew/[type]/[uid]': {
		title: 'Homebrew Editor | Daggerlore',
		description: 'View and edit a private Daggerlore homebrew entry.',
		robots: PRIVATE_ROBOTS
	},
	'/(app)/campaigns/join/[uid]': {
		title: 'Campaign Invite | Daggerlore',
		description: 'Join a private Daggerlore campaign from an invite link.',
		robots: PRIVATE_ROBOTS
	}
} as const satisfies Record<string, PrivateRouteDefinition>;

function hasProtocol(value: string) {
	return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);
}

export function normalizePublicOrigin(rawOrigin: string) {
	let trimmedOrigin = rawOrigin.trim();

	if (!trimmedOrigin) {
		trimmedOrigin = 'http://localhost:5173';
	}

	const normalizedInput = hasProtocol(trimmedOrigin)
		? trimmedOrigin
		: /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmedOrigin)
			? `http://${trimmedOrigin}`
			: `https://${trimmedOrigin}`;

	const url = new URL(normalizedInput);
	url.pathname = '';
	url.search = '';
	url.hash = '';

	return url.toString().replace(/\/$/, '');
}

export function createAbsoluteUrl(rawOrigin: string, pathname: string) {
	return new URL(pathname, `${normalizePublicOrigin(rawOrigin)}/`).toString();
}

export type PageSeo = {
	title: string;
	description: string;
	robots: string;
	canonical: string;
	siteName: string;
	locale: string;
	type: 'website' | 'article';
	url: string;
	image: string;
	imageAlt: string;
	article?: {
		publishedTime: string;
		modifiedTime?: string;
		author?: string;
	};
};

function buildPathSeo(
	rawOrigin: string,
	pathname: string,
	title: string,
	description: string,
	options?: {
		robots?: string;
		imagePath?: string;
		imageAlt?: string;
	}
): PageSeo {
	const imagePath = options?.imagePath ?? DEFAULT_OG_IMAGE_PATH;
	const imageAlt = options?.imageAlt ?? DEFAULT_OG_IMAGE_ALT;
	const canonical = createAbsoluteUrl(rawOrigin, pathname);

	return {
		title,
		description,
		robots: options?.robots ?? DEFAULT_ROBOTS,
		canonical,
		siteName: SITE_NAME,
		locale: SITE_LOCALE,
		type: 'website',
		url: canonical,
		image: createAbsoluteUrl(rawOrigin, imagePath),
		imageAlt
	};
}

export function buildPageSeo(
	rawOrigin: string,
	definition: PublicPageDefinition,
	options?: {
		robots?: string;
		imagePath?: string;
		imageAlt?: string;
	}
): PageSeo {
	return buildPathSeo(rawOrigin, definition.pathname, definition.title, definition.description, {
		robots: options?.robots,
		imagePath: options?.imagePath ?? definition.imagePath,
		imageAlt: options?.imageAlt ?? definition.imageAlt
	});
}

export function getPublicPageDefinitionByRouteId(routeId: string | null | undefined) {
	if (!routeId) return null;
	return (
		(PUBLIC_ROUTE_DEFINITIONS[routeId as keyof typeof PUBLIC_ROUTE_DEFINITIONS] as
			PublicPageDefinition | undefined) ?? null
	);
}

export function getPrivateRouteDefinitionByRouteId(routeId: string | null | undefined) {
	if (!routeId) return null;
	return PRIVATE_ROUTE_DEFINITIONS[routeId as keyof typeof PRIVATE_ROUTE_DEFINITIONS] ?? null;
}

export function isPrivateRoute(routeId: string | null | undefined) {
	return Boolean(getPrivateRouteDefinitionByRouteId(routeId));
}

export function buildRouteSeo(
	rawOrigin: string,
	routeId: string | null,
	pathname: string
): PageSeo {
	const publicPage = getPublicPageDefinitionByRouteId(routeId);

	if (publicPage) {
		return buildPathSeo(rawOrigin, pathname, publicPage.title, publicPage.description, {
			imagePath: publicPage.imagePath,
			imageAlt: publicPage.imageAlt
		});
	}

	const privatePage = getPrivateRouteDefinitionByRouteId(routeId);

	if (privatePage) {
		return buildPathSeo(rawOrigin, pathname, privatePage.title, privatePage.description, {
			robots: privatePage.robots
		});
	}

	return buildPathSeo(rawOrigin, pathname, SITE_NAME, SITE_DESCRIPTION);
}

function buildFaqJsonLd(items: readonly { question: string; answer: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer
			}
		}))
	};
}

export function buildRouteJsonLd(rawOrigin: string, routeId: string | null, seo: PageSeo) {
	switch (routeId) {
		case PUBLIC_PAGE_DEFINITIONS.home.routeId:
			return [
				{
					'@context': 'https://schema.org',
					'@type': 'WebSite',
					name: SITE_NAME,
					url: seo.canonical,
					description: seo.description
				},
				{
					'@context': 'https://schema.org',
					'@type': 'Organization',
					name: SITE_NAME,
					url: seo.canonical,
					logo: {
						'@type': 'ImageObject',
						url: createAbsoluteUrl(rawOrigin, SITE_LOGO_PATH)
					},
					email: CONTACT_EMAIL
				},
				{
					'@context': 'https://schema.org',
					'@type': 'SoftwareApplication',
					name: SITE_NAME,
					applicationCategory: 'UtilitiesApplication',
					operatingSystem: 'Web Browser',
					url: seo.canonical,
					description: seo.description,
					offers: {
						'@type': 'Offer',
						price: '0',
						priceCurrency: 'USD'
					}
				},
				buildFaqJsonLd(FAQ_ITEMS)
			];
		case PUBLIC_PAGE_DEFINITIONS.contact.routeId:
			return {
				'@context': 'https://schema.org',
				'@type': 'ContactPage',
				name: 'Contact Daggerlore',
				url: seo.canonical,
				description: seo.description
			};
		case PUBLIC_PAGE_DEFINITIONS.faq.routeId:
			return buildFaqJsonLd(FAQ_ITEMS);
		default:
			return null;
	}
}

export function serializeJsonLd(value: unknown) {
	return JSON.stringify(value).replaceAll('<', '\\u003c');
}
