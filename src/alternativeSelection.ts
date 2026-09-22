export interface CardWords {
  front: string;
  back: string;
}

export function mappedCardsConflict(
  card1: CardWords,
  card2: CardWords,
  mappings: Record<string, string[]>,
): boolean {
  return card1.front === card2.front
    || card1.back === card2.back
    || (mappings[card1.front]?.indexOf(card2.back) ?? -1) >= 0
    || (mappings[card2.front]?.indexOf(card1.back) ?? -1) >= 0;
}
