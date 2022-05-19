import json
import pandas as pd
import matplotlib.pyplot as plt
import os
from natsort import natsorted

connection_string = "devnet2/"
# connection_string = "mainnet-beta/"

file_num = 1

def get_df(timeFrame = "D"):

    final_df = pd.DataFrame()
    for file in natsorted(os.listdir(connection_string)):
        df = pd.read_json(connection_string+file)
        if df.empty:
            continue
        print(file)

        timestamp = df["blockTime"]
        
        tstamp = pd.to_datetime(timestamp, unit='s')
        # print("zero", tstamp)
        tstamp = tstamp.dt.tz_localize('UTC')
        # print("first", tstamp)
        tstamp = tstamp.dt.tz_convert('US/Central')
        # print("second", tstamp)
        # print("\nTSTAMP\n",tstamp.dt.date, "\n\n")
        df.index = tstamp
        df['Amount'] = 1

        # print("\nFINAL DF\n", df, "\n")
        bucket_df = df.resample("D").Amount.sum().sort_index()

        print("Bucket\n", bucket_df)
        if not final_df.empty:
            final_df = pd.concat([bucket_df, final_df])
        else:
            final_df = bucket_df

    final_df = final_df.groupby(final_df.index).sum().sort_index()

    return final_df


def plot_data():
    final_df = get_df("D")
    print("\n***\n", final_df)
    print(f"num of transactions; {final_df.sum()}")
    final_df.plot.line()
    plt.title('BPFLoader Interactions')
    plt.ylabel('Interaction Count')
    plt.xlabel('Dates')
    plt.show()
    final_df.to_csv("plotdata.csv")

def export_data():
    final_df = get_df("D")
    final_df.to_csv("timedata2.csv")


if __name__ == "__main__":
    plot_data()
    # export_data()





