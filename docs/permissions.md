# Permissions Design Intent

This document describes the intended permission model for the app. It is about product and system boundaries, not implementation mechanics.

## Core Principles

- Permissions are enforced server-side.
- The client may hide or show UI affordances, but the server decides access.
- Authenticated users act only as themselves.
- Users should not be able to pass another user's ID to gain access or ownership.
- If a user can read a resource, the app generally treats that as access to the full resource payload unless a feature explicitly defines redaction.

## Users

Users can read their own user profile and app state. They cannot read or edit another user's user record directly.

User records are app-owned state, not public profile documents. They should be updated through product workflows such as creating characters, joining campaigns, or managing homebrew.

## Entitlements

Entitlements gate product limits and paid capabilities. They do not grant general read access to other users' content. Read more about billing in the [billing design doc](./billing.md).

Current paid capabilities are:

- more character capacity
- more homebrew capacity

Feature gates should ask whether the current user has the relevant entitlement. They should not know how that entitlement was purchased or granted. 

## Campaigns

Campaign membership is the main collaboration boundary.

Campaign members can read the campaign. GMs can manage the campaign. Players can participate in the campaign and manage their own participation.

The app currently treats campaign data as shared with all members. Player-facing redaction, such as hiding private GM notes or fear state, should be considered a separate explicit feature rather than assumed.

Invite codes are join secrets. A user with a valid invite code can learn enough about the campaign to decide whether to join.

## Characters

Characters are owned by one user.

Character owners can manage their characters. Campaign members can read characters that are part of their campaign. GMs can edit characters in campaigns they run.

Character assignment inside a campaign and character ownership are related but not identical. Claiming an unclaimed campaign character can transfer real ownership of that character. Unassigning a character from a campaign does not imply ownership should transfer back.

## Shared-character requests

Some card and heritage features change more than one character: granting an ally an extra downtime move, passing them a note, or moving Stress, HP or Hope between two characters. These use requests (`character_requests`) so that every change to a character has its player's consent.

- A request is sent by the player of a character to another active character in the same campaign. The player is the character's owner, and both characters must belong to campaign members. A GM has no say over another player's character here: a GM can read the requests on a character but cannot send, accept, decline or undo them.
- The server tracks consent and progress only. It never edits a character, because every sheet saves its whole character and would overwrite the change. When a request is accepted, each player's own sheet applies its own side through the normal character save, then reports what it applied so the change can be undone exactly.
- Nothing changes until the recipient accepts. If either side cannot apply its change (for example it would mark more Stress than the maximum), the request fails and any side that already applied undoes it.
- Undo needs the other player's confirmation when the request changed their character. A player can undo alone when the other player's character was not touched.
- A player may only act as themselves: the server checks the actor against the request's sender and recipient users on every action, and only for players still in the campaign.

## Homebrew

Homebrew items are owned by one user.

Owners can create, update, and delete their own homebrew. Other users may read homebrew when collaboration makes that content relevant, especially through shared campaign membership.

The campaign homebrew vault controls what a campaign uses. It does not make the GM the owner of another user's underlying homebrew item.

Homebrew read access is intentionally broader than edit access. Sharing a campaign can make homebrew visible, but only ownership grants mutation rights.

## Official Sources

Users have their own unlocked official source set.

When a character is viewed, the app may need to resolve the character owner's available sources so the character can be displayed correctly. This is owner-scoped access, not viewer-scoped access.

## Encounters

Encounters are owner-only unless a future feature explicitly shares them.

Campaign membership may reveal that a campaign references an encounter, but it should not by itself grant access to the encounter contents.

## Future Direction

The preferred long-term identity model is to use internal app user IDs for ownership and permission checks, with auth provider identifiers stored only as lookup metadata.

Until that migration is complete, existing Clerk subject based ownership should be treated as the current app user key.
