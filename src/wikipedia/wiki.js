class Wiki {
  constructor(ipfs, name, config) {
    this.name = name;
    this.restApi = null;
    this.ipfs = ipfs;
    this.ipns = null;
    this.config = config;
  }

  async publish() {
    const cid = await this.ipfs.files.flush(`/${this.name}`);
    const publishResponse = await this.ipfs.name.publish(cid.toString(), {
      key: this.config.publishkey[this.name],
      resolve: false,
    });
    console.log(
      `Published ${this.name} at https://gateway.ipfs.io/ipns/${publishResponse.name}`
    );
    console.log(
      `Published ${this.name} at https://gateway.ipfs.io${publishResponse.value}`
    );
    if (!this.ipns) {
      await this.link(publishResponse.name);
    }
    this.ipns = publishResponse.name;
  }

  async link(wikiIPNS) {
    await this.ipfs.files.write(
      `/wikipedia/wiki/${this.name}`,
      Buffer.from(wikiIPNS),
      {
        parents: true,
        create: true,
      }
    );
  }
}

module.exports = Wiki;
