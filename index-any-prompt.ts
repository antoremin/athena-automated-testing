/**
 * 🤘 Welcome to Stagehand!
 *
 * This is a modified index file that runs the athena_any_prompt.ts script
 * instead of the default main.ts script.
 *
 */

import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import { main } from "./athena_any_prompt.js";
import boxen from "boxen";

async function run() {
  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();

  if (StagehandConfig.env === "BROWSERBASE" && stagehand.browserbaseSessionID) {
    console.log(
      boxen(
        `View this session live in your browser: \n${chalk.blue(
          `https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`
        )}`,
        {
          title: "Browserbase",
          padding: 1,
          margin: 3,
        }
      )
    );
  }

  const page = stagehand.page;
  const context = stagehand.context;
  await main({
    page,
    context,
    stagehand,
  });
  await stagehand.close();
  console.log(
    `\n🤘 Thanks for using Stagehand! Create an issue if you have any feedback: ${chalk.blue(
      "https://github.com/browserbase/stagehand/issues/new"
    )}\n`
  );
}

run(); 