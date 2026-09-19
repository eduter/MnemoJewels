import events from '../src/events';

describe('events', () => {

    it('should call an event handler when the event it handles is triggered', () => {
        let called = false;

        events.bind('testBind', () => {
            called = true;
        });
        events.trigger('testbind');
        expect(called).toBe(false);
        events.trigger('testBind');
        expect(called).toBe(true);
    });

});
