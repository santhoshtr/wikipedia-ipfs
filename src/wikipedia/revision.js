const axios = require("axios");
class Revision {
  constructor(ipfs, wiki, title, revision) {
    this.ipfs = ipfs;
    this.wiki = wiki;
    this.title = title;
    this.revision = revision;
    this.cid = null;
  }

  async getMetadata() {
    return await axios
      .get(
        `${this.wiki.restApi}page/title/${encodeURIComponent(this.title)}/${
          this.revision
        }`,
        {
          redirect: true,
        }
      )
      .then((response) => response.data);
  }

  async getContent() {
    return await axios
      .get(
        `${this.wiki.restApi}page/html/${encodeURIComponent(this.title)}/${
          this.revision
        }`,
        {
          redirect: true,
        }
      )
      .then((response) => response.data);
  }

  async update() {
    this.metadata = await this.getMetadata();
    this.content = await this.getContent();

    await this.ipfs.files.write(
      `/freeknowledge/revision/${this.revision}/metadata.json`,
      Buffer.from(JSON.stringify(this.metadata)),
      { parents: true, create: true }
    );
    await this.ipfs.files.write(
      `/freeknowledge/revision/${this.revision}/content.html`,
      Buffer.from(this.content),
      { parents: true, create: true }
    );

    this.cid = await this.ipfs.files.flush(
      `/freeknowledge/revision/${this.revision}`
    );
    console.log(
      `[Rev ] /freeknowledge/revision/${this.revision} : ${this.cid}`
    );
  }
}

module.exports = Revision;
