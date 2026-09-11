import time from './time';
import States from './States';
import type { CardDto, State } from './types';

class Card {
  id: number;
  front: string;
  back: string;
  lastRep: number | null = null;
  nextRep: number | null = null;
  easiness: number;
  state: State;
  suspendedUntil: number | null;
  isMismatched: boolean;
  relativeScheduling: number | null;

  constructor(
    id: number,
    front: string,
    back: string,
    lastRep?: number | null,
    nextRep?: number | null,
    easiness?: number,
    state?: State,
    isMismatched?: boolean,
  ) {
    this.id = id;
    this.front = front;
    this.back = back;
    this.relativeScheduling = null;
    this.setSchedule(lastRep ?? null, nextRep ?? null);
    this.easiness = easiness ?? 2.5;
    this.state = state ?? States.NEW;
    this.suspendedUntil = null;
    this.isMismatched = isMismatched ?? defaultIsMismatchedValue(this.state);
  }

  static unserialize(id: number, cardDto: CardDto): Card {
    return new Card(
      id,
      cardDto.ft,
      cardDto.bk,
      cardDto.lr,
      cardDto.nr,
      cardDto.ea,
      cardDto.st,
      cardDto.ms,
    );
  }

  serialize(): CardDto {
    const obj: CardDto = {
      ft: this.front,
      bk: this.back,
      ea: this.easiness,
      st: this.state,
      lr: this.lastRep,
      nr: this.nextRep,
    };
    if (this.isMismatched !== defaultIsMismatchedValue(this.state)) {
      obj.ms = this.isMismatched;
    }
    return obj;
  }

  setSchedule(lastRep: number | null, nextRep: number | null): void {
    this.lastRep = lastRep;
    this.nextRep = nextRep;
    if (lastRep && nextRep) {
      this.relativeScheduling = (time.now() - nextRep) / (nextRep - lastRep);
    } else {
      this.relativeScheduling = null;
    }
  }

  match(): void {
    this.isMismatched = false;
    if (this.state === States.NEW) {
      this.state = States.LEARNING;
    } else {
      this.state = States.KNOWN;
    }
  }

  mismatch(): void {
    this.isMismatched = true;
    if (this.state === States.NEW || this.state === States.LEARNING) {
      this.state = States.NEW;
    } else {
      this.state = States.LAPSE;
    }
  }

  isSuspended(): boolean {
    return this.suspendedUntil != null && this.suspendedUntil > time.now();
  }

  suspend(endSuspension: number): void {
    this.suspendedUntil = endSuspension;
  }

  toString(): string {
    return pad(this.id, 4)
      + '  ' + dateToStr(this.lastRep)
      + '  ' + dateToStr(this.nextRep)
      + '  ' + this.state
      + '  ' + (this.isMismatched ? 'T' : 'F')
      + '  ' + pad(this.front, 15)
      + '  ' + pad(this.back, 15);
  }
}

function dateToStr(date: number | null | undefined): string {
  if (date) {
    return time.formatDate(date);
  } else if (date === null) {
    return '               null';
  } else {
    return typeof date;
  }
}

function pad(v: string | number, length: number): string {
  const padding = '                                                                                               ';
  if (typeof v === 'string') {
    return (v + padding).substr(0, length);
  } else {
    return (padding + v).substr(-length);
  }
}

function defaultIsMismatchedValue(cardState: State): boolean {
  return cardState === States.LAPSE;
}

export default Card;
