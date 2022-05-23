import pandas as pd

net = "devnet"
connection_string = net + "_final_statistics.json"

def get_df(timeFrame = "D"):

    df = pd.read_json(connection_string)
    timestamp = df["date"]

    tstamp = pd.to_datetime(timestamp)

    df.index = tstamp
    df = df.resample(timeFrame).sum()
    return df


def plot_data():
    final_df = get_df("D")
    print("\n***\n", final_df)
    print(final_df.values)
    
    final_df.plot()
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





