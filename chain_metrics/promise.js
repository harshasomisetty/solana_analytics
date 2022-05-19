import {createRequire} from "module";
import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import * as fs from "fs";
import {orderBy} from "natural-orderby";

const require = createRequire(import.meta.url);
const promise = require("bluebird"); // or any other Promise/A+ compatible library;
const initOptions = {
  promiseLib: promise, // overriding the default (ES6 Promise);
};

let tableName = "data2";
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

function getSigs(dstring) {
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

async function bulkInsert() {
  let dir_string = "devnet";
  let filenames = fs.readdirSync(dir_string).reverse();

  for (var i = 0; i < 1; i++) {
    let dstring = dir_string + "/" + filenames[i];

    let signatures = getSigs(dstring);

    const cs = new pgp.helpers.ColumnSet(["signature", "blocktime", "slot"], {
      table: tableName,
    });

    const conflict =
      " ON CONFLICT(signature) DO UPDATE SET " +
      cs.assignColumns({from: "EXCLUDED", skip: ["signature"]});

    const query = pgp.helpers.insert(signatures, cs) + conflict;
    await db.none(query);
  }
}

async function allQueries() {
  await setupTable();
  // await addTest();
  await bulkInsert();
  await readDb();
  // await convertData();
}

async function random() {
  let dstring = "devnet" + "/" + "data9.json";

  let signatures = getSigs(dstring);
  signatures.forEach((ele, index) => {
    if (ele["blocktime"] < 1649600716) {
      console.log(ele);
    }
  });
}
// allQueries();
random();
