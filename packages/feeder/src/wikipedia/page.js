const axios = require("axios");
const Revision = require("./revision");

class Page {
  constructor(title, ipfs, wiki) {
    this.ipfs = ipfs;
    this.wiki = wiki;
    this.title = title;
    this.revisions = {};
    this.cid = null;
    this.ipns = null;
  }

  /**
   * @returns {Object}
   */
  getSummary() {
    return axios
      .get(`${this.wiki.restApi}page/summary/${encodeURIComponent(this.title)}`)
      .then((response) => response.data);
  }

  /**
   * @returns {Object}
   */
  getTalkPage() {
    return axios
      .get(`${this.wiki.restApi}page/talk/${encodeURIComponent(this.title)}`)
      .then((response) => response.data);
  }

  /**
   * @returns {string[]} In descending order of revision ids. Latest comes first.
   */
  getRevisionNumbers() {
    const params = {
      action: "query",
      format: "json",
      formatversion: 2,
      prop: "revisions",
      titles: this.title,
      rvprop: "ids|timestamp|comment|size|flags|user",
      rvlimit: 50,
      origin: "*",
    };

    return axios.get(this.wiki.actionApi, { params }).then((response) => {
      const revisions = response.data.query.pages.length
        ? response.data.query.pages[0].revisions
        : [];
      return revisions
        .map((rev) => rev.revid)
        .sort()
        .reverse();
    });
  }

  /**
   * @returns {CID}
   */
  addRevision(revisionNumber) {
    const revision = new Revision(this.ipfs, this.wiki, this.title);
    return revision.add(revisionNumber);
  }

  /**
   * @returns {CID}
   */
  async update() {
    const summary = await this.getSummary();
    const page = summary || {};
    const revisionNumbers = await this.getRevisionNumbers();
    const revisions = {};
    for (let i = 0; i < revisionNumbers.length; i++) {
      const revisionNumber = revisionNumbers[i];
      revisions[revisionNumber] = await this.addRevision(revisionNumber);
      if (i === 4) {
        // for now, add three revisions
        break;
      }
    }
    page.revisions = revisions;
    page.latest = page.revisions[page.revision];
    const talk = await this.getTalkPage();
    try {
      page.talk = await this.ipfs.dag.put(talk, {
        format: "dag-cbor",
        hashAlg: "sha2-256",
      });
      console.log(
        `${page.talk}\t${this.wiki.name}/talk/${this.title}`
      );
    } catch (e) {
      // Pass. Talk api is unstable
    }
    const cid = await this.ipfs.dag.put(page, {
      format: "dag-cbor",
      hashAlg: "sha2-256",
    });
    console.log(`${cid}\t${this.wiki.name}/${this.title}`);
    return cid;
  }
}

module.exports = Page;
