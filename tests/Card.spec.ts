import { vi } from 'vitest';
import States from '../src/States';
import Card from '../src/Card';
import type { State } from '../src/types';

type CardFieldValues = {
  id: number;
  front: string;
  back: string;
  lastRep: number;
  nextRep: number;
  easiness: number;
  state: State;
  isMismatched: boolean;
};

describe('Card', () => {

  const fieldValues: CardFieldValues = {
    id: 42,
    front: 'Front',
    back: 'Back',
    lastRep: 1460726972230,
    nextRep: 1460899772230,
    easiness: 3.14,
    state: States.LAPSE,
    isMismatched: true,
  };
  const sampleDto = { ft: 'Front', bk: 'Back', ea: 3.14, st: 4 as State, lr: 1460726972230, nr: 1460899772230 };

  describe('constructor', () => {

    it('should construct an instance with the specified values', () => {
      const card = new Card(
        fieldValues.id,
        fieldValues.front,
        fieldValues.back,
        fieldValues.lastRep,
        fieldValues.nextRep,
        fieldValues.easiness,
        fieldValues.state,
        fieldValues.isMismatched,
      );

      expect(card.id).toBe(fieldValues.id);
      expect(card.front).toBe(fieldValues.front);
      expect(card.back).toBe(fieldValues.back);
      expect(card.lastRep).toBe(fieldValues.lastRep);
      expect(card.nextRep).toBe(fieldValues.nextRep);
      expect(card.easiness).toBe(fieldValues.easiness);
      expect(card.state).toBe(fieldValues.state);
      expect(card.isMismatched).toBe(fieldValues.isMismatched);
    });

    it('should initialize omitted optional parameters with default values', () => {
      const { id, front, back } = fieldValues;
      const card = new Card(id, front, back);

      expect(card.id).toBe(id);
      expect(card.front).toBe(front);
      expect(card.back).toBe(back);
      expect(card.lastRep).toBe(null);
      expect(card.nextRep).toBe(null);
      expect(card.easiness).toBe(2.5);
      expect(card.state).toBe(States.NEW);
      expect(card.isMismatched).toBe(false);
      expect(card.isSuspended()).toBe(false);
    });

    it('should initialize isMismatched according to the card state', () => {
      const baseArgs = [
        fieldValues.id,
        fieldValues.front,
        fieldValues.back,
        fieldValues.lastRep,
        fieldValues.nextRep,
        fieldValues.easiness,
      ] as const;

      expect(new Card(...baseArgs, States.NEW).isMismatched).toBe(false);
      expect(new Card(...baseArgs, States.LEARNING).isMismatched).toBe(false);
      expect(new Card(...baseArgs, States.KNOWN).isMismatched).toBe(false);
      expect(new Card(...baseArgs, States.LAPSE).isMismatched).toBe(true);
    });

  });

  it('should serialize and unserialize instances', () => {
    const dto = new Card(
      fieldValues.id,
      fieldValues.front,
      fieldValues.back,
      fieldValues.lastRep,
      fieldValues.nextRep,
      fieldValues.easiness,
      fieldValues.state,
      fieldValues.isMismatched,
    ).serialize();

    expect(dto.ft).toBe(sampleDto.ft);
    expect(dto.bk).toBe(sampleDto.bk);
    expect(dto.ea).toBe(sampleDto.ea);
    expect(dto.st).toBe(sampleDto.st);
    expect(dto.lr).toBe(sampleDto.lr);
    expect(dto.nr).toBe(sampleDto.nr);

    const card = Card.unserialize(fieldValues.id, dto);

    expect(card.id).toBe(fieldValues.id);
    expect(card.front).toBe(fieldValues.front);
    expect(card.back).toBe(fieldValues.back);
    expect(card.lastRep).toBe(fieldValues.lastRep);
    expect(card.nextRep).toBe(fieldValues.nextRep);
    expect(card.easiness).toBe(fieldValues.easiness);
    expect(card.state).toBe(fieldValues.state);
    expect(card.isMismatched).toBe(fieldValues.isMismatched);
  });

  it('should be rescheduled for reviewing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2016, 1, 1));

    const lastRep = (new Date(2016, 1, 1)).getTime();
    const nextRep = (new Date(2016, 1, 9)).getTime();
    const card = new Card(fieldValues.id, fieldValues.front, fieldValues.back);

    card.setSchedule(lastRep, nextRep);
    expect(card.lastRep).toBe(lastRep);
    expect(card.nextRep).toBe(nextRep);
    expect(card.relativeScheduling).toBe(-1);

    vi.setSystemTime(new Date(2016, 1, 5));
    card.setSchedule(lastRep, nextRep);
    expect(card.relativeScheduling).toBe(-0.5);

    vi.setSystemTime(new Date(2016, 1, 9));
    card.setSchedule(lastRep, nextRep);
    expect(card.relativeScheduling).toBe(0);

    vi.setSystemTime(new Date(2016, 1, 25));
    card.setSchedule(lastRep, nextRep);
    expect(card.relativeScheduling).toBe(2);

    card.setSchedule(null, null);
    expect(card.relativeScheduling).toBe(null);

    vi.useRealTimers();
  });

  it('should update its state when it gets matched', () => {
    const baseArgs = [
      fieldValues.id,
      fieldValues.front,
      fieldValues.back,
      fieldValues.lastRep,
      fieldValues.nextRep,
      fieldValues.easiness,
    ] as const;
    const transitions: Record<State, State> = {
      1: States.LEARNING,
      2: States.KNOWN,
      3: States.KNOWN,
      4: States.KNOWN,
    };

    for (const state of [States.NEW, States.LEARNING, States.KNOWN, States.LAPSE]) {
      const card = new Card(...baseArgs, state);

      card.match();
      expect(card.isMismatched).toBe(false);
      expect(card.state).toBe(transitions[state]);
    }
  });

  it('should update its state when it gets mismatched', () => {
    const baseArgs = [
      fieldValues.id,
      fieldValues.front,
      fieldValues.back,
      fieldValues.lastRep,
      fieldValues.nextRep,
      fieldValues.easiness,
    ] as const;
    const transitions: Record<State, State> = {
      1: States.NEW,
      2: States.NEW,
      3: States.LAPSE,
      4: States.LAPSE,
    };

    for (const state of [States.NEW, States.LEARNING, States.KNOWN, States.LAPSE]) {
      const card = new Card(...baseArgs, state);

      card.mismatch();
      expect(card.isMismatched).toBe(true);
      expect(card.state).toBe(transitions[state]);
    }
  });

  it('should be suspended for a specified amount of time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2015, 10, 21));

    const card = new Card(137, 'abc', 'def');
    const now = Date.now();

    expect(card.isSuspended()).toBe(false);
    card.suspend(now + 100);
    expect(card.isSuspended()).toBe(true);
    vi.advanceTimersByTime(99);
    expect(card.isSuspended()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(card.isSuspended()).toBe(false);

    vi.useRealTimers();
  });

  it('should override toString', () => {
    const card = new Card(
      fieldValues.id,
      fieldValues.front,
      fieldValues.back,
      fieldValues.lastRep,
      fieldValues.nextRep,
      fieldValues.easiness,
      fieldValues.state,
      fieldValues.isMismatched,
    );

    expect(card.toString()).toBe('  42  2016-04-15 13:29:32  2016-04-17 13:29:32  4  T  Front            Back           ');
  });

});
