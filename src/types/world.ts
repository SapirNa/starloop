export interface World {
  id: string;
  name: string;
  description: string;
  order: number;
  // Accent layered on top of the shared dark cosmic theme (see
  // theme/colors.ts) - worlds don't get their own unrelated palette,
  // just a highlight color so each one reads as distinct.
  accentColor: string;
  // False for worlds that exist in the progression architecture but have no
  // level content yet (see data/levels.ts - only world-1 has levels today).
  implemented: boolean;
}
