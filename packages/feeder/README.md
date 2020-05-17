# Wikipedia IPFS Feeder

[![npm version](https://img.shields.io/npm/v/wikipedia-ipfs-feeder.svg?style=flat)](https://www.npmjs.com/package/wikipedia-ipfs-feeder)

Feed Wikipedia articles to IPFS. The articles are based on recent edits in configurable set of wikis.

## How does it work

Based on the articles that were edited recently, all available information about the article, its revisions are fetched from Wikipedia APIS. This structured information is then transformed to an IPFS DAG. In otherwords, we represent the JSON formatted API result into an IPLD - Inter Planetary Linked Data.

Revisions are independent immutable DAG nodes and article contains links to these revisions. The `latest` node in an article points to the latest revision.

The following image shows a real article from Malayalam wikipedia published. It has 4 revisions and revisions point to another nodes. The `latest`  points to latest revision.

[![](./doc/images/page-dag.png)](https://explore.ipld.io/#/explore/bafyreie3ib63ljd5ojtzrqwmdeo75rnehby7ugqc7tb2fr2k6t5nintarm)

You may explore this node using IPLD explorer. https://explore.ipld.io/#/explore/bafyreifs7kodvs4qamc2e5fdgzqaganabn5t36pzqgijhiqa3t53az5tg4

A revision node will look like the below image. You can access it using the IPLD explorer link: https://explore.ipld.io/#/explore/zdpuAxU6hAxiU47Ga9HU6ok1vKztVagns5AxurAJMnVJEWJBQ/revisions/3306691

[![](./doc/images/revision-dag.png)](https://explore.ipld.io/#/explore/zdpuAxU6hAxiU47Ga9HU6ok1vKztVagns5AxurAJMnVJEWJBQ/revisions/3306691)

The created article nodes are independent and they just get added to IPFS network. Whenever such nodes are published, this program also announce it using IPFS pubsub. The message contains the page CID, page title, and the wiki name.

A Wikipedia publisher program can subscribe to these messages and link this to a wikipedia tracker.

Each item in these IPLD structured can be retrieved using IPFS. For example, to get the html content for the above mentioned article.

```
ipfs dag get bafyreifs7kodvs4qamc2e5fdgzqaganabn5t36pzqgijhiqa3t53az5tg4/revisions/3306691/content/html
```

The data structure in these nodes are roughly same as the API output from Wikipedia api. But expected to change as a formal schema is defined.

The addition of these nodes to IPFS is announced in the pubsub with the topic
"wikipedia/wiki/`wikiname`/edit". The message is a JSON string with the keys:
`wiki, page, cid`

## Configuration

A sample configuration looks like

```
{
    "wikipedia_eventstream_url": "https://stream.wikimedia.org/v2/stream/recentchange",
    "wikipedia_watched_wikis": [
        "mlwiki",
        "tawiki",
        "simplewiki"
    ]
}
```

You may add any number of wikis(theoretically!) to watch for recent changes. The changes are sourced from the editevent stream published by Wikimedia foundation.


# Usage

Install dependencies.

```
npm install
```

Start listening to wikis and publishing articles to IPFS

```
npm start
```
