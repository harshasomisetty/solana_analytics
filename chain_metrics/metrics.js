import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import {promises as fs} from "fs";

let connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

async function queryBlock() {
  let slot = await connection.getSlot();
  console.log(slot);

  let blockTime = await connection.getBlockTime(slot);
  console.log(blockTime);

  let block = await connection.getBlock(slot);
  console.log(block);
}

async function queryAccount() {
  let allBPFs = [];
  let fromSig = -1;
  let bpfPubkey = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
  console.log(bpfPubkey.toString());
  let signatures;
  for (let i = 0; i < 2; i++) {
    if (allBPFs.length > 0) {
      signatures = await connection.getConfirmedSignaturesForAddress2(
        bpfPubkey,
        {before: allBPFs.at(-1).signature, limit: 5}
      );
    } else {
      signatures = await connection.getConfirmedSignaturesForAddress2(
        bpfPubkey,
        {limit: 5}
      );
    }
    allBPFs = allBPFs.concat(signatures);
  }
  // console.log(allBPFs.at(-1));
  console.log(allBPFs);
  await fs.writeFile("BPFInteraction.json", JSON.stringify(allBPFs));
  // allBPFs.map((x) => console.log(x.slot));
}

queryAccount();
