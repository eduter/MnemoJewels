import { createMJBridge } from "./ull-bridge";
import "./ull.css";

// Optional integration. Failure to open ULL storage must never block the game.
export const ull = createMJBridge();
const ready = ull.initialize();
ready.catch(() => {});

const container = document.querySelector("#settings .screen-content");
if (container) {
  const details = document.createElement("details");
  details.className = "ull-settings";
  details.innerHTML =
    '<summary>Connect ULL learning</summary><p>Share Russian flashcard knowledge and target matching practice with words from your videos.</p><p id="ull-info">Loading local connection…</p><label>Import profile or journal<input id="ull-file" type="file" accept=".json"></label><button id="ull-export" type="button">Export MJ journal</button><label>Dropbox App Folder key<input id="ull-key" autocomplete="off"></label><button id="ull-connect" type="button">Connect Dropbox</button><button id="ull-sync" type="button">Sync now</button><button id="ull-disconnect" type="button">Disconnect</button><p id="ull-status" role="status"></p>';
  container.append(details);
  const status = details.querySelector<HTMLElement>("#ull-status")!;
  const refresh = () => {
    const info = ull.getInfo();
    details.querySelector("#ull-info")!.textContent = info.words
      ? `${info.words.toLocaleString()} vocabulary keys · ${info.events} learning events`
      : "Import a reviewer profile to connect your existing knowledge.";
  };
  const action = (id: string, fn: () => Promise<unknown>) => {
    details.querySelector<HTMLButtonElement>("#" + id)!.onclick = async () => {
      try {
        status.textContent = "Working…";
        await ready;
        await fn();
        refresh();
        status.textContent = "Saved.";
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : String(error);
      }
    };
  };
  details.querySelector<HTMLInputElement>("#ull-file")!.onchange = async (
    event,
  ) => {
    try {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        await ready;
        await ull.importFile(file);
        refresh();
        status.textContent =
          "Imported. Knowledge updates apply safely as cards leave the board.";
      }
    } catch (error) {
      status.textContent = String(error);
    }
  };
  action("ull-export", async () => ull.exportJournal());
  action("ull-connect", async () => {
    const key = details
      .querySelector<HTMLInputElement>("#ull-key")!
      .value.trim();
    if (!key)
      throw new Error("Enter the same Dropbox app key configured in ULL");
    await ull.connect(key);
  });
  action("ull-sync", () => ull.sync());
  action("ull-disconnect", () => ull.disconnect());
  ready
    .then(async () => {
      await ull.finishCallback();
      await ull.autoSync();
      details.querySelector<HTMLInputElement>("#ull-key")!.value =
        await ull.getAppKey();
      refresh();
    })
    .catch((error) => {
      status.textContent = "ULL connection unavailable: " + String(error);
    });
  ull.subscribe(refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden)
      void ull.autoSync().catch(() => {
        status.textContent = "Sync deferred. Local learning is saved.";
      });
  });
}
