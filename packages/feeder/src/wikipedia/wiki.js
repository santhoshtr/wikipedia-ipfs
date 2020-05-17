class Wiki {
  constructor(name) {
    this.name = name;
    this.domain = null;
  }

  get restApi() {
    return `${this.domain}/api/rest_v1/`;
  }

  get actionApi() {
    return `${this.domain}/w/api.php`;
  }
}

module.exports = Wiki;
