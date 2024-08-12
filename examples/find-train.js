import assert from "node:assert";
import { differenceInMinutes } from "date-fns";
import * as OJP from "ojp-sdk";
import { SwissRailwaysApi } from "../oracle_template/core/swiss-railways-api.js";

// Stop Refs
// const stopMap = {
//     '8500010': 'Basel SBB',
//     '8500301': 'Rheinfelden',
//     '8500320': 'Stein-Säckingen',
//     '8500305': 'Frick',
//     '8500309': 'Brugg AG',
//     '8503504': 'Baden',
//     '8503000': 'Zürich HB'
// }

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  purple: "\x1b[35m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const colorize = (text, color) => `${COLORS[color]}${text}${COLORS.reset}`;

const main = async () => {
  assert(
    new Date().getTimezoneOffset() === 0,
    "App must be run in UTC timezone.",
  );

  const sbb = new SwissRailwaysApi(
    OJP.DEFAULT_STAGE.key,
    OJP.DEFAULT_STAGE.apiEndpoint,
    OJP.DEFAULT_STAGE.authBearerKey,
  );

  const date = new Date();
  console.log("\nUTC Time now: ", new Date());

  const trains = await sbb.findTrainsByRoute(
    "8500010",
    "8503000",
    "IR36",
    date,
  );
  console.log(
    "\nFound trains ",
    trains.length,
    "in total starting in Basel SBB",
  );

  const filtered = trains.filter(
    (train) => train.destinationStopPlace.stopPlaceRef === "8503000",
  );
  console.log(`\nTrain details:`);

  const { intermediateStopPoints, ...rest } = filtered[0];
  console.log(`Journey Ref: ${colorize(rest.journeyRef, "green")}`);
  console.log(`Journey Number: ${colorize(rest.journeyNumber, "green")}`);
  console.log(`Service Line: ${colorize(rest.serviceLineNumber, "green")}`);
  console.log(`\nFrom: ${colorize(rest.stopPlace.stopPlaceName, "green")}`);
  console.log(
    `Departure: ${colorize(rest.startDatetime.toISOString(), "purple")}`,
  );
  console.log(
    `\nTo: ${colorize(rest.destinationStopPlace.stopPlaceName, "green")}`,
  );
  console.log(`Arrival: ${colorize(rest.endDatetime.toISOString(), "purple")}`);

  console.log("\nAll Stops:");
  console.log(
    `${rest.sequenceOrder}. ${colorize(rest.stopPlace.stopPlaceName, "green")}`,
  );

  intermediateStopPoints.forEach((stop, index) => {
    console.log(
      `${stop.sequenceOrder}. ${colorize(stop.stopPlace.stopPlaceName, "green")}`,
    );
  });

  console.log(
    `${rest.sequenceOrder + intermediateStopPoints.length + 1}. ${colorize(rest.destinationStopPlace.stopPlaceName, "green")}`,
  );

  console.log(
    `\nDuration: ${colorize(rest.durationInMinutes + " minutes", "yellow")}`,
  );
  console.log(
    `Distance: ${colorize(rest.distanceMeters + " meters", "yellow")}`,
  );

  console.log(
    colorize(
      `\nTrain leaves in ${differenceInMinutes(rest.startDatetime, date)} minutes.`,
      "yellow",
    ),
  );
};

// Run the script:
// TZ=UTC node --es-module-specifier-resolution=node cli/find-train.js
main();
