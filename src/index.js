const EventSource = require("eventsource");
const WikiChangeWatcher = require("./watcher");
const IPFS = require("ipfs-http-client");
const { CID } = require("ipfs-http-client");
const config = require("../config.json");
const { Wikipedia } = require("./wikipedia");

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
    watcher = new WikiChangeWatcher(ipfs, change.wiki, config);
    watchers[change.wiki] = watcher;
  }

  if (!watchers[change.wiki].busy) {
    eventCount++;
    // Watchers can not keep up with the edit frequency!
    watchers[change.wiki].onEdit(event).catch((err) => console.error(err));
  }

  if (eventCount % 100 === 0) {
    publish();
  }
}

async function publish(wiki) {
  const cid = await ipfs.files.flush(`/wikipedia`);
  const publishResponse = await ipfs.name.publish(cid.toString(), {
    key: config.publishkey.wikipedia,
    resolve: false,
  });
  console.log(
    `Published wikipedia at https://gateway.ipfs.io/ipns/${publishResponse.name}`
  );
  console.log(
    `Published wikipedia at https://gateway.ipfs.io${publishResponse.value}`
  );
}

async function start() {
  ipfs = new IPFS(config.ipfs_server);
  console.log(`Connected to IPFS server at ${config.ipfs_server}`);
  console.table(await ipfs.version());
  eventSource = new EventSource(config.wikipedia_eventstream_url);
  eventSource.onopen = (event) => {
    console.log("--- Opened connection.");
  };
  eventSource.onerror = (event) => {
    console.error("--- Encountered error", event);
  };
  eventSource.onmessage = messageHandler;
  console.log(
    `Connecting to EventStreams at ${config.wikipedia_eventstream_url}`
  );
}

async function stop() {
  console.log("Stopping. Please wait...");
  eventSource.close();
  await publish();
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
