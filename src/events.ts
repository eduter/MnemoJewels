type EventHandler = (eventData: unknown) => void | Promise<void>;

const eventHandlers: Record<string, EventHandler[]> = {};
const oneTimeEvents: Record<string, string> = {};

function bind(eventName: string, eventHandler: EventHandler): void {
  if (eventName in oneTimeEvents) {
    notifyHandler(eventHandler, oneTimeEvents[eventName]);
  } else {
    eventHandlers[eventName] = eventHandlers[eventName] || [];
    eventHandlers[eventName].push(eventHandler);
  }
}

function trigger(eventName: string, eventData?: unknown, oneTimeEvent = false): Promise<void> {
  if (oneTimeEvent) {
    if (!(eventName in oneTimeEvents)) {
      oneTimeEvents[eventName] = serializeEventData(eventData);
      const promise = notifyHandlers(eventName, eventData);
      delete eventHandlers[eventName];
      return promise;
    }
    return Promise.resolve();
  } else {
    return notifyHandlers(eventName, eventData);
  }
}

function waitFor(events: string[], callback: () => void): void {
  const stillWaitingFor = events.slice();

  for (let i = 0; i < events.length; i++) {
    bind(events[i], (function (eventName: string) {
      return function () {
        const index = stillWaitingFor.indexOf(eventName);
        if (index >= 0) {
          stillWaitingFor.splice(index, 1);
          if (stillWaitingFor.length === 0) {
            callback();
          }
        }
      };
    })(events[i]));
  }
}

function notifyHandlers(eventName: string, eventData?: unknown): Promise<void> {
  if (eventName in eventHandlers) {
    const serializedData = serializeEventData(eventData);
    return Promise.all(eventHandlers[eventName].map(handler => notifyHandler(handler, serializedData)))
      .then(() => undefined);
  }
  return Promise.resolve();
}

function notifyHandler(handler: EventHandler, serializedEventData: string): Promise<void> {
  return Promise.resolve(handler.call(null, JSON.parse(serializedEventData)));
}

function serializeEventData(eventData: unknown): string {
  return eventData === undefined ? 'null' : JSON.stringify(eventData);
}

export default {
  bind,
  trigger,
  waitFor,
};
