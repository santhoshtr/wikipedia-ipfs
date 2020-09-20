const last = require("it-last");
const IPFS = require("ipfs");
const config = require("../config.json");
const axios = require("axios");

const CID = require("cids");
class WikipediaPublisher {
  constructor(config) {
    this.ipfs = null;
    this.publishkeyname = config.publishkey;
    this.publishername = config.name;
    this.config = config;
    this.wikis = {};
    this.cid = null;
    this.publishing = false;
    this.swarms = config.swarms;
  }

  async init() {
    this.ipfs = await IPFS.create({ EXPERIMENTAL: { ipnsPubsub: true } });
    const { id } = await this.ipfs.id();
    console.log(`IPFS is ready with node id: ${id}`);
    for (let i = 0; i < this.swarms.length; i++) {
      const swarm = this.swarms[i];
      try {
        await this.ipfs.swarm.connect(swarm);
        console.log(`Swarm connected to ${swarm}`);
      } catch (e) {
        console.warn(`Failed to connect to swarm ${swarm}`);
      }
    }
    const watchedWikis = await this.getAllWikis();
    for (let i = 0; i < watchedWikis.length; i++) {
      const wiki = watchedWikis[i];
      await this.ipfs.pubsub.subscribe(`wikipedia/wiki/${wiki}/edit`, (msg) =>
        this.wikiEditHandler(JSON.parse(msg.data))
      );
    }
    console.log(`Publisher ${this.publishername} initialized for Wikipedia`);
    console.log(`Watching ${watchedWikis.length} wikis`);
  }

  async getAllWikis() {
    const api =
      "https://en.wikipedia.org/w/api.php?action=sitematrix&smtype=language&format=json";
    const sitematrix = await axios
      .get(api)
      .then((response) => response.data.sitematrix);
    let dbnames = [];
    for (let key in sitematrix) {
      const language = sitematrix[key];
      if (Array.isArray(language.site)) {
        for (let i = 0; i < language.site.length; i++) {
          const site = language.site[i];
          if (!site.closed && site.code === "wiki") {
            dbnames.push(site.dbname);
          }
        }
      }
    }
    return dbnames;
  }

  async wikiCIDChangeHandler({ wiki, cid }) {
    this.cid = await this.updateWikipedia(wiki, cid);
    this.wikis[wiki] = cid;
    const msgTopic = `@${this.publishername}/wikipedia/cid`;
    console.log(`${msgTopic}: ${this.cid}`);
    await this.ipfs.pubsub.publish(
      msgTopic,
      JSON.stringify({ cid: this.cid.toString() })
    );
    if (!this.publishing) {
      this.publish();
    }
  }

  async wikiEditHandler({ wiki, page, cid }) {
    const wikiCID = await this.addPage(wiki, page, cid);
    const msgTopic = `@${this.publishername}/wikipedia/wiki/${wiki}/cid`;
    const message = {
      wiki: wiki,
      page: page,
      cid: wikiCID.toString(),
    };
    console.log(`${msgTopic}: ${wikiCID.toString()}`);
    await this.ipfs.pubsub.publish(msgTopic, JSON.stringify(message));
    this.wikiCIDChangeHandler(message);
  }

  /**
   * @returns {Promise<String>}
   */
  async getPublishKey() {
    const key = (await this.ipfs.key.list()).find(
      (k) => k.name == this.publishkeyname
    );
    return key.id;
  }
  /*
   * @retrun {CID}
   */
  async getCID() {
    if (this.cid) {
      return this.cid;
    }
    let result;
    try {
      this.publishkey = await this.getPublishKey();
      result = await last(this.ipfs.name.resolve(`/ipns/${this.publishkey}`));
      console.log(
        `Resolved IPNS /ipns/${this.publishkey}: ${result.toString()}`
      );
    } catch (e) {
      console.log(`Error resolving IPNS /ipns/${this.publishkey.toString()}`);
      console.error(e);
    }
    return result;
  }

  /**
   * @returns {Promise<Object>}
   */
  async getWiki(wikiname) {
    let wiki, wikipediaCID;
    try {
      wikipediaCID = await this.getCID();
      const result = await this.ipfs.dag.get(
        `${wikipediaCID}/wiki/${wikiname}`
      );
      wiki = result.value;
    } catch (e) {
      console.log(`Could not find ${wikiname} in ${wikipediaCID}`);
    }
    return wiki;
  }

  /**
   * @returns {Promise<Object>}
   */
  async getWikipedia() {
    let wikicid;
    try {
      wikicid = await this.getCID();
    } catch (e) {
      //pass
    }
    if (!wikicid) {
      console.warn("Bootstrapping wikipedia...");
      return {};
    }
    const result = await this.ipfs.dag.get(wikicid, "");
    return result.value;
  }

  /**
   * @param {string} wikiname
   * @param {string} pageTitle
   * @param {string} pageCID
   * @retrun {CID}
   */
  async addPage(wikiname, pageTitle, pageCID) {
    let wiki = (await this.getWiki(wikiname)) || {};
    if (!wiki.pages) {
      console.warn(`Bootstrapping ${wikiname}...`);
      wiki = {};
    }
    wiki.pages = wiki.pages || {};
    wiki.pages[pageTitle] = pageCID;
    const wikiCID = await this.ipfs.dag.put(wiki, {
      format: "dag-cbor",
      hashAlg: "sha2-256",
    });
    return wikiCID;
  }

  /**
   * @param {string} wikiname
   * @param {string} wikicid
   * @retrun {CID}
   */
  async updateWikipedia(wikiname, wikicid) {
    const wikipedia = await this.getWikipedia();
    wikipedia.wiki = wikipedia.wiki || {};
    wikipedia.wiki[wikiname] = new CID(wikicid);
    const wikipediaCID = await this.ipfs.dag.put(wikipedia, {
      format: "dag-cbor",
      hashAlg: "sha2-256",
    });
    return wikipediaCID;
  }

  /**
   * Publish Wikipedia IPNS
   */
  async publish() {
    this.publishing = true;
    const cid = await this.getCID();
    const publishResponse = await this.ipfs.name.publish(cid.toString(), {
      key: this.publishkeyname,
    });
    this.publishing = false;
    console.log(`***\t/ipns/${publishResponse.name}\tWikipedia`);
  }
}

function main() {
  const publisher = new WikipediaPublisher(config);
  publisher.init();
}

main();
