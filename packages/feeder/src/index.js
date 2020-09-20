const EventSource = require("eventsource");
const WikiChangeWatcher = require("./watcher");
const IPFS = require("ipfs");
const config = require("../config.json");
const Repo = require("ipfs-repo");

const watchers = {};
let ipfs;
let eventSource;
let eventCount = 0;

async function messageHandler(event) {
  // event.data will be a JSON string containing the message event.
  const change = JSON.parse(event.data);

  if (!config.wikipedia_watched_wikis.includes(change.wiki)) {
    return;
  }

  let watcher = watchers[change.wiki];
  if (!watcher) {
    watcher = new WikiChangeWatcher(ipfs, change.wiki);
    watchers[change.wiki] = watcher;
  }

  if (!watchers[change.wiki].busy && change.type === "edit") {
    eventCount++;
    // Watchers can not keep up with the edit frequency!
    watchers[change.wiki].onEdit(change).catch((err) => console.error(err));
  }
}

async function start() {
  const repoPath = config.repo;
  ipfs = await IPFS.create({
    repo: new Repo(repoPath),
    EXPERIMENTAL: { ipnsPubsub: true },
  });
  const ipfsInfo = await ipfs.version();
  console.debug(`IPFS Version: ${ipfsInfo.version}, Repo:${ipfsInfo.repo}`);
  eventSource = new EventSource(config.wikipedia_eventstream_url);
  eventSource.onopen = (event) => {
    console.debug("EventStreams connection opened.");
  };
  eventSource.onerror = (event) => {
    console.error("EventStreams connection encountered error", event);
  };
  eventSource.onmessage = messageHandler;
  console.debug(
    `Connecting to EventStreams at ${config.wikipedia_eventstream_url}`
  );
}

async function stop() {
  console.debug("Stopping. Please wait...");
  eventSource.close();
}

//catches ctrl+c event
process.on("SIGINT", async () => {
  await stop();
  process.exit();
});

process.on("SIGTERM", async () => {
  await stop();
  process.exit();
});

start();
