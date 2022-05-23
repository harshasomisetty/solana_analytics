import {createRequire} from "module";
import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import * as fs from "fs";
import {orderBy} from "natural-orderby";
import request from "request";
import axios from "axios";
let bpfPubkey = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

const require = createRequire(import.meta.url);
const promise = require("bluebird"); // or any other Promise/A+ compatible library;
const initOptions = {
  promiseLib: promise, // overriding the default (ES6 Promise);
};

// let endpoint = "mainnet";
let endpoint = "devnet";
let con_string;
let tableName;

if (endpoint === "mainnet") {
  con_string = "mainnet-beta";
  tableName = "mainnet_data";
} else if (endpoint === "devnet") {
  con_string = "devnet";
  tableName = "devnet_data";
}

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
    latest_sig = await oldestExistingSig();
  } else {
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
  await setupTable();
  await insertAllFiles();
  // await readDb();
  // await convertData();
}

async function sampleTx() {
  // let query = await db.query("select * from devnet_data limit 300", [true]);
  let query = await db.query(
    "select * from " + tableName + " tablesample bernoulli(.0015)",
    [true]
  );
  let sigs = query.map((e) => e.signature);
  return sigs;
}
async function queryStatistics() {
  let url = "https://api.internal." + con_string + ".solana.com";

  let txs = await sampleTx();

  let res_data = txs.map((e) => {
    return {
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [e, "json"],
    };
  });

  let res = await axios.post(url, res_data);
  let data = res.data;

  let upgrades = 0;
  data.forEach((e, ind) => {
    let meta = e.result.meta;
    if (meta.hasOwnProperty("logMessages") && meta.logMessages.length > 0) {
      if (
        meta.logMessages.find((element) => {
          if (element.includes("Upgraded program")) {
            // console.log(e.result.transaction);
            return true;
          }
        })
      ) {
        upgrades += 1;
      }
    }
  });
  return [txs.length, upgrades];
}

async function statsTest() {
  let test_data = [];

  let testFile = con_string + "_test_data.json";
  for (let i = 0; i < 1000; i++) {
    try {
      test_data = await queryStatistics();
      console.log(test_data);
      let allTestData = JSON.parse(fs.readFileSync(testFile, "utf-8"));
      allTestData = [...allTestData, test_data];
      fs.writeFileSync(testFile, JSON.stringify(allTestData));
    } catch (error) {
      console.log("messed up", i);
    }
  }
  // console.log(final_data);
}

async function averageTx() {
  let testFile = con_string + "_test_data.json";
  let allTestData = JSON.parse(fs.readFileSync(testFile, "utf-8"));
  let final_data = [0, 0];

  allTestData.forEach((ele) => {
    final_data[0] += ele[0];
    final_data[1] += ele[1];
  });

  let avged_data =
    final_data[0] / allTestData.length / (final_data[1] / allTestData.length);

  return avged_data;
}

async function exportData() {
  console.log("in func");
  // let upgradeProportion = await averageTx();
  let upgradeProportion = 529.7876543209876;
  // console.log(upgradeProportion);
  let data = await db.query(
    "select date_trunc('hour', to_timestamp(blocktime)), count(1) from " +
      tableName +
      " group by 1 order by date_trunc"
  );

  let final_data = [];

  data.forEach((ele) => {
    // if (ele.count == 0) {
    // console.log(ele);
    // }
    final_data.push({
      date: ele.date_trunc,
      count: Math.round(parseInt(ele.count) / parseInt(upgradeProportion)),
    });
  });
  console.log(final_data);

  let writeFile = con_string + "_final_statistics.json";
  fs.writeFileSync(writeFile, JSON.stringify(final_data));
}

// statsTest();
exportData();

// reloadDatabase();
// querySigs();
