import * as Contract from "@stellar/stellar-sdk/contract";

const specEntries = [
  "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAAgAAAAAAAAAAAAAACE9wZXJhdG9yAAAAAAAAAAAAAAANSm91cm5leVN0YXR1cwAAAA==",
  "AAAAAwAAAAAAAAAAAAAADUpvdXJuZXlTdGF0dXMAAAAAAAADAAAAAAAAAAlVbnBsYW5uZWQAAAAAAAAAAAAAAAAAAAlTY2hlZHVsZWQAAAAAAAABAAAAAAAAAAdPbmdvaW5nAAAAAAI=",
  "AAAAAQAAAAAAAAAAAAAAB0pvdXJuZXkAAAAABgAAAAAAAAAMY3VycmVudF9zdG9wAAAABAAAAAAAAAALam91cm5leV9yZWYAAAAADgAAAAAAAAAOam91cm5leV9zdGF0dXMAAAAAB9AAAAANSm91cm5leVN0YXR1cwAAAAAAAAAAAAANc3RvcF9hcnJpdmFscwAAAAAAA+oAAAAGAAAAAAAAAAlzdG9wX3JlZnMAAAAAAAPqAAAABAAAAAAAAAAOc3RvcF90aW1ldGFibGUAAAAAA+oAAAAG",
  "AAAAAAAAAAAAAAAEaW5pdAAAAAEAAAAAAAAACG9wZXJhdG9yAAAAEwAAAAA=",
  "AAAAAAAAAAAAAAALZ2V0X2pvdXJuZXkAAAAAAAAAAAEAAAfQAAAAB0pvdXJuZXkA",
  "AAAAAAAAAAAAAAASaGFzX2FjdGl2ZV9qb3VybmV5AAAAAAAAAAAAAQAAAAE=",
  "AAAAAAAAAAAAAAAQc2NoZWR1bGVfam91cm5leQAAAAUAAAAAAAAAC2pvdXJuZXlfcmVmAAAAAA4AAAAAAAAADmRlcGFydHVyZV90aW1lAAAAAAAGAAAAAAAAAAxhcnJpdmFsX3RpbWUAAAAGAAAAAAAAAAlzdG9wX3JlZnMAAAAAAAPqAAAABAAAAAAAAAAOc3RvcF90aW1ldGFibGUAAAAAA+oAAAAGAAAAAQAAAAQ=",
  "AAAAAAAAAAAAAAAIY2hlY2tfaW4AAAACAAAAAAAAAApzdG9wX2luZGV4AAAAAAAEAAAAAAAAAAxhcnJpdmFsX3RpbWUAAAAGAAAAAA==",
];

const operatorPublicKey = "GCS4KEVYH5AMDNCPDYKKWFSJNRK4CBUPZIIO6FNFEK3NWTDJX6N26MW5";
const contractAddress = "CCQ4Z4MA2V3VU5A5PWOAPM7OG7KNRFXC4X37WSKD3Y7VW7OINIS3ECBU";

const main = async () => {
  const specs = new Contract.Spec(specEntries);
  const client = new Contract.Client(specs, {
    rpcUrl: "https://soroban-testnet.stellar.org:443",
    contractId: contractAddress,
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: contractAddress,
    publicKey: operatorPublicKey,
  });

  const tx = await client.get_journey();
  const journey = specs.funcResToNative(
    "get_journey",
    tx.simulation.result.retval,
  );
  console.log("Journey:", journey);

  console.log("\njourneyRef:", journey.journey_ref.toString());
};

// Run the script:
// TZ=UTC node --es-module-specifier-resolution=node cli/wallet-read-only.js
main();
