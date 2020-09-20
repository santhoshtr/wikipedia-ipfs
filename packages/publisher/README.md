
# Wikipedia IPFS Publisher

[![npm version](https://img.shields.io/npm/v/wikipedia-ipfs-publisher.svg?style=flat)](https://www.npmjs.com/package/wikipedia-ipfs-publisher)

Publish Wikipedia articles to IPFS. Maintain a tracker of all language editions and for each wikis, the list of articles. Each articles then point to Article IPLDs. Articles points to revision IPLDs and so on.

## How does it work

The articles, and their revisions are added to IPFS using "Wikipedia IPFS Feeder" program. When they are added to IPFS, its CID, article title, and the wikiname is broadcasted in IPFS using IPFS PUBSUB mechanism. The wikipedia publisher program subscribes to these messages.

When an article is announced in IPFS, the publisher add that to a language edition. Technically, a wikipedia is a key-value store with keys being title and values being CID of the articles. The publisher program maintains this store.

[![](./doc/images/wiki-dag.png)](https://explore.ipld.io/#/explore/bafyreidvomwrucr2tsnsig3njce4posoacmo45jz32szwiajyp2ocidonu)

Once an article is changed in a language wikipedia(or any edition of wikipedia), the CID of that wiki changes. There is a "Wikipedia" tracker that tracks all the wikis and their CIDs by its name. So, when a CID of wiki change, CID of whole wikipedia changes.

[![](./doc/images/wikipedia-dag.png)](https://explore.ipld.io/#/explore/bafyreidvomwrucr2tsnsig3njce4posoacmo45jz32szwiajyp2ocidonu)

Since CIDs keeps on changing for every edit, for a human to access, a stable name is required, also known as IPNS. The publisher program tries to update the IPNS to point to the latest CID. Currently this is not an accurate process since IPNS updating is a very slow process. As IPFS improves the IPNS performance, our program will be more accurate.

But, to overcome the difficulties of slow IPNS, the publisher program broadcasts the latest CID in a IPFS PUBSUB topic 'wikipedia/cid'.

### Publishing and Trust

To publish the IPNS, a secret key is required. This is  kind of publishing authority. Since keys are secret, there is a limitation that only one node can publish the above mentioned trackers and hence the wikipedia. But nothing prevents another node to listen for the article creating messages and publishing "another wikipedia". The beauty of distributed network.

How do we trust the messages coming in PUBSUB about article nodes in IPFS? This is yet to be designed. But the messages can contain certificates from a user. The content of article can be inspected before adding to wikipedia trackers.

## Configuration

A sample configuration looks like

```
{
    "publishkey": "QmdiA2dCgyMgGT8PjZxHC6XsUFzc53eZQ2Y8bpmWaSUSLa"
     "name": "sthottingal",
     "swarms": [
        "/ip4/135.181.34.219/tcp/4002/p2p/QmTcmp2pDGGvQys4CErXQhNGu1QTSEVPCL4RemsvnrC1ue"
    ]
}
```

`name` is the publisher name.
`swarms` is swarm addresses to connect to. Usually feeder instance addresses.

# Usage

Install dependencies.

```
npm install
```

Start listening to messages in pubsub and add articles to Wiki nodes and update the wikipedia nodes. CIDs changes for all of them. And finally generate IPNS for the wikipedia.

```
npm start
```
