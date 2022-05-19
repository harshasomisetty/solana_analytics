import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import * as fs from "fs";
import {orderBy} from "natural-orderby";

let bpfPubkey = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

function dataFiles(dir_string) {
  let filenames = orderBy(fs.readdirSync(dir_string)).reverse();
  console.log(filenames);
}

function printStartEndDf(signatures) {
  if (signatures.length > 0) {
    let date1 = new Date(signatures[0]["blockTime"] * 1000);
    let date2 = new Date(signatures.at(-1)["blockTime"] * 1000);

    console.log("first date", date1, date1.getTime());
    console.log("second date", date2, date2.getTime());
    console.log("Length of df", signatures.length);
  } else {
    console.log("EMPTY DF");
  }
}

function strToDate(date_str) {
  console.log("date str", date_str);
  const month = parseInt(date_str.slice(0, 2)) - 1;
  const day = parseInt(date_str.slice(2, 4));
  const year = parseInt(date_str.slice(4, 8));
  console.log(month, day, year);
  let d = new Date(year, month, day);
  console.log(d);
  return d;
}

function dateFormat(date) {
  let year = date.getFullYear();
  let month = (date.getMonth() + 1).toString().padStart(2, "0");
  let day = date.getDate().toString().padStart(2, "0");
  return month + day + year;
}

function prevDate(date) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

function nextDate(date) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

function dirFormat(dstring) {
  return "devnet2/" + dstring + ".json";
}

async function readFile(dir_string, date_str) {
  // let filenames = fs.readdirSync(dir_string).reverse();
  // let dstring = dir_string + "/" + filenames[0];
  // console.log("reading file", dstring);
  let fileName = date_str + ".json";
  let dstring = dir_string + "/" + fileName;
  let date = strToDate(date_str);
  console.log("cur_date");
  console.log("prev date", prevDate(date));

  console.log("dateToStr", dateFormat(date));
  let youngestSig = -1;
  let oldestSig = -1;

  if (fs.existsSync(dstring)) {
    console.log("file exists");
    let curSignatures = JSON.parse(fs.readFileSync(dstring, "utf-8"));
    printStartEndDf(curSignatures);
    let prevDstring = dirFormat(dateFormat(prevDate(date)));
    let nextDstring = dirFormat(dateFormat(nextDate(date)));
    let prevSignatures = JSON.parse(fs.readFileSync(prevDstring, "utf-8"));
    let nextSignatures = JSON.parse(fs.readFileSync(nextDstring, "utf-8"));
    // oldestSig =
    // youngestSig =

    console.log(
      "prev",
      nextDstring,
      prevSignatures.at(0),
      prevSignatures.at(-1)
    );
    console.log(
      "next",
      nextDstring,
      nextSignatures.at(0),
      nextSignatures.at(-1)
    );
  } else {
    let filenames = fs.readdirSync(dir_string).reverse();
    console.log("not exists");

    if (fileName.localeCompare(filenames[0]) == -1) {
      // query file is older (sorted alpha before) the oldest existing file
      console.log("requested file is older than oldest data");
      // oldestSig =
    } else {
      console.log("requested file is recenter than latest data");
      // youngestSig =
    }
  }
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

async function totalFunction() {
  let con_string = "devnet2";

  readFile(con_string, "06012022");
  console.log("\n");
  readFile(con_string, "04012022");
  console.log("\n");
  readFile(con_string, "02012022");
  console.log("\n");
  // readFile("devnet2");
  // transferFile(con_string);
  // queryAccount(con_string);
}

totalFunction();
