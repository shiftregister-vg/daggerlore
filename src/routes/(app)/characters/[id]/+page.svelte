<script lang="ts">
	import CharacterSheet from '$lib/components/character-sheet/character-sheet.svelte';
	import CompendiumUpdatesDialog from '$lib/components/character-sheet/compendium-updates-dialog.svelte';
	import SheetTheme from '$lib/components/character-sheet/sheet-theme.svelte';
	import { CHARACTER_SHEET_BACKGROUNDS } from '$lib/constants/themes';
	import CampaignInfo from '$lib/components/character-sheet/campaign/campaign-section.svelte';
	import DiceLogSheet from '$lib/components/dice/dice-log-sheet.svelte';
	import DiceRecents from '$lib/components/dice/dice-recents.svelte';
	import DiceRoller from '$lib/components/dice/dice-roller.svelte';
	import PreRollDialog from '$lib/components/dice/pre-roll-dialog.svelte';
	import RollResultPanel from '$lib/components/dice/roll-result-panel.svelte';
	import { getCampaignContext } from '$lib/state/campaign.svelte';
	import { getCharacterContext } from '$lib/state/character.svelte';

	const characterCtx = getCharacterContext();
	const campaignCtx = getCampaignContext();
	const character = $derived(characterCtx.character);
	const theme_id = $derived(character?.sheet_appearance?.theme_id);
	const background = $derived.by(() => {
		const backgroundId = character?.sheet_appearance?.background_id;

		if (backgroundId && backgroundId in CHARACTER_SHEET_BACKGROUNDS) {
			return CHARACTER_SHEET_BACKGROUNDS[backgroundId as keyof typeof CHARACTER_SHEET_BACKGROUNDS];
		}

		return undefined;
	});
	const backgroundImage = $derived(background?.image);

	let showDiceLog = $state(false);
</script>

<SheetTheme id={theme_id}>
	<DiceRoller />
	<PreRollDialog />
	<RollResultPanel />
	<CompendiumUpdatesDialog />
	<DiceRecents bind:showDiceLog />
	<DiceLogSheet
		bind:open={showDiceLog}
		campaignId={campaignCtx.id}
		campaignDisplayName={campaignCtx.userMembership?.display_name}
	/>
	{#if character?.campaign_id && character?.settings.show_campaign_info}
		<CampaignInfo />
	{/if}

	<div class="relative flex justify-center bg-background">
		<div
			class="characters-fade-container pointer-events-none absolute right-0 bottom-0 left-0 z-0 h-full w-full overflow-hidden"
		>
			{#if backgroundImage}
				<enhanced:img
					src={backgroundImage}
					alt=""
					fetchpriority="high"
					sizes="100vw"
					class="h-full w-full object-cover object-center opacity-20"
				/>
			{/if}
		</div>

		<CharacterSheet />
	</div>
</SheetTheme>

<style>
	/* .characters-fade-container {
		mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
		-webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
		mask-size: 100% 100%;
		-webkit-mask-size: 100% 100%;
	} */
</style>
