import "dotenv/config";
import assert from "node:assert";
import * as OJP from "ojp-sdk";
import { Oracle } from "./core/oracle.js";
import { SwissRailwaysApi } from "./core/swiss-railways-api.js";
import { SwissRailwaysContractOperator } from "./core/swiss-railways-contract-operator.js";

const SBB_KEY = process.env.SBB_KEY || OJP.DEFAULT_STAGE.key;
const SBB_API_ENDPOINT = process.env.SBB_API_ENDPOINT || OJP.DEFAULT_STAGE.apiEndpoint;
const SBB_AUTH_BEARER_KEY = process.env.SBB_AUTH_BEARER_KEY || OJP.DEFAULT_STAGE.authBearerKey;
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org:443";
const SOROBAN_NETWORK_PASSPHRASE = process.env.SOROBAN_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const CONTRACT_ID = process.env.CONTRACT_ID;
const OPERATOR_PRIVATE_KEY = process.env.OPERATOR_PRIVATE_KEY;
const PROCESSING_INTERVAL = process.env.PROCESSING_INTERVAL || 60; // seconds

assert(new Date().getTimezoneOffset() === 0, "Oracle must be run in UTC timezone.");
assert(CONTRACT_ID, "Stellar Swiss Trains Contract ID must be provided.");
assert(OPERATOR_PRIVATE_KEY, "Operator private key must be provided.");

const swissRailwaysApi = new SwissRailwaysApi(
  SBB_KEY,
  SBB_API_ENDPOINT,
  SBB_AUTH_BEARER_KEY,
);

const swissRailwaysContractOperator = new SwissRailwaysContractOperator(
  CONTRACT_ID,
  OPERATOR_PRIVATE_KEY,
  SOROBAN_RPC_URL,
  SOROBAN_NETWORK_PASSPHRASE,
);

const oracle = new Oracle(swissRailwaysContractOperator, swissRailwaysApi);

const main = async () => {
  console.log(new Date(), " Stellar Swiss Trains Oracle is now operating...");

  const task = async () => {
    await oracle.processTrains();
  };

  await task();
  setInterval(task, PROCESSING_INTERVAL * 1000);
};

main();
