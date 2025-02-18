import slugid from "slugid";
import { BigWig } from "@gmod/bbi";
import { RemoteFile } from "apr144-generic-filehandle";
import { tsvParseRows } from "d3-dsv";
import { text } from "d3-request";

const chrToAbs = (chrom, chromPos, chromInfo) => {
  return chromInfo.chrPositions[chrom].pos + chromPos;
};

function parseChromsizesRows(data) {
  const cumValues = [];
  const chromLengths = {};
  const chrPositions = {};

  let totalLength = 0;

  for (let i = 0; i < data.length; i++) {
    const length = Number(data[i][1]);
    totalLength += length;

    const newValue = {
      id: i,
      chr: data[i][0],
      pos: totalLength - length,
    };

    cumValues.push(newValue);
    chrPositions[newValue.chr] = newValue;
    chromLengths[data[i][0]] = length;
  }

  return {
    chrToAbs: ([chrName, chrPos]) =>
      chrToAbs(chrName, chrPos, { chrPositions }),
    cumPositions: cumValues,
    chrPositions,
    totalLength,
    chromLengths,
  };
}

function ChromosomeInfo(filepath, success) {
  const ret = {};

  ret.absToChr = (absPos) => (ret.chrPositions ? absToChr(absPos, ret) : null);

  ret.chrToAbs = ([chrName, chrPos] = []) =>
    ret.chrPositions ? chrToAbs(chrName, chrPos, ret) : null;

  return text(filepath, (error, chrInfoText) => {
    if (error) {
      // console.warn('Chromosome info not found at:', filepath);
      if (success) success(null);
    } else {
      const data = tsvParseRows(chrInfoText);
      const chromInfo = parseChromsizesRows(data);

      Object.keys(chromInfo).forEach((key) => {
        ret[key] = chromInfo[key];
      });
      if (success) success(ret);
    }
  });
}

