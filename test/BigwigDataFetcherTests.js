/* eslint-env node, jasmine */
import { expect } from "chai";
import BBIDataFetcher from "../src/BigWigDataFetcher";

describe("Bigwig data fetcher tests", () => {
  describe("BBI data fetcher", () => {
    const df = new BBIDataFetcher(
      {},
      {
        type: "bbi",
        url: "https://aveit.s3.amazonaws.com/higlass/bigwig/example.chr1.10000-1160000.bw",
        chromSizesUrl: "https://aveit.s3.amazonaws.com/higlass/data/sequence/hg38.chrom.sizes",
      }
    );

    it("should fetch the tileset info", (done) => {
      df.tilesetInfo((tsInfo) => {
        expect(tsInfo.tile_size).to.eql(1024);
        expect(tsInfo.max_zoom).to.eql(22);

        done();
      });
    });

    // it("should fetch a tile", (done) => {
    //   df.fetchTilesDebounced(
    //     (tiles) => {
    //       console.warn(tiles);
    //       expect(tiles).to.include.all.keys("0.0");

    //       expect(tiles["0.0"].length).to.be.above(0);

    //       done();
    //     },
    //     ["0.0"]
    //   );
    // });

    // it("should fetch two tiles", (done) => {
    //   df.fetchTilesDebounced(
    //     (tiles) => {
    //       expect(tiles).to.include.all.keys("1.0", "1.1");

    //       expect(tiles["1.0"].length).to.be.above(0);
    //       expect(tiles["1.1"].length).to.be.above(0);

    //       done();
    //     },
    //     ["1.0", "1.1"]
    //   );
    // });
  });

  
});
