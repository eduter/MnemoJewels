import type Card from './Card';

class Jewel {
  groupId: number;
  card: Card;
  isFront: boolean;

  constructor(groupId: number, card: Card, isFront: boolean) {
    this.groupId = groupId;
    this.card = card;
    this.isFront = isFront;
  }

  getText(): string {
    return this.isFront ? this.card.front : this.card.back;
  }
}

export default Jewel;
