const IPFS = require("ipfs-http-client");
const { CID } = require("ipfs-http-client");
const axios = require("axios");
const { Wiki, Page } = require("./wikipedia");

class WikiChangeWatcher {
  constructor(ipfs, wikiname, config) {
    this.ipfs = ipfs;
    this.wiki = new Wiki(this.ipfs, wikiname, config);
    console.log(`--- Watcher initialized for ${wikiname}.`);
    this.linked = false;
    this.busy = false;
  }

  async onEdit(event) {
    const change = JSON.parse(event.data);
    this.wiki.restApi = `${change.server_url}/api/rest_v1/`;
    if (change.type !== "edit") {
      // We care about edit events only - for now
      return;
    }
    this.busy = true;
    try {
      const page = new Page(this.ipfs, this.wiki, change.title);
      await page.addRevision(change.revision.new);
      if (change.revision.old) {
        await page.addRevision(change.revision.old);
      }
      await page.update();
      await this.wiki.publish();
    } catch (err) {
      console.error(err);
    }
    this.busy = false;
  }
}

module.exports = WikiChangeWatcher;
