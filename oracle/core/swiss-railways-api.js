import * as OJP from "ojp-sdk";
import assert from "node:assert";

/**
 * @typedef {Object} StageConfig
 * @property {string} key - The API key for authentication.
 * @property {string} apiEndpoint - The base URL for the API endpoint.
 * @property {string} authBearerKey - The authentication bearer token.
 */

/**
 * Represents the Swiss Federal Railways (SBB) API.
 * The Swiss Federal Railways (SBB) is the national railway company of Switzerland.
 *
 * Provides methods to interact with the SBB API for fetching train information,
 * including finding trains by route and retrieving train details at a specific station.
 *
 * @class
 */
export class SwissRailwaysApi {
  /**
   * The stage configuration for the SBB API.
   *
   * @type {StageConfig | null}
   */
  stageToken;

  /**
   * Creates an instance of the Sbb class.
   *
   * @param {string} key - The API key for authentication.
   * @param {string} apiEndpoint - The base URL for the API endpoint.
   * @param {string} authBearerKey - The authentication bearer token.
   */
  constructor(key, apiEndpoint, authBearerKey) {
    assert(key != null, "key is required");
    assert(apiEndpoint != null, "apiEndpoint is required");
    assert(authBearerKey != null, "authBearerKey is required");
    this.stageToken = {
      key,
      apiEndpoint,
      authBearerKey,
    };
  }

  /**
   * Finds trains by route from a starting location to a destination.
   *
   * @param   {string}                    from - The starting location stop place reference.
   * @param   {string}                    to - The destination location stop place reference.
   * @param   {string}                    serviceLine - The service line identifier.
   * @param   {Date}                      [date=new Date()] - The date for the trip as a JavaScript Date object. Defaults to the current date if not provided.
   * @param   {'Dep' | 'Arr'}             [type='Dep'] - The type of request, either 'Dep' for departures or 'Arr' for arrivals. Defaults to 'Dep' if not provided.
   * @returns {Promise<Array<Object>>}    A promise that resolves with an array of train route details or rejects with an error.
   */
  async findTrainsByRoute(
    from,
    to,
    serviceLine,
    date = new Date(),
    type = "Dep",
  ) {
    const fromLocation = OJP.Location.initWithStopPlaceRef(from);
    const toLocation = OJP.Location.initWithStopPlaceRef(to);

    const request = OJP.TripRequest.initWithLocationsAndDate(
      this.stageToken,
      fromLocation,
      toLocation,
      date,
      type,
    );
    assert(request != null, "Request is invalid");

    return new Promise((resolve, reject) => {
      request.fetchResponseWithCallback((response) => {
        if (response.message === "TripRequest.ERROR") {
          reject(response.error);
        } else if (response.message === "TripRequest.DONE") {
          const result = response.trips.reduce((acc, trip) => {
            // TODO(mateush): Implement support for multileg only
            if (trip.legs.length !== 1) {
              return acc;
            }

            const legIndex = 0;
            const { journeyRef, serviceLineNumber, journeyNumber } =
              trip.legs[legIndex].service;

            if (serviceLineNumber !== serviceLine) {
              return acc;
            }

            const destinationStopPlace =
              trip.legs[legIndex].service.destinationStopPlace;
            const { arrivalData, departureData, sequenceOrder, location } =
              trip.legs[legIndex].fromStopPoint;
            const { distanceMeters, duration, startDatetime, endDatetime } =
              trip.stats;

            const intermediateStopPoints = trip.legs[
              legIndex
            ].intermediateStopPoints.map(this.transformStopEvent);

            const nextTrip = {
              journeyRef,
              serviceLineNumber,
              journeyNumber,
              distanceMeters,
              durationInMinutes: duration.totalMinutes,
              startDatetime,
              endDatetime,
              stopPlace: {
                stopPlaceRef: location.stopPlace.stopPlaceRef,
                stopPlaceName: location.stopPlace.stopPlaceName,
              },
              destinationStopPlace: {
                stopPlaceRef: destinationStopPlace.stopPlaceRef,
                stopPlaceName: destinationStopPlace.stopPlaceName,
              },
              arrivalData,
              departureData,
              sequenceOrder,
              intermediateStopPoints,
            };

            return [...acc, nextTrip];
          }, []);

          return resolve(result);
        }
      });
    });
  }

