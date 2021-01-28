import register from "higlass-register";

import BigwigDataFetcher from "./BigwigDataFetcher";

register(
  { dataFetcher: BigwigDataFetcher, config: BigwigDataFetcher.config },
  { pluginType: "dataFetcher" }
);
