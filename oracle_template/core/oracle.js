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

    // TODO(mateush): Implement me
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
    // TODO(mateush): Implement me
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
    // TODO(mateush): Implement me
  }
}
