<script lang="ts">
	import type { Id } from '@domain/ids';
	import type {
		Adversary,
		AncestryCard,
		Armor,
		Beastform,
		CharacterClass,
		CommunityCard,
		Consumable,
		Domain,
		DomainCard,
		Environment,
		Loot,
		PrimaryWeapon,
		SecondaryWeapon,
		Subclass,
		Transformation
	} from '@domain/schemas/compendium';
	import { getHomebrewContext } from '$lib/state/homebrew.svelte';
	import { getSourcesContext } from '$lib/state/sources.svelte';
	import { page } from '$app/state';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { beforeNavigate } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import HomebrewPrimaryWeaponForm from '$lib/components/homebrew/forms/primary-weapon/form.svelte';
	import HomebrewSecondaryWeaponForm from '$lib/components/homebrew/forms/secondary-weapon/form.svelte';
	import HomebrewArmorForm from '$lib/components/homebrew/forms/armor/form.svelte';
	import HomebrewAdversaryForm from '$lib/components/homebrew/forms/adversary/form.svelte';
	import HomebrewBeastformForm from '$lib/components/homebrew/forms/beastform/form.svelte';
	import HomebrewLootForm from '$lib/components/homebrew/forms/loot/form.svelte';
	import HomebrewConsumableForm from '$lib/components/homebrew/forms/consumable/form.svelte';
	import HomebrewAncestryCardForm from '$lib/components/homebrew/forms/ancestry-card/form.svelte';
	import HomebrewClassForm from '$lib/components/homebrew/forms/class/form.svelte';
	import HomebrewDomainForm from '$lib/components/homebrew/forms/domain/form.svelte';
	import HomebrewDomainCardForm from '$lib/components/homebrew/forms/domain-card/form.svelte';
	import HomebrewEnvironmentForm from '$lib/components/homebrew/forms/environment/form.svelte';
	import HomebrewCommunityCardForm from '$lib/components/homebrew/forms/community-card/form.svelte';
	import HomebrewSubclassForm from '$lib/components/homebrew/forms/subclass/form.svelte';
	import AncestryCardPreview from '$lib/components/homebrew/previews/ancestry-card-preview.svelte';
	import ClassPreview from '$lib/components/homebrew/previews/class-preview.svelte';
	import DomainCardPreview from '$lib/components/homebrew/previews/domain-card-preview.svelte';
	import CommunityCardPreview from '$lib/components/homebrew/previews/community-card-preview.svelte';
	import PrimaryWeaponPreview from '$lib/components/homebrew/previews/primary-weapon-preview.svelte';
	import SecondaryWeaponPreview from '$lib/components/homebrew/previews/secondary-weapon-preview.svelte';
	import AdversaryPreview from '$lib/components/homebrew/previews/adversary-preview.svelte';
	import ArmorPreview from '$lib/components/homebrew/previews/armor-preview.svelte';
	import BeastformPreview from '$lib/components/homebrew/previews/beastform-preview.svelte';
	import LootPreview from '$lib/components/homebrew/previews/loot-preview.svelte';
	import ConsumablePreview from '$lib/components/homebrew/previews/consumable-preview.svelte';
	import DomainPreview from '$lib/components/homebrew/previews/domain-preview.svelte';
	import EnvironmentPreview from '$lib/components/homebrew/previews/environment-preview.svelte';
	import SubclassPreview from '$lib/components/homebrew/previews/subclass-preview.svelte';
	import TransformationComponent from '$lib/components/compendium-items/transformation.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { artForge } from '$lib/assets/images';
	import Footer from '$lib/components/navigation/footer.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	type EditableHomebrewType =
		| 'primary-weapon'
		| 'secondary-weapon'
		| 'adversary'
		| 'armor'
		| 'beastform'
		| 'loot'
		| 'consumable'
		| 'class'
		| 'subclass'
		| 'domain'
		| 'environment'
		| 'ancestry-cards'
		| 'domain-cards'
		| 'community-cards'
		| 'transformation';

	type HomebrewItem =
		| {
				type: 'primary-weapon';
				typeName: 'Primary Weapon';
				name: string;
				item: PrimaryWeapon;
		  }
		| {
				type: 'secondary-weapon';
				typeName: 'Secondary Weapon';
				name: string;
				item: SecondaryWeapon;
		  }
		| {
				type: 'adversary';
				typeName: 'Adversary';
				name: string;
				item: Adversary;
		  }
		| {
				type: 'armor';
				typeName: 'Armor';
				name: string;
				item: Armor;
		  }
		| {
				type: 'beastform';
				typeName: 'Beastform';
				name: string;
				item: Beastform;
		  }
		| {
				type: 'loot';
				typeName: 'Loot';
				name: string;
				item: Loot;
		  }
		| {
				type: 'consumable';
				typeName: 'Consumable';
				name: string;
				item: Consumable;
		  }
		| {
				type: 'domain';
				typeName: 'Domain';
				name: string;
				item: Domain;
		  }
		| {
				type: 'environment';
				typeName: 'Environment';
				name: string;
				item: Environment;
		  }
		| {
				type: 'class';
				typeName: 'Class';
				name: string;
				item: CharacterClass;
		  }
		| {
				type: 'subclass';
				typeName: 'Subclass';
				name: string;
				item: Subclass;
		  }
		| {
				type: 'ancestry-cards';
				typeName: 'Ancestry Card';
				name: string;
				item: AncestryCard;
		  }
		| {
				type: 'domain-cards';
				typeName: 'Domain Card';
				name: string;
				item: DomainCard;
		  }
		| {
				type: 'community-cards';
				typeName: 'Community Card';
				name: string;
				item: CommunityCard;
		  }
		| {
				type: 'transformation';
				typeName: 'Transformation';
				name: string;
				item: Transformation;
		  };

	const homebrew = getHomebrewContext();
	const sources = getSourcesContext();

	// Forms and previews merge homebrew with the official compendium (e.g. the Domain list).
	$effect(() => {
		sources.ensureCompendium();
	});

	const typeParam = $derived(page.params.type as EditableHomebrewType | undefined);
	const uidParam = $derived(page.params.uid);
	const migratedFormIds = {
		'primary-weapon': 'homebrew-primary-weapon-form',
		'secondary-weapon': 'homebrew-secondary-weapon-form',
		adversary: 'homebrew-adversary-form',
		armor: 'homebrew-armor-form',
		beastform: 'homebrew-beastform-form',
		loot: 'homebrew-loot-form',
		consumable: 'homebrew-consumable-form',
		environment: 'homebrew-environment-form',
		class: 'homebrew-class-form',
		subclass: 'homebrew-subclass-form',
		'ancestry-cards': 'homebrew-ancestry-card-form',
		'domain-cards': 'homebrew-domain-card-form',
		'community-cards': 'homebrew-community-card-form',
		transformation: 'homebrew-transformation-form',
		domain: 'homebrew-domain-form'
	} as const;

	let homebrewItem: HomebrewItem | null = $state(null);

	$effect(() => {
		if (!typeParam || !uidParam) {
			homebrewItem = null;
			return;
		}

		switch (typeParam) {
			case 'primary-weapon': {
				const primaryWeapon =
					homebrew.compendium?.primary_weapons[uidParam as Id<'primary_weapons'>] ?? null;
				homebrewItem = primaryWeapon
					? {
							type: 'primary-weapon',
							typeName: 'Primary Weapon',
							item: primaryWeapon,
							name: primaryWeapon.title
						}
					: null;
				return;
			}
			case 'secondary-weapon': {
				const secondaryWeapon =
					homebrew.compendium?.secondary_weapons[uidParam as Id<'secondary_weapons'>] ?? null;
				homebrewItem = secondaryWeapon
					? {
							type: 'secondary-weapon',
							typeName: 'Secondary Weapon',
							item: secondaryWeapon,
							name: secondaryWeapon.title
						}
					: null;
				return;
			}
			case 'adversary': {
				const adversary = homebrew.compendium?.adversaries[uidParam as Id<'adversaries'>] ?? null;
				homebrewItem = adversary
					? {
							type: 'adversary',
							typeName: 'Adversary',
							item: adversary,
							name: adversary.title
						}
					: null;
				return;
			}
			case 'armor': {
				const armor = homebrew.compendium?.armor[uidParam as Id<'armor'>] ?? null;
				homebrewItem = armor
					? {
							type: 'armor',
							typeName: 'Armor',
							item: armor,
							name: armor.title
						}
					: null;
				return;
			}
			case 'beastform': {
				const beastform = homebrew.compendium?.beastforms[uidParam as Id<'beastforms'>] ?? null;
				homebrewItem = beastform
					? {
							type: 'beastform',
							typeName: 'Beastform',
							item: beastform,
							name: beastform.title
						}
					: null;
				return;
			}
			case 'loot': {
				const loot = homebrew.compendium?.loot[uidParam as Id<'loot'>] ?? null;
				homebrewItem = loot
					? {
							type: 'loot',
							typeName: 'Loot',
							item: loot,
							name: loot.title
						}
					: null;
				return;
			}
			case 'consumable': {
				const consumable = homebrew.compendium?.consumables[uidParam as Id<'consumables'>] ?? null;
				homebrewItem = consumable
					? {
							type: 'consumable',
							typeName: 'Consumable',
							item: consumable,
							name: consumable.title
						}
					: null;
				return;
			}
			case 'domain': {
				const domain = homebrew.compendium?.domains[uidParam as Id<'domains'>] ?? null;
				homebrewItem = domain
					? {
							type: 'domain',
							typeName: 'Domain',
							item: domain,
							name: domain.title
						}
					: null;
				return;
			}
			case 'environment': {
				const environment =
					homebrew.compendium?.environments[uidParam as Id<'environments'>] ?? null;
				homebrewItem = environment
					? {
							type: 'environment',
							typeName: 'Environment',
							item: environment,
							name: environment.title
						}
					: null;
				return;
			}
			case 'class': {
				const characterClass = homebrew.compendium?.classes[uidParam as Id<'classes'>] ?? null;
				homebrewItem = characterClass
					? {
							type: 'class',
							typeName: 'Class',
							item: characterClass,
							name: characterClass.title
						}
					: null;
				return;
			}
			case 'subclass': {
				const subclass = homebrew.compendium?.subclasses[uidParam as Id<'subclasses'>] ?? null;
				homebrewItem = subclass
					? {
							type: 'subclass',
							typeName: 'Subclass',
							item: subclass,
							name: subclass.title
						}
					: null;
				return;
			}
			case 'ancestry-cards': {
				const ancestryCard =
					homebrew.compendium?.ancestry_cards[uidParam as Id<'ancestry_cards'>] ?? null;
				homebrewItem = ancestryCard
					? {
							type: 'ancestry-cards',
							typeName: 'Ancestry Card',
							item: ancestryCard,
							name: ancestryCard.title
						}
					: null;
				return;
			}
			case 'domain-cards': {
				const domainCard =
					homebrew.compendium?.domain_cards[uidParam as Id<'domain_cards'>] ?? null;
				homebrewItem = domainCard
					? {
							type: 'domain-cards',
							typeName: 'Domain Card',
							item: domainCard,
							name: domainCard.title
						}
					: null;
				return;
			}
			case 'community-cards': {
				const communityCard =
					homebrew.compendium?.community_cards[uidParam as Id<'community_cards'>] ?? null;
				homebrewItem = communityCard
					? {
							type: 'community-cards',
							typeName: 'Community Card',
							item: communityCard,
							name: communityCard.title
						}
					: null;
				return;
			}
			case 'transformation': {
				const transformation =
					homebrew.compendium?.transformations[uidParam as Id<'transformations'>] ?? null;
				homebrewItem = transformation
					? {
							type: 'transformation',
							typeName: 'Transformation',
							item: transformation,
							name: transformation.title
						}
					: null;
				return;
			}
		}
	});

	let hasChanges = $state(false);
	let hasErrors = $state(false);
	let isSaving = $state(false);
	let unsavedPrimaryWeapon: PrimaryWeapon | null = $state(null);
	let unsavedSecondaryWeapon: SecondaryWeapon | null = $state(null);
	let unsavedAdversary: Adversary | null = $state(null);
	let unsavedArmor: Armor | null = $state(null);
	let unsavedBeastform: Beastform | null = $state(null);
	let unsavedLoot: Loot | null = $state(null);
	let unsavedConsumable: Consumable | null = $state(null);
	let unsavedClass: CharacterClass | null = $state(null);
	let unsavedSubclass: Subclass | null = $state(null);
	let unsavedDomain: Domain | null = $state(null);
	let unsavedEnvironment: Environment | null = $state(null);
	let unsavedAncestryCard: AncestryCard | null = $state(null);
	let unsavedDomainCard: DomainCard | null = $state(null);
	let unsavedCommunityCard: CommunityCard | null = $state(null);
	let subclassFormTab = $state<'foundation' | 'specialization' | 'mastery'>('foundation');

	beforeNavigate(({ cancel }) => {
		if (!hasChanges) return;
		if (!confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
			cancel();
		}
	});

	$effect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasChanges) return;
			event.preventDefault();
			event.returnValue = '';
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	const migratedFormId = $derived.by(() => {
		if (!homebrewItem) return undefined;
		return migratedFormIds[homebrewItem.type];
	});