const BBIDataFetcher = function BBIDataFetcher(HGC, ...args) {
  if (!new.target) {
    throw new Error(
      'Uncaught TypeError: Class constructor cannot be invoked without "new"'
    );
  }

  class BBIDataFetcherClass {
    constructor(dataConfig) {
      this.dataConfig = dataConfig;
      this.trackUid = slugid.nice();
      this.bwFileHeader = null;
      this.bwFile = null;
      this.TILE_SIZE = 1024;

      this.errorTxt = "";
      this.dataPromises = [];
      this.dataPromises.push(this.loadChromsizes(dataConfig));
      this.dataPromises.push(this.loadBBI(dataConfig));
    }

    loadChromsizes(dataConfig) {
      if (dataConfig.chromSizesUrl) {
        return new Promise((resolve) => {
          ChromosomeInfo(dataConfig.chromSizesUrl, (chromInfo) => {
            this.chromSizes = chromInfo;
            resolve();
          });
        });
      } else {
        console.error(
          'Please enter a "chromSizesUrl" field to the data config'
        );
      }
      return null;
    }

    loadBBI(dataConfig) {
      if (dataConfig.url) {
        // look for Basic credentials in the URL; if present, extract
        // them and use them to create an authenticated RemoteFile object
        let url = new URL(dataConfig.url);
        const username = url.username;
        const password = url.password;
        if (username && password) {
          dataConfig.url = `${url.protocol}//${url.host}${url.pathname}${url.search}`;
          this.bwFile = new BigWig({
            filehandle: new RemoteFile(dataConfig.url, { auth: { user: username, password: password } }),
          });
        }
        else {
          this.bwFile = new BigWig({
            filehandle: new RemoteFile(dataConfig.url),
          });
        }
        return this.bwFile.getHeader().then((h) => {
          this.bwFileHeader = h;
        });
      } else {
        console.error('Please enter a "url" field to the data config');
        return null;
      }
    }

    tilesetInfo(callback) {
      this.tilesetInfoLoading = true;

      return Promise.all(this.dataPromises)
        .then(() => {
          this.tilesetInfoLoading = false;

          let retVal = {};

          const totalLength = this.chromSizes.totalLength;

          retVal = {
            tile_size: this.TILE_SIZE,
            max_zoom: Math.ceil(
              Math.log(totalLength / this.TILE_SIZE) / Math.log(2)
            ),
            max_width: 2 ** Math.ceil(Math.log(totalLength) / Math.log(2)),
            min_pos: [0],
            max_pos: [totalLength],
          };

          if (callback) {
            callback(retVal);
          }

          return retVal;
        })
        .catch((err) => {
          this.tilesetInfoLoading = false;

          console.error(err);

          if (callback) {
            callback({
              error: `Error parsing bigwig: ${err}`,
            });
          }
        });
    }

    fetchTilesDebounced(receivedTiles, tileIds) {
      const tiles = {};

      const validTileIds = [];
      const tilePromises = [];

      for (const tileId of tileIds) {
        const parts = tileId.split(".");
        const z = parseInt(parts[0], 10);
        const x = parseInt(parts[1], 10);

        if (Number.isNaN(x) || Number.isNaN(z)) {
          console.warn("Invalid tile zoom or position:", z, x);
          continue;
        }

        validTileIds.push(tileId);
        tilePromises.push(this.tile(z, x));
      }

      Promise.all(tilePromises).then((values) => {
        for (let i = 0; i < values.length; i++) {
          const validTileId = validTileIds[i];
          tiles[validTileId] = values[i];
          tiles[validTileId].tilePositionId = validTileId;
        }

        receivedTiles(tiles);
      });
      // tiles = tileResponseToData(tiles, null, tileIds);

      return tiles;
    }

    tile(z, x) {
      return this.tilesetInfo().then((tsInfo) => {
        const tileWidth = +tsInfo.max_width / 2 ** +z;

        const recordPromises = [];

        const tile = {
          tilePos: [x],
          tileId: "bigwig." + z + "." + x,
          zoomLevel: z,
        };

        // get the bounds of the tile
        const minXOriginal = tsInfo.min_pos[0] + x * tileWidth;
        let minX = minXOriginal;
        const maxX = tsInfo.min_pos[0] + (x + 1) * tileWidth;

        const basesPerPixel = this.determineScale(minX, maxX);
        const basesPerBin = (maxX - minX) / this.TILE_SIZE;

        const binStarts = [];
        for (let i = 0; i < this.TILE_SIZE; i++) {
          binStarts.push(minX + i * basesPerBin);
        }

        const { chromLengths, cumPositions } = this.chromSizes;

        for (let i = 0; i < cumPositions.length; i++) {
          const chromName = cumPositions[i].chr;
          const chromStart = cumPositions[i].pos;
          const chromEnd = cumPositions[i].pos + chromLengths[chromName];

          let startPos, endPos;

          if (chromStart <= minX && minX < chromEnd) {
            // start of the visible region is within this chromosome

            if (maxX > chromEnd) {
              // the visible region extends beyond the end of this chromosome
              // fetch from the start until the end of the chromosome
              startPos = minX - chromStart;
              endPos = chromEnd - chromStart;
              recordPromises.push(
                this.bwFile
                  .getFeatures(chromName, startPos, endPos, {
                    scale: 1 / basesPerPixel,
                  })
                  .then((values) => {
                    values.forEach((v) => {
                      v["startAbs"] = HGC.utils.chrToAbs(
                        chromName,
                        v.start,
                        this.chromSizes
                      );
                      v["endAbs"] = HGC.utils.chrToAbs(
                        chromName,
                        v.end,
                        this.chromSizes
                      );
                    });
                    return values;
                  })
              );

              minX = chromEnd;
            } else {
              startPos = Math.floor(minX - chromStart);
              endPos = Math.ceil(maxX - chromStart);
              recordPromises.push(
                this.bwFile
                  .getFeatures(chromName, startPos, endPos, {
                    scale: 1 / basesPerPixel,
                  })
                  .then((values) => {
                    values.forEach((v) => {
                      v["startAbs"] = HGC.utils.chrToAbs(
                        chromName,
                        v.start,
                        this.chromSizes
                      );
                      v["endAbs"] = HGC.utils.chrToAbs(
                        chromName,
                        v.end,
                        this.chromSizes
                      );
                    });
                    return values;
                  })
              );
              break;
            }
          }
        }

        return Promise.all(recordPromises).then((v) => {
          const values = v.flat();

          var dense = [];
          for (var i = 0; i < this.TILE_SIZE; i++) {
            dense.push(null);
          }

          // Currently we use the same binning strategy in all cases (basesPerBin =>< basesPerBinInFile)
          binStarts.forEach((curStart, index) => {
            if (curStart < minXOriginal || curStart > maxX) {
              return;
            }
            const filtered = values
              .filter((v) => {
                return curStart >= v.startAbs && curStart < v.endAbs;
              })
              .map((v) => v.score);
            dense[index] = filtered.length > 0 ? filtered[0] : null;
          });

          tile.min_value = Math.min(...dense);
          tile.max_value = Math.max(...dense);

          const dde = new HGC.utils.DenseDataExtrema1D(dense);
          tile.dense = dense;
          tile.denseDataExtrema = dde;
          tile.minNonZero = dde.minNonZeroInTile;
          tile.maxNonZero = dde.maxNonZeroInTile;

          return tile;
        });
      });
    }

    // We never want to request more than 1024 * 20 elements from the file.
    determineScale(minX, maxX) {
      const reductionLevels = [1];
      const numRequestedElements = maxX - minX;

      this.bwFileHeader.zoomLevels.forEach((z) => {
        reductionLevels.push(z.reductionLevel);
      });

      for (var i = 0; i < reductionLevels.length; i++) {
        const rl = reductionLevels[i];
        const numElementsFromFile = numRequestedElements / rl;
        if (numElementsFromFile <= this.TILE_SIZE * 20) {
          return rl;
        }
      }

      // return the highest reductionLevel, if we could not find anything better
      return reductionLevels.slice(-1)[0];
    }
  }

  return new BBIDataFetcherClass(...args);
}; // end function wrapper

BBIDataFetcher.config = {
  type: "bbi",
};

export default BBIDataFetcher;
