import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import * as fs from "fs";
import {orderBy} from "natural-orderby";

let file_name = "data";

let bpfPubkey = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

function dataFile(dir_string) {
  let filenames = orderBy(fs.readdirSync(dir_string));
  return parseInt(filenames.at(-1).replace(file_name, "").replace(".json", ""));
}

function latestDataFile(dir_string) {
  let file_num = dataFile(dir_string);
  return dir_string + "/" + file_name + file_num + ".json";
}

function newDataFile(dir_string) {
  let file_num = dataFile(dir_string) + 1;
  return dir_string + "/" + file_name + file_num + ".json";
}

async function queryAccount(con_string) {
  let connection = new Connection(clusterApiUrl(con_string), "confirmed");

  let interactionFile = latestDataFile(con_string);

  let signatures;

  for (let i = 0; i < 3000; i++) {
    let allBPFs = JSON.parse(fs.readFileSync(interactionFile, "utf-8"));

    if (allBPFs.length > 0) {
      signatures = await connection.getConfirmedSignaturesForAddress2(
        bpfPubkey,
        {before: allBPFs.at(-1).signature, limit: 1000}
      );
    } else {
      signatures = await connection.getConfirmedSignaturesForAddress2(
        bpfPubkey,
        {limit: 1000}
      );
    }
    allBPFs = allBPFs.concat(signatures);
    console.log("iter", i, signatures[0]);
    let date = new Date(signatures[0]["blockTime"] * 1000);
    console.log("time", date);
    console.log("final length", allBPFs.length);
    fs.writeFileSync(interactionFile, JSON.stringify(allBPFs));

    await new Promise((r) => setTimeout(r, 400));
  }

  // allBPFs.map((x) => console.log(x.slot));
}

async function transferFile(con_string) {
  let interactionFile = latestDataFile(con_string);
  let interactionFile1 = newDataFile(con_string);

  let allBPFs = JSON.parse(fs.readFileSync(interactionFile, "utf-8"));
  let lastRecord = [allBPFs.at(-1)];
  // fs.writeFileSync(interactionFile1,);
  // fs.closeSync(fs.openSync(interactionFile1, "a"));
  fs.writeFileSync(interactionFile1, JSON.stringify(lastRecord));
}

let con_string = "devnet";

// transferFile(con_string);
queryAccount(con_string);
