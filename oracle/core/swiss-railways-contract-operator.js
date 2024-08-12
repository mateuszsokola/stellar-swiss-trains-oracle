import assert from "node:assert";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { Client } from "@stellar/stellar-sdk/contract";
import { swissRailwaysContractSpecs } from "./swiss-railways-contract-specs.js";

const MAX_UINT32 = 4294967295;
const MAX_UINT64 = 18446744073709551615n;

/**
 * Represents the Swiss Railway Contract Operator Interface.
 *
 * This smart contract writes and read data regarding the journeys of the IR36 train on Stellar blockchain.
 * Not only allowing for operations such as checking the status of journeys, scheduling new journeys,
 * and checking in at specific stops.
 *
 * @class
 */
export class SwissRailwaysContractOperator {
  /**
   * The Stellar SDK Contract client for interacting with the smart contract.
   */
  client;

  /**
   * Creates an instance of SwissRailwaysContractOperator.
   *
   * @param {string} contractId - The contract ID for the Swiss Railways smart contract.
   * @param {string} operatorPrivateKey - The private key of the operator.
   * @param {string} rpcUrl - The RPC URL for the Soroban network.
   * @param {string} networkPassphrase - The passphrase for the Soroban network.
   */
  constructor(contractId, operatorPrivateKey, rpcUrl, networkPassphrase) {
    assert(contractId != null, "Contract ID is required");
    assert(operatorPrivateKey != null, "Operator Private Key is required");
    assert(rpcUrl != null, "Soroban RPC URL is required");
    assert(networkPassphrase != null, "Soroban Network Passphrase is required");

    const sourceKeypair = Keypair.fromSecret(operatorPrivateKey);
    this.client = new Client(swissRailwaysContractSpecs, {
      rpcUrl,
      contractId,
      networkPassphrase,
      contractId,
      publicKey: sourceKeypair.publicKey(),
      signTransaction: async (tx, opts) => {
        const t = TransactionBuilder.fromXDR(tx, opts.networkPassphrase);
        t.sign(sourceKeypair);

        return t.toXDR();
      },
      signAuthEntry: async (entryXdr) =>
        sourceKeypair
          .sign(hash(Buffer.from(entryXdr, "base64")))
          .toString("base64"),
    });

    console.log(new Date(), " Operator Account public key: ", sourceKeypair.publicKey());
  }

  /**
   * Retrieves details of the current journey.
   *
   * @returns  {Promise<Object>}  - An object containing details about the current journey.
   * @property {string}           journeyRef - The reference of the journey, or null if there is no current journey.
   * @property {number|null}      currentStop - The current stop index, or null if not available.
   * @property {string}           journeyStatus - The status of the journey, e.g., 'unplanned', 'scheduled', 'ongoing'.
   * @property {Array<string>}    stopRefs - References for the stops.
   * @property {Array<bigint>}    stopTimetable - Timetable for the stops.
   * @property {Array<bigint>}    stopArrivals - Arrival times for the stops, or null if not available.
   *
   * @example
   * {
   *   journeyRef: "ch:1:sjyid:100001:1963-001",
   *   currentStop: 1,
   *   journeyStatus: "ongoing",
   *   stopRefs: [8500010, 8500301, ..., 8503000],
   *   stopTimetable: [1723356690000n, ..., 1723361028000n],
   *   stopTimetable: [1723356750n, null, null, ..., null]
   * }
   */
  async getJourney() {
    const tx = await this.client.get_journey();
    const journey = swissRailwaysContractSpecs.funcResToNative(
      "get_journey",
      tx.simulation.result.retval,
    );

    return {
      journeyRef: journey.journey_ref.toString(),
      currentStop:
        journey.current_stop == MAX_UINT32 ? null : journey.current_stop,
      journeyStatus: ["unplanned", "scheduled", "ongoing"][
        journey.journey_status
      ],
      stopRefs: journey.stop_refs,
      stopTimetable: journey.stop_timetable,
      stopArrivals: journey.stop_arrivals.map((a) =>
        a == MAX_UINT64 ? null : a,
      ),
    };
  }

  /**
   * Schedules a new journey.
   *
   * @param {string}              journeyRef - The reference for the journey.
   * @param {number}              departureTime - The departure time of the journey.
   * @param {number}              arrivalTime - The arrival time of the journey.
   * @param {Array<string>}       stopRefs - References for the stops.
   * @param {Array<Object>}       stopTimetable - Timetable for the stops.
   * @returns {Promise<Object>}   - The result of the transaction.
   */
  async scheduleJourney(
    journeyRef,
    departureTime,
    arrivalTime,
    stopRefs,
    stopTimetable,
  ) {
    const journey_ref = Buffer.from(journeyRef, "ascii");
    const departure_time = departureTime;
    const arrival_time = arrivalTime;
    const stop_refs = stopRefs;
    const stop_timetable = stopTimetable;

    const tx = await this.client.schedule_journey({
      journey_ref,
      departure_time,
      arrival_time,
      stop_refs,
      stop_timetable,
    });
    
    const { result } = await tx.signAndSend();
    return result;
  }

  /**
   * Checks in at a specific stop.
   *
   * @param {number}              stopIndex - The index of the stop where the check-in is happening.
   * @param {number}              arrivalTime - The arrival time at the stop.
   * @returns {Promise<Object>}   - The result of the transaction.
   */
  async checkIn(stopIndex, arrivalTime) {
    const stop_index = stopIndex;
    const arrival_time = arrivalTime;

    const tx = await this.client.check_in({ stop_index, arrival_time });
    const { result } = await tx.signAndSend();

    return result;
  }
}
