// import pg from "pg-pool";
// const {Pool} = pg;

// const {Pool, Client} = require("pg");
import pg from "pg";
import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import * as fs from "fs";
import {orderBy} from "natural-orderby";

// import {Pool} from "pg-pool";

const pool = new pg.Pool({
  user: "harshasomisetty",
  host: "localhost",
  database: "chain_metrics",
  password: "password",
  port: "5432",
});

async function addTest() {
  pool.query(
    "INSERT INTO data(signature, blockTime, slot)VALUES('lskdjfs', 1651640354000, 2202)",
    (err, res) => {
      console.log(err, res);
      pool.end();
    }
  );

  console.log("done");
}

async function setupTable() {
  pool.query("IF EXISTS(SELECT * FROM data) DROP TABLE data");
  pool.query(
    "CREATE TABLE data (signature TEXT PRIMARY KEY, blockTime BIGINT, slot INT)"
  );
}

async function bulkInsert(dir_string) {
  let filenames = fs.readdirSync(dir_string).reverse();
  let dstring = dir_string + "/" + filenames[5];
  console.log("reading file", dstring);
  let signatures = JSON.parse(fs.readFileSync(dstring, "utf-8"));

  signatures.forEach(
    (ele, index) =>
      (signatures[index] = {
        signature: ele["signature"],
        blockTime: ele["blockTime"],
        slot: ele["slot"],
      })
  );
  console.log("stuff", signatures[0]);

  // client.query(
  //   "INSERT INTO table (columns) " +
  //     "SELECT m.* FROM json_populate_recordset(null::your_custom_type, $1) AS m",
  //   [JSON.stringify(your_json_object_array)],
  //   function (err, result) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       console.log(result);
  //     }
  //   }
  // );
}

addTest();

// setupTable();

// bulkInsert("devnet2");
