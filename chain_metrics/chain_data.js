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
  console.log("Starting new file");
}

function dateFormat(date) {
  console.log("in method", date, date.getTimezoneOffset());
  let year = date.getFullYear();
  let month = (date.getMonth() + 1).toString().padStart(2, "0");
  let day = date.getDate().toString().padStart(2, "0");
  return "devnet2/" + month + day + year + ".json";
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

function seperateFiles(dir_string) {
  let filenames = orderBy(fs.readdirSync(dir_string));
  for (const rawname of filenames.slice(0, 3)) {
    let name = "devnet/" + rawname;
    let signatures = JSON.parse(fs.readFileSync(name, "utf-8"));

    let latestDate = new Date(signatures[0]["blockTime"] * 1000);

    let latestDay = new Date(
      latestDate.getFullYear(),
      latestDate.getMonth(),
      latestDate.getDate()
    );

    console.log("latest date start", latestDate, latestDate.getTime());

    console.log("latest day start", latestDay, latestDay.getTime());

    let dstring = dateFormat(latestDay);
    console.log("latest file", dstring);
    if (!fs.existsSync(dstring)) {
      console.log("not exists");
      fs.writeFileSync(dstring, JSON.stringify([]));
    } else {
      console.log("already exists!!");
    }

    let daySignatures = JSON.parse(fs.readFileSync(dstring, "utf-8"));
    printStartEndDf(daySignatures);
    let startIndex = 0;

    console.log("\n\nSTARTING LOOP\n\n");
    for (let i = 0; i < signatures.length; i++) {
      let sig = signatures[i];

      let curDate = new Date(sig["blockTime"] * 1000);
      if (curDate.getTime() < latestDay.getTime()) {
        console.log("breaking", curDate);
        console.log("append these:", startIndex, i);
        daySignatures = daySignatures.concat(signatures.slice(startIndex, i));
        fs.writeFileSync(dstring, JSON.stringify(daySignatures));

        latestDay = new Date(
          curDate.getFullYear(),
          curDate.getMonth(),
          curDate.getDate()
        );

        dstring = dateFormat(latestDay);
        if (!fs.existsSync(dstring)) {
          console.log("not exists");
          fs.writeFileSync(dstring, JSON.stringify([]));
        }

        printStartEndDf(daySignatures);

        daySignatures = JSON.parse(fs.readFileSync(dstring, "utf-8"));
        startIndex = i;
        console.log("new day, dstring", latestDay, dstring, "***\n\n\n");
      }
    }

    console.log("END OF FOR LOOP");
    daySignatures = daySignatures.concat(signatures.slice(startIndex));
    fs.writeFileSync(dstring, JSON.stringify(daySignatures));

    console.log("NEW FILE", latestDay);
  }
}

async function readFile(dir_string) {
  let filenames = fs.readdirSync(dir_string).reverse();
  let dstring = dir_string + "/" + filenames[0];
  console.log("reading file", dstring);
  let signatures = JSON.parse(fs.readFileSync(dstring, "utf-8"));
  printStartEndDf(signatures);
}
async function totalFunction() {
  let con_string = "devnet";

  seperateFiles(con_string);
  // readFile("devnet2");
  // transferFile(con_string);
  // queryAccount(con_string);
}

totalFunction();
