const { Wiki, Page } = require("./wikipedia");
const IPFS = require("ipfs");

class WikiChangeWatcher {
  constructor(ipfs, wikiname) {
    this.ipfs = ipfs;
    this.wiki = new Wiki(wikiname);
    console.log(`Watcher initialized for ${this.wiki.name}\t${"[OK]"}`);
    this.busy = false;
  }

  async onEdit(edit) {
    this.wiki.domain = edit.server_url;
    this.busy = true;
    const pageTitle = edit.title;
    try {
      const page = new Page(pageTitle, this.ipfs, this.wiki);
      const pageCID = await page.update();
      const msgTopic = `wikipedia/wiki/${this.wiki.name}/edit`;
      const message = {
        wiki: this.wiki.name,
        page: pageTitle,
        cid: pageCID.toString(),
      };
      await this.ipfs.pubsub.publish(msgTopic, JSON.stringify(message));
    } catch (err) {
      console.error(err);
    }
    this.busy = false;
  }
}

module.exports = WikiChangeWatcher;
