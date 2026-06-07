Update `AuthorBadge.tsx` so that the level badge (Lv.X) is hidden when the author name is `"운영진"`. This ensures notice posts authored by "운영진" only display the award icon (e.g. crown), not the level badge.

**Technical detail**
In `src/components/AuthorBadge.tsx`, change the `hasLevel` rendering condition from:
```tsx
{hasLevel && ( ... )}
```
to:
```tsx
{hasLevel && author !== "운영진" && ( ... )}
```
This is a one-line conditional change with no other file modifications required.