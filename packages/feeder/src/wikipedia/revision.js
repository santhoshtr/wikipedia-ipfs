const axios = require("axios");
class Revision {
  constructor(ipfs, wiki, title) {
    this.ipfs = ipfs;
    this.wiki = wiki;
    this.title = title;
  }

  getMetadata(revisionNumber) {
    return axios
      .get(
        `${this.wiki.restApi}page/title/${encodeURIComponent(
          this.title
        )}/${revisionNumber}`,
        {
          redirect: true,
        }
      )
      .then((response) => response.data.items[0]);
  }

  getContent(revisionNumber) {
    return axios
      .get(
        `${this.wiki.restApi}page/html/${encodeURIComponent(
          this.title
        )}/${revisionNumber}`,
        {
          redirect: true,
        }
      )
      .then((response) => response.data);
  }

  async add(revisionNumber) {
    const metadata = await this.getMetadata(revisionNumber);
    const html = await this.getContent(revisionNumber);
    const revision = {
      revision: metadata.rev,
      tid: metadata.tid,
      tags: metadata.tags,
      comment: metadata.comment,
      timestamp: metadata.timestamp,
      page: {
        language: metadata.page_language,
        id: metadata.page_id,
        redirect: metadata.redirect,
        namespace: metadata.namespace,
        title: metadata.title,
      },
      user: {
        name: metadata.user_text,
        id: metadata.user_id,
      },
      restrictions: metadata.restrictions,
      content: { html },
    };
    const cid = await this.ipfs.dag.put(revision, {
      format: "dag-cbor",
      hashAlg: "sha2-256",
    });

    console.log(
      `${cid}\t${this.wiki.name}/${this.title}/${revisionNumber}`
    );
    return cid;
  }
}

module.exports = Revision;
