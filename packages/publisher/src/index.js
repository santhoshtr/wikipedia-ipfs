const last = require("it-last");
const IPFS = require("ipfs-http-client");
const config = require("../config.json");
const { CID } = require("ipfs-http-client");
const axios = require('axios')

class WikipediaPublisher {
  constructor(config) {
    this.ipfs = new IPFS(config.ipfs_server);
    this.ipns = config.publishkey;
    this.config = config;
    this.wikis = {};
    this.cid = null;
    this.publishing = false;
  }

  async init() {
    const watchedWikis = await this.getAllWikis();
    for (let i = 0; i < watchedWikis.length; i++) {
      const wiki = watchedWikis[i];
      await this.ipfs.pubsub.subscribe(`wikipedia/wiki/${wiki}/cid`, (msg) =>
        this.wikiCIDChangeHandler(JSON.parse(msg.data))
      );
      await this.ipfs.pubsub.subscribe(`wikipedia/wiki/${wiki}/edit`, (msg) =>
        this.wikiEditHandler(JSON.parse(msg.data))
      );
    }
    console.log(
      `Publisher initialized for Wikipedia. Watching ${watchedWikis.length} wikis`
    );
  }

  async getAllWikis() {
    const api = 'https://en.wikipedia.org/w/api.php?action=sitematrix&smtype=language&format=json'
    const sitematrix = await axios.get(api).then((response) => response.data.sitematrix);
    let dbnames = [];
    for (let key in sitematrix) {
      const language = sitematrix[key];
      if (Array.isArray(language.site)) {
        for (let i = 0; i < language.site.length; i++) {
          const site = language.site[i];
          if (!site.closed && site.code==='wiki') {
            dbnames.push(site.dbname)
          }
        }

      }
    }
    return dbnames;
  }

  async wikiCIDChangeHandler(msg) {
    this.cid = await this.updateWikipedia(msg.wiki, msg.cid);
    this.wikis[msg.wiki] = msg.cid;
    await this.ipfs.pubsub.publish("wikipedia/cid", this.cid.toString());
    if (!this.publishing) {
      this.publish();
    }
  }

  async wikiEditHandler(msg) {
    const wikiCID = await this.addPage(msg.wiki, msg.title, msg.cid);
    const msgTopic = `wikipedia/wiki/${msg.wiki}/cid`;
    await this.ipfs.pubsub.publish(
      msgTopic,
      JSON.stringify({
        wiki: msg.name,
        page: msg.title,
        cid: wikiCID.toString(),
      })
    );
  }

  /*
   * @retrun {CID}
   */
  getCID() {
    if (this.cid) {
      return this.cid;
    }
    return last(this.ipfs.name.resolve(this.ipns));
  }

  async getWiki(wikiname) {
    const wikipediaCID = await this.getCID();
    let result;
    try {
      result = await this.ipfs.dag.get(wikipediaCID, `/wiki/${wikiname}`);
      result = result.value;
    } catch (e) {
      //pass
    }
    return result;
  }

  async getWikipedia() {
    let wikicid = await this.getCID();
    if (!wikicid) {
      console.warn("Bootstrapping wikipedia...");
      return {};
    }
    const result = await this.ipfs.dag.get(wikicid, "");
    return result.value;
  }

  /**
   * @param {string} pageTitle
   * @retrun {CID}
   */
  async addPage(wikiname, pageTitle, pageCID) {
    let wiki = (await this.getWiki(wikiname)) || {};
    if (!wiki.pages) {
      wiki = {};
    }
    wiki.pages = wiki.pages || {};
    wiki.pages[pageTitle] = pageCID;
    const wikiCID = await this.ipfs.dag.put(wiki, {
      format: "dag-cbor",
      hashAlg: "sha2-256",
    });
    console.log(`${wikiCID}\t${wikiname}`);
    return wikiCID;
  }

  /**
   * @param {string} pageTitle
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
    console.log(`${wikipediaCID}\tWikipedia`);
    return wikipediaCID;
  }

  /**
   * Publish Wikipedia IPNS
   * @param {string} cid
   */
  async publish() {
    this.publishing = true;
    const cid = await this.getCID();
    const publishResponse = await this.ipfs.name.publish(cid.toString(), {
      key: this.ipns,
    });
    this.publishing = false;
    console.log(`==>\t/ipns/${publishResponse.name}\tWikipedia`);
  }
}

function main() {
  const publisher = new WikipediaPublisher(config)
  publisher.init();
}

main();