</script>

{#if homebrewItem && uidParam}
	<div class="relative min-h-[calc(100dvh-var(--navbar-height,3.5rem))]">
		<div class="pointer-events-none absolute top-0 right-0 bottom-0 z-0 w-96 overflow-hidden">
			<enhanced:img
				src={artForge}
				alt=""
				fetchpriority="high"
				sizes="384px"
				class="forge-fade h-full max-h-[calc(100dvh-var(--navbar-height,3.5rem))] w-full object-cover object-right"
			/>
		</div>

		<div
			class={cn(
				'relative z-10 flex h-full w-full flex-col items-center justify-start',
				'pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]'
			)}
		>
			<div
				class="sticky top-[calc(var(--navbar-height,3.5rem)-1px)] z-20 w-full bg-background md:top-0"
			>
				<div class="w-full bg-primary/50">
					<div class="relative mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2">
						<div class="flex items-center gap-2 truncate">
							<Button
								href="/homebrew"
								variant="link"
								class="hidden px-0 text-muted-foreground sm:block sm:flex"
							>
								Homebrew
							</Button>
							<ChevronRight class="hidden size-3.5 text-muted-foreground sm:block" />

							<Button href="/homebrew" variant="ghost" size="icon" class="shrink-0 sm:hidden">
								<ChevronLeft class="shrink-0" />
							</Button>

							<p
								class={cn(
									buttonVariants({ variant: 'ghost' }),
									'pointer-events-none -ml-2 truncate px-2'
								)}
							>
								<span class="truncate">{homebrewItem.name || 'Unnamed Homebrew'}</span>
							</p>
						</div>

						<div class="grow"></div>

						<div class="flex">
							{#if hasChanges}
								<Button type="reset" form={migratedFormId} size="sm" class="h-7" variant="link">
									<RotateCcw class="size-3.5" />
									<p>Discard</p>
								</Button>
							{/if}
							<Button
								type="submit"
								form={migratedFormId}
								size="sm"
								class={cn('h-7', hasErrors && 'border border-destructive hover:bg-primary')}
								disabled={!hasChanges || isSaving}
								hidden={!hasChanges && !isSaving}
							>
								{#if isSaving}
									<Loader2 class="size-3.5 animate-spin" />
									Saving...
								{:else}
									Save
								{/if}
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div class="w-full max-w-[calc(min(100%,var(--container-6xl)))] sm:px-4 sm:py-8">
				<div
					class="relative grid grid-cols-1 gap-8 border-accent/10 bg-accent/5 px-2 py-8 sm:gap-6 sm:rounded-3xl sm:border-x sm:px-6 sm:py-6 md:grid-cols-2"
				>
					<div class="min-w-[300px]">
						<p class="mb-4 text-center font-eveleth text-accent">Edit</p>
						<div class="rounded-lg bg-background p-4">
							{#if homebrewItem.type === 'primary-weapon'}
								<HomebrewPrimaryWeaponForm
									itemId={uidParam}
									formId={migratedFormIds['primary-weapon']}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedPrimaryWeapon}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'secondary-weapon'}
								<HomebrewSecondaryWeaponForm
									itemId={uidParam}
									formId={migratedFormIds['secondary-weapon']}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedSecondaryWeapon}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'adversary'}
								<HomebrewAdversaryForm
									itemId={uidParam}
									formId={migratedFormIds.adversary}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedAdversary}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'armor'}
								<HomebrewArmorForm
									itemId={uidParam}
									formId={migratedFormIds.armor}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedArmor}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'beastform'}
								<HomebrewBeastformForm
									itemId={uidParam}
									formId={migratedFormIds.beastform}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedBeastform}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'loot'}
								<HomebrewLootForm
									itemId={uidParam}
									formId={migratedFormIds.loot}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedLoot}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'consumable'}
								<HomebrewConsumableForm
									itemId={uidParam}
									formId={migratedFormIds.consumable}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedConsumable}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'domain'}
								<HomebrewDomainForm
									itemId={uidParam}
									formId={migratedFormIds.domain}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedDomain}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'environment'}
								<HomebrewEnvironmentForm
									itemId={uidParam}
									formId={migratedFormIds.environment}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedEnvironment}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'class'}
								<HomebrewClassForm
									itemId={uidParam}
									formId={migratedFormIds.class}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedClass}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'subclass'}
								<HomebrewSubclassForm
									itemId={uidParam}
									formId={migratedFormIds.subclass}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedSubclass}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									bind:formTab={subclassFormTab}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'ancestry-cards'}
								<HomebrewAncestryCardForm
									itemId={uidParam}
									formId={migratedFormIds['ancestry-cards']}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedAncestryCard}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'domain-cards'}
								<HomebrewDomainCardForm
									itemId={uidParam}
									formId={migratedFormIds['domain-cards']}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedDomainCard}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'community-cards'}
								<HomebrewCommunityCardForm
									itemId={uidParam}
									formId={migratedFormIds['community-cards']}
									bind:item={homebrewItem.item}
									bind:unsavedItem={unsavedCommunityCard}
									bind:hasChanges
									bind:hasErrors
									bind:saving={isSaving}
									onSaveSuccess={() => toast.success('Changes saved')}
									onSaveError={() => toast.error('Failed to save changes')}
								/>
							{:else if homebrewItem.type === 'transformation'}
								<div class="rounded-md border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
									Transformations use the shared compendium entity model and are edited through the compendium manager.
								</div>
							{/if}
						</div>
					</div>

					<div class="grid min-w-0">
						<div class="min-w-0 flex-1">
							<div class="sticky top-17">
								<p class="mb-4 text-center font-eveleth text-accent">Preview</p>
								<div class="flex flex-col items-center gap-4">
									{#if homebrewItem.type === 'primary-weapon'}
										<PrimaryWeaponPreview weapon={unsavedPrimaryWeapon || homebrewItem.item} />
									{:else if homebrewItem.type === 'secondary-weapon'}
										<SecondaryWeaponPreview weapon={unsavedSecondaryWeapon || homebrewItem.item} />
									{:else if homebrewItem.type === 'adversary'}
										<AdversaryPreview adversary={unsavedAdversary || homebrewItem.item} />
									{:else if homebrewItem.type === 'armor'}
										<ArmorPreview armor={unsavedArmor || homebrewItem.item} />
									{:else if homebrewItem.type === 'beastform'}
										<BeastformPreview
											beastform={unsavedBeastform || homebrewItem.item}
											beastformId={uidParam}
										/>
									{:else if homebrewItem.type === 'loot'}
										<LootPreview loot={unsavedLoot || homebrewItem.item} />
									{:else if homebrewItem.type === 'consumable'}
										<ConsumablePreview consumable={unsavedConsumable || homebrewItem.item} />
									{:else if homebrewItem.type === 'domain'}
										<DomainPreview domain={unsavedDomain || homebrewItem.item} />
									{:else if homebrewItem.type === 'environment'}
										<EnvironmentPreview environment={unsavedEnvironment || homebrewItem.item} />
									{:else if homebrewItem.type === 'class'}
										<ClassPreview characterClass={unsavedClass || homebrewItem.item} />
									{:else if homebrewItem.type === 'subclass'}
										<SubclassPreview
											subclass={unsavedSubclass || homebrewItem.item}
											bind:formTab={subclassFormTab}
										/>
									{:else if homebrewItem.type === 'ancestry-cards'}
										<AncestryCardPreview card={unsavedAncestryCard || homebrewItem.item} />
									{:else if homebrewItem.type === 'domain-cards'}
										<DomainCardPreview card={unsavedDomainCard || homebrewItem.item} />
									{:else if homebrewItem.type === 'community-cards'}
										<CommunityCardPreview card={unsavedCommunityCard || homebrewItem.item} />
									{:else if homebrewItem.type === 'transformation'}
										<TransformationComponent transformation={homebrewItem.item} />
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<Footer />

<style>
	.forge-fade {
		mask-image:
			linear-gradient(to left, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%),
			linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%);
		mask-size: 100% 100%;
		mask-repeat: no-repeat;
		mask-composite: intersect;

		-webkit-mask-image:
			linear-gradient(to left, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%),
			linear-gradient(to bottom, rgba(0, 0, 0, 0.7) 90%, rgba(0, 0, 0, 0) 100%);
		-webkit-mask-size: 100% 100%;
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-composite: destination-in;
	}
</style>