  /**
   * Finds trains at a station by the journey reference.
   *
   * @param   {string}                    station - The stop place reference of the station.
   * @param   {string}                    journeyRef - The journey reference identifier.
   * @param   {Date}                      [date=new Date()] - The date for the trip as a JavaScript Date object. Defaults to the current date if not provided.
   * @param   {'departure' | 'arrival'}   [type='departure'] - The type of request, either 'departure' or 'arrival'. Defaults to 'departure' if not provided.
   * @returns {Promise<Array<Object>>}    A promise that resolves with an array of train details or rejects with an error.
   *
   * The resolved array contains objects with the following structure:
   * @example
   * {
   *   journeyRef: "85:1234:0",
   *   serviceLineNumber: "IR36",
   *   journeyNumber: "1963",
   *   stopPlace: {
   *      stopPlaceRef: "8500010",
   *      stopPlaceName: "Bern"
   *   },
   *   arrivalData: null,
   *   departureData: {
   *      timetableTime: 2024-08-07T11:24:00.000Z,
   *      estimatedTime: 2024-08-07T11:24:00.000Z,
   *      delayMinutes: 0
   *   },
   *   sequenceOrder: 1,
   *   nextStops: [{
   *     sequenceOrder: 2,
   *     stopType: "Intermediate",
   *     stopPlace: {
   *         stopPlaceRef: "8500010",
   *         stopPlaceName: "Bern"
   *     },
   *     arrivalData: null,
   *     departureData: {
   *         timetableTime: 2024-08-07T11:24:00.000Z,
   *         estimatedTime: 2024-08-07T11:24:00.000Z,
   *         delayMinutes: 0
   *     }
   *   }]
   * }
   */
  async findTrainsAtStationByJourneyRef(
    station,
    journeyRef,
    date = new Date(),
    type = "departure",
  ) {
    const request = OJP.StopEventRequest.initWithStopPlaceRef(
      this.stageToken,
      station,
      type,
      date,
    );
    assert(request != null, "Request is invalid");

    const response = await request.fetchResponse();

    return response.stopEvents.reduce((acc, stopEvent) => {
      const { journeyService } = stopEvent;

      if (journeyService.journeyRef !== journeyRef) {
        return acc;
      }

      const { serviceLineNumber, journeyNumber } = journeyService;
      const { arrivalData, departureData, sequenceOrder, location } =
        stopEvent.stopPoint;

      const nextStops = stopEvent.nextStopPoints.map(this.transformStopEvent);

      const nextTrip = {
        journeyRef: journeyService.journeyRef,
        serviceLineNumber,
        journeyNumber,
        stopPlace: {
          stopPlaceRef: location.stopPlace.stopPlaceRef,
          stopPlaceName: location.stopPlace.stopPlaceName,
        },
        arrivalData,
        departureData,
        sequenceOrder,
        nextStops,
      };

      return [...acc, nextTrip];
    }, []);
  }

  /**
   * Transforms a stop event into a structured format.
   *
   * @param   {Object} stopEvent - The stop event object to transform.
   * @param   {string} stopEvent.departureData - The departure data of the stop event.
   * @param   {string} stopEvent.arrivalData - The arrival data of the stop event.
   * @param   {number} stopEvent.sequenceOrder - The sequence order of the stop event.
   * @param   {string} stopEvent.stopPointType - The type of the stop point.
   * @param   {Object} stopEvent.location - The location information of the stop event.
   * @param   {Object} stopEvent.location.stopPlace - The stop place information.
   * @param   {string} stopEvent.location.stopPlace.stopPlaceRef - The stop place reference.
   * @param   {string} stopEvent.location.stopPlace.stopPlaceName - The stop place name.
   * @returns {Object} - The transformed stop event.
   *
   * The returned object has the following structure:
   * {
   *   sequenceOrder: 2,
   *   stopType: "Intermediate",
   *   stopPlace: {
   *      stopPlaceRef: "8500010",
   *      stopPlaceName: "Bern"
   *   },
   *   arrivalData: null,
   *   departureData: {
   *       timetableTime: 2024-08-07T11:24:00.000Z,
   *       estimatedTime: 2024-08-07T11:24:00.000Z,
   *       delayMinutes: 0
   *   }
   * }
   */
  transformStopEvent(stopEvent) {
    const { departureData, arrivalData } = stopEvent;

    return {
      sequenceOrder: stopEvent.sequenceOrder,
      stopType: stopEvent.stopPointType,
      stopPlace: {
        stopPlaceRef: stopEvent.location.stopPlace.stopPlaceRef,
        stopPlaceName: stopEvent.location.stopPlace.stopPlaceName,
      },
      arrivalData,
      departureData,
    };
  }
}
