# BigWig Data Fetcher for HiGlass

Quickly load data from a bigwig file in HiGlass.

[![HiGlass](https://img.shields.io/badge/higlass-🌸-brightgreen.svg)](http://higlass.io)


## Usage

The live scripts can be found at:

- https://unpkg.com/higlass-bigwig-datafetcher/dist/higlass-bigwig-datafetcher.min.js

Configure the track in your view config; you should be all set from here!

```
[...
  {
    "type": "bar",
    "height": 80,
    "data": {
      "type": "bbi",
      "url": "https://aveit.s3.amazonaws.com/higlass/bigwig/example.chr1.10000-1160000.bw",
      "chromSizesUrl": "https://aveit.s3.amazonaws.com/higlass/data/sequence/hg38.chrom.sizes",
    },
    "options": {
      ...
    }
    
  }
]
```

Note that the `chromSizesUrl` option is required.

For an example, see [`src/index.html`](src/index.html).


## Development

### Testing

To run the test suite:

```
npm run test
```

### Installation

```bash
$ git clone https://github.com/higlass/higlass-bigwig-datafetcher
$ cd higlass-bigwig-datafetcher
$ npm install
```

If you have a local copy of higlass, you can then run this command in the higlass-gff-datafetcher directory:

```bash
npm link higlass
```

### Commands

- **Developmental server**: `npm start`
- **Production build**: `npm run build`
