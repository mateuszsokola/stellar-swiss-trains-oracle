import { differenceInMinutes, fromUnixTime } from "date-fns";

export const STOP_REF_NAME_MAP = {
  8500010: "Basel SBB",
  8500301: "Rheinfelden",
  8500320: "Stein-Säckingen",
  8500305: "Frick",
  8500309: "Brugg AG",
  8503504: "Baden",
  8503000: "Zürich HB",
};
export const START_PLACE_REF = "8500010"; // Basel SBB
export const FINISH_PLACE_REF = "8503000"; // Zürich HB
export const TRAIN_NUMBER = "IR36";
export const STOP_REFS = [
  8500010, 8500301, 8500320, 8500305, 8500309, 8503504, 8503000,
];

/**
 * Represents an oracle for managing train journeys using the smart contract and Swiss Railways API.
 *
 * The Oracle class interacts with the smart contract and Swiss Railways API to process train journeys
 * including check in at stations, and schedule new journeys based on the current journey state
 * and available train data.
 *
 * Provides methods to process trains, check in at stations if possible, and schedule the next journey.
 *
 * @class
 */
export class Oracle {
  /**
   * Creates an instance of Oracle.
   *
   * @param {SwissRailwaysContractOperator}   swissRailwaysContractOperator - An instance of the class to interact with the smart contract.
   * @param {SwissRailwaysApi}                swissRailwaysApi              - An instance of the API client for fetching train data.
   */
  constructor(swissRailwaysContractOperator, swissRailwaysApi) {
    this.swissRailwaysContractOperator = swissRailwaysContractOperator;
    this.swissRailwaysApi = swissRailwaysApi;
  }

  /**
   * Processes the current state of trains and schedules or checks in based on the journey status.
   *
   * Checks if there is an active journey. If not, schedules the next journey. If there is an active journey,
   * checks in at the next station if possible.
   *
   * @returns {Promise<void>}
   */
  async processTrains() {
    console.log(new Date(), " Checking blockchain state...");

    const journey = await this.swissRailwaysContractOperator.getJourney()

    if (journey.journeyStatus === 'unplanned') {
      await this._scheduleNextJourney()
    } else {
      await this._checkInAtStationIfPossible()
    }
  }

  /**
   * Checks in at the next station if possible based on the current journey state.
   *
   * Retrieves the current journey details and determines if the train should be checked in at the current station.
   * If the estimated arrival time is imminent and a train is found, checks in the train at the station.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _checkInAtStationIfPossible() {
    const journey = await this.swissRailwaysContractOperator.getJourney();

    const journeyRef = journey.journeyRef;
    const nextStopIndex = journey.currentStop === null ? 0 : journey.currentStop + 1;
    const isLastStop = nextStopIndex === journey.stopRefs.length - 1;
    const stopRef = journey.stopRefs[nextStopIndex];
    const stopName = STOP_REF_NAME_MAP[stopRef];

    const timetableArrivalTime = Number(
      journey.stopTimetable[nextStopIndex] / 1000n,
    );
    const estimatedArrival = fromUnixTime(timetableArrivalTime);

    const timeDifference = differenceInMinutes(estimatedArrival, new Date());
    if (timeDifference > 1) {
      console.log(
        "Train from Basel SBB to Zürich HB should reach ",
        stopName,
        "  in ",
        timeDifference,
        " minutes",
      );
      return;
    }

    const type = isLastStop ? "arrival" : "departure";
    const foundTrains = await this.swissRailwaysApi.findTrainsAtStationByJourneyRef(
      stopRef,
      journeyRef,
      estimatedArrival,
      type,
    );
    if (foundTrains.length === 0) {
      console.error("No matching trains found in ", stopName);
      return;
    }

    const firstTrain = foundTrains[0];
    const stationTime = isLastStop ? firstTrain.arrivalData: firstTrain.departureData;

    if (stationTime !== null) {
      const timeTableInSeconds = parseInt(
        stationTime.timetableTime.getTime() / 1000,
      )
      ;
      const checkInTimeSeconds = timeTableInSeconds + stationTime.delayMinutes * 60;
      await this.swissRailwaysContractOperator.checkIn(
        nextStopIndex,
        checkInTimeSeconds,
      );

      console.log(
        "Train from Basel SBB to Zürich HB checked-in at ",
        fromUnixTime(checkInTimeSeconds),
        " in ",
        stopName,
      );
    } else {
      console.error("No arrival & departure data found.", firstTrain);
    }
  }

  /**
   * Schedules the next train journey based on the current train data.
   *
   * Finds available trains by route and schedules the journey with the Swiss Railways smart contract.
   * Updates the journey details including start and end times, and intermediate stop points.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _scheduleNextJourney() {
    const startDate = new Date();
    const foundTrains = await this.swissRailwaysApi.findTrainsByRoute(
      START_PLACE_REF,
      FINISH_PLACE_REF,
      TRAIN_NUMBER,
      startDate,
    );

    const trainsEndingAtFinish = foundTrains.filter(
      (train) => train.destinationStopPlace.stopPlaceRef === FINISH_PLACE_REF,
    );
    if (trainsEndingAtFinish.length === 0) {
      console.log("No trains found.");
      return;
    }

    const firstTrain = trainsEndingAtFinish[0];
    const startDatetime = firstTrain.startDatetime.getTime();
    const endDatetime = firstTrain.endDatetime.getTime();
    const stopTimetable = [
      startDatetime,
      ...firstTrain.intermediateStopPoints.map((stop) =>
        stop.arrivalData.timetableTime.getTime(),
      ),
      endDatetime,
    ];

    await this.swissRailwaysContractOperator.scheduleJourney(
      firstTrain.journeyRef,
      startDatetime,
      endDatetime,
      STOP_REFS,
      stopTimetable,
    );

    console.log(
      "Scheduled next train from Basel SBB to Zürich HB in ",
      differenceInMinutes(firstTrain.startDatetime, new Date()),
      " minutes",
    );
  }
}
