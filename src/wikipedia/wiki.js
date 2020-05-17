const last = require("it-last");

class Wiki {
  constructor(name) {
    this.name = name;
    this.restApi = null;
    this.actionApi = null;
  }
}

module.exports = Wiki;
