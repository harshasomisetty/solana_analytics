import json
import pandas as pd
import matplotlib.pyplot as plt
import os
from natsort import natsorted

final_df = pd.DataFrame()
connection_string = "devnet/"
# connection_string = "mainnet-beta/"

file_num = 1
interactionFile = connection_string + "BPFInteraction" + str(file_num) + ".json";

for file in natsorted(os.listdir(connection_string)):
    print(file)
    df = pd.read_json(connection_string+file)
    df.index = pd.to_datetime(df["blockTime"], unit='s')
    df['Amount'] = 1
    bucket_df = df.resample("D").Amount.sum().sort_index()

    print("Bucket\n", bucket_df)
    if not final_df.empty:
        final_df = pd.concat([bucket_df, final_df])
    else:
        final_df = bucket_df

    # print("finaldf\n ", final_df)


final_df = final_df.groupby(final_df.index).sum().sort_index()

        
print("\n***\n", final_df)
print(f"num of transactions; {final_df.sum()}")
final_df.plot.line()
plt.title('BPFLoader Interactions')
plt.ylabel('Interaction Count')
plt.xlabel('Dates')
plt.show()






