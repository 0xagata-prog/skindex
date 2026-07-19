# SkinDex theme publishing standard

This contract applies equally to community, merchant, partner, and SkinDex Lab themes. A source type may change attribution or licensing, but it must not change the catalog card layout.

## Catalog card contract

- Preview: landscape image, 16:9 recommended, at least 960×540px, accepted aspect ratio 1.45:1–1.9:1.
- Name: 2–64 characters and rendered in a fixed two-line slot.
- Author: 2–60 characters.
- Description: at most 180 characters and rendered in a fixed three-line slot.
- Tags: at most four unique tags, each at most 16 characters, rendered in one row.
- Status: one top-right compatibility pill only.
- Action: one `打开主题` button anchored to the card bottom.
- Attribution: source and author must remain traceable; merchant placement does not remove source or license information.

Generated-theme uploads are rejected before review when their identity, preview dimensions, or aspect ratio fails this contract. Approved generated themes are normalized again at publication. Repository submissions enter curation but cannot bypass the same publication contract.

## Runtime and capability declaration

Every new submission declares one engine (`dream-skin`, `skindex-native`, or `other`), at least one implemented capability, and whether it was verified in a real Codex window. Complete skins and lightweight color themes are separate catalog classes. A Dream Skin submission may enter curation after approval, but it must never be auto-published as a `codex-theme-v1` color manifest.

## Catalog scale contract

- The public API returns at most 24 themes per page.
- Search and filters run in D1 before pagination; the browser never downloads the full catalog to filter it.
- Page, search, and filter state remain shareable in the URL.
- Desktop displays page numbers. Narrow screens display compact previous/next controls and the current page count.
- Requests beyond the final page are clamped to the final available page.
