import States from '../src/States';
import Card from '../src/Card';

describe('Card', () => {

    let fieldValues = {
        id: 42,
        front: 'Front',
        back: 'Back',
        lastRep: 1460726972230,
        nextRep: 1460899772230,
        easiness: 3.14,
        state: States.LAPSE,
        isMismatched: true
    };
    let sampleDto = {ft: 'Front', bk: 'Back', ea: 3.14, st: 4, lr: 1460726972230, nr: 1460899772230};

    describe('constructor', () => {

        it('should construct an instance with the specified values', () => {
            let card = new Card(...objectValues(fieldValues));

            for (let field of Object.keys(fieldValues)) {
                expect(card[field]).toBe(fieldValues[field]);
            }
        });

        it('should initialize omitted optional parameters with default values', () => {
            let {id, front, back} = fieldValues;
            let card = new Card(id, front, back);

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
            let values = objectValues(fieldValues).slice(0, -2);

            expect((new Card(...values, States.NEW)).isMismatched).toBe(false);
            expect((new Card(...values, States.LEARNING)).isMismatched).toBe(false);
            expect((new Card(...values, States.KNOWN)).isMismatched).toBe(false);
            expect((new Card(...values, States.LAPSE)).isMismatched).toBe(true);
        });

    });

    it('should serialize and unserialize instances', () => {
        let dto = (new Card(...objectValues(fieldValues))).serialize();

        for (let field of Object.keys(sampleDto)) {
            expect(dto[field]).toBe(sampleDto[field]);
        }

        let card = Card.unserialize(fieldValues.id, dto);

        for (let field of Object.keys(fieldValues)) {
            expect(card[field]).toBe(fieldValues[field]);
        }
    });

    it('should be rescheduled for reviewing', () => {
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date(2016, 1, 1));

        let lastRep = (new Date(2016, 1, 1)).getTime();
        let nextRep = (new Date(2016, 1, 9)).getTime();
        let card = new Card(fieldValues.id, fieldValues.front, fieldValues.back);

        card.setSchedule(lastRep, nextRep);
        expect(card.lastRep).toBe(lastRep);
        expect(card.nextRep).toBe(nextRep);
        expect(card.relativeScheduling).toBe(-1);

        jasmine.clock().mockDate(new Date(2016, 1, 5));
        card.setSchedule(lastRep, nextRep);
        expect(card.relativeScheduling).toBe(-0.5);

        jasmine.clock().mockDate(new Date(2016, 1, 9));
        card.setSchedule(lastRep, nextRep);
        expect(card.relativeScheduling).toBe(0);

        jasmine.clock().mockDate(new Date(2016, 1, 25));
        card.setSchedule(lastRep, nextRep);
        expect(card.relativeScheduling).toBe(2);

        card.setSchedule(null, null);
        expect(card.relativeScheduling).toBe(null);

        jasmine.clock().uninstall();
    });

    it('should update its state when it gets matched', () => {
        let values = objectValues(fieldValues).slice(0, -2);
        let transitions = {
          [States.NEW]: States.LEARNING,
          [States.LEARNING]: States.KNOWN,
          [States.KNOWN]: States.KNOWN,
          [States.LAPSE]: States.KNOWN
        };

        for (let state of Object.keys(transitions)) {
            let card = new Card(...values, state);

            card.match();
            expect(card.isMismatched).toBe(false);
            expect(card.state).toBe(transitions[state]);
        }
    });

    it('should update its state when it gets mismatched', () => {
        let values = objectValues(fieldValues).slice(0, -2);
        let transitions = {
          [States.NEW]: States.NEW,
          [States.LEARNING]: States.NEW,
          [States.KNOWN]: States.LAPSE,
          [States.LAPSE]: States.LAPSE
        };

        for (let state of Object.keys(transitions)) {
            let card = new Card(...values, state);

            card.mismatch();
            expect(card.isMismatched).toBe(true);
            expect(card.state).toBe(transitions[state]);
        }
    });

    it('should be suspended for a specified amount of time', () => {
        jasmine.clock().install();
        jasmine.clock().mockDate(new Date(2015, 10, 21));

        let card = new Card(137, 'abc', 'def');
        let now = Date.now();

        expect(card.isSuspended()).toBe(false);
        card.suspend(now + 100);
        expect(card.isSuspended()).toBe(true);
        jasmine.clock().tick(99);
        expect(card.isSuspended()).toBe(true);
        jasmine.clock().tick(1);
        expect(card.isSuspended()).toBe(false);

        jasmine.clock().uninstall();
    });

    it('should override toString', () => {
        let card = new Card(...objectValues(fieldValues));

        expect(card.toString()).toBe('  42  2016-04-15 13:29:32  2016-04-17 13:29:32  4  T  Front            Back           ');
    });

    /**
     * Returns an array with the values of all properties of an object (similar to Object.keys()).
     *
     * @param {Object} object
     * @returns {Array}
     */
    function objectValues(object) {
        return Object.keys(object).map(k => object[k]);
    }

});
