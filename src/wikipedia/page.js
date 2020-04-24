const axios = require("axios");
const Revision = require("./revision");

class Page {
  constructor(ipfs, wiki, title) {
    this.ipfs = ipfs;
    this.wiki = wiki;
    this.title = title;
    this.revisions = {};
    this.cid = null;
    this.ipns = null;
    this.summary = null;
  }

  async getSummary() {
    return await axios
      .get(`${this.wiki.restApi}page/summary/${encodeURIComponent(this.title)}`)
      .then((response) => response.data);
  }

  async getRevisions() {
    let bufferedContents = await toBuffer(
      ipfs.files.read(`/page/${this.title}/revisions`)
    ); // a buffer
    let contents = bufferedContents.toString(); // a string
    return JSON.parse(contents);
  }

  async addRevision(revisionNumber) {
    this.revisions = this.revisions || (await this.getRevisions()) || {};
    const revision = new Revision(
      this.ipfs,
      this.wiki,
      this.title,
      revisionNumber
    );
    await revision.update();
    this.revisions[revisionNumber] = revision.cid.toString();
  }

  async update() {
    this.summary = this.summary || (await this.getSummary()) || {};
    await this.ipfs.files.write(
      `/${this.wiki.name}/page/${this.title}/revisions`,
      Buffer.from(JSON.stringify(this.revisions)),
      { parents: true, create: true }
    );
    if (!this.revisions[this.summary.revision]) {
      console.error(
        `page/${this.title}/ does not have revision ${this.summary.revision}`
      );
    } else {
      await this.ipfs.files.write(
        `/${this.wiki.name}/page/${this.title}/latest`,
        Buffer.from(this.revisions[this.summary.revision]),
        { parents: true, create: true }
      );
    }
    await this.ipfs.files.write(
      `/${this.wiki.name}/page/${this.title}/summary`,
      Buffer.from(JSON.stringify(this.summary)),
      { parents: true, create: true }
    );
    this.cid = await this.ipfs.files.flush(
      `/${this.wiki.name}/page/${this.title}`
    );
    console.log(`[Page] /${this.wiki.name}/page/${this.title} : ${this.cid}`);
  }
}

module.exports = Page;
