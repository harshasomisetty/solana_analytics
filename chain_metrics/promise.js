import {createRequire} from "module";
import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import * as fs from "fs";
import {orderBy} from "natural-orderby";

let bpfPubkey = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

const require = createRequire(import.meta.url);
const promise = require("bluebird"); // or any other Promise/A+ compatible library;
const initOptions = {
  promiseLib: promise, // overriding the default (ES6 Promise);
};

let con_string = "mainnet-beta";
let tableName = "mainnet_data";
const pgp = require("pg-promise")(initOptions);

const cn = {
  host: "localhost",
  port: "5432",
  user: "harshasomisetty",
  database: "chain_metrics",
  password: "password",
  allowExitOnIdle: true,
};

const db = pgp(cn);

async function setupTable() {
  await db.any("DROP TABLE IF EXISTS " + tableName, [true]);
  console.log("dropped table");

  await db.query(
    "CREATE TABLE " +
      tableName +
      " (signature TEXT PRIMARY KEY, blockTime BIGINT, slot INT)",
    [true]
  );
}

async function convertData() {
  db.query(
    "ALTER TABLE " +
      tableName +
      " ALTER COLUMN blocktime TYPE TIMESTAMP using to_timestamp(blocktime)",
    [true]
  )
    .then((data) => {
      console.log("DATA:", data); // print data;
    })
    .catch((error) => {
      console.log("ERROR:", error); // print the error;
    });
}

async function readDb() {
  db.query("select count(*) from " + tableName, [true])
    .then((data) => {
      console.log("DATA:", data); // print data;
    })
    .catch((error) => {
      console.log("ERROR:", error); // print the error;
    });
}

async function bulkInsert(signatures) {
  const cs = new pgp.helpers.ColumnSet(["signature", "blocktime", "slot"], {
    table: tableName,
  });

  const conflict =
    " ON CONFLICT(signature) DO UPDATE SET " +
    cs.assignColumns({from: "EXCLUDED", skip: ["signature"]});

  const query = pgp.helpers.insert(signatures, cs) + conflict;
  await db.none(query);
}

function readSigs(dstring) {
  console.log("reading file", dstring);
  let signatures = JSON.parse(fs.readFileSync(dstring, "utf-8"));

  signatures.forEach(
    (ele, index) =>
      (signatures[index] = {
        signature: ele["signature"],
        blocktime: ele["blockTime"],
        slot: ele["slot"],
      })
  );
  // console.log("stuff", signatures[0]);
  console.log("first", signatures.length);

  let newSigs = [
    ...new Map(signatures.map((item) => [item["signature"], item])).values(),
  ];
  return newSigs;
}

async function oldestExistingSig() {
  console.log("in func");
  let sig = await db.query(
    "select signature, blocktime from " +
      tableName +
      " where blocktime = (select MIN(blocktime) from " +
      tableName +
      ") limit 1;"
  );
  return sig[0]["signature"];
}

async function youngestExistingSig() {
  let sig = await db.query(
    "select signature, blocktime from " +
      tableName +
      " where blocktime = (select max(blocktime) from " +
      tableName +
      ") limit 1;"
  );
  return sig[0]["signature"];
}

async function querySigs(oldest = true) {
  let connection = new Connection(clusterApiUrl(con_string), "confirmed");
  let latest_sig;
  if (oldest) {
    console.log("in old");
    latest_sig = await oldestExistingSig();
  } else {
    console.log("in young");
    latest_sig = await youngestExistingSig();
  }

  let signatures;

  while (true) {
    try {
      if (oldest) {
        signatures = await connection.getConfirmedSignaturesForAddress2(
          bpfPubkey,
          {
            before: latest_sig,
            limit: 1000,
          }
        );
      } else {
        signatures = await connection.getConfirmedSignaturesForAddress2(
          bpfPubkey,
          {
            after: latest_sig,
            limit: 1000,
          }
        );
      }

      // console.log("got", signatures.length);
      signatures.forEach(
        (ele, index) =>
          (signatures[index] = {
            signature: ele["signature"],
            blocktime: ele["blockTime"],
            slot: ele["slot"],
          })
      );

      await bulkInsert(signatures);
      if (oldest) {
        latest_sig = signatures.at(-1)["signature"];
        console.log("queryied", signatures.at(-1)["blocktime"]);
      } else {
        latest_sig = signatures[0]["signature"];
      }
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.log("failed :(");
    }
  }
}

async function insertAllFiles() {
  let dir_string = con_string;
  let filenames = orderBy(fs.readdirSync(dir_string));

  for (var i = 0; i < filenames.length; i++) {
    let dstring = dir_string + "/" + filenames[i];

    let signatures = readSigs(dstring);

    await bulkInsert(signatures);
  }
}

async function reloadDatabase() {
  // console.log("uh");
  await setupTable();
  await insertAllFiles();
  // await readDb();
  // await convertData();
}

// reloadDatabase();
// querySigs();
