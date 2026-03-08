import pandas as pd
import numpy as np

# Configuration
NUM_ROWS = 500
FILENAME = "large_dataset.xlsx"

# Generate Dummy Data
queries = [f"This is a stress test query number {i} to verify pagination performance." for i in range(NUM_ROWS)]
ground_truths = [f"The expected answer for query {i} should be accurate and concise." for i in range(NUM_ROWS)]
contexts = [f"Context document chunk {i} containing relevant information for retrieval." for i in range(NUM_ROWS)]
bot_a = [f"Bot A response for query {i}. This is a simulated response." for i in range(NUM_ROWS)]
bot_b = [f"Bot B response for query {i}. Typically slightly different from Bot A." for i in range(NUM_ROWS)]

df = pd.DataFrame({
    "Query": queries,
    "Ground Truth": ground_truths,
    "Context": contexts,
    "Bot_A": bot_a,
    "Bot_B": bot_b
})

# Save to Excel
df.to_excel(FILENAME, index=False)
print(f"Successfully generated {FILENAME} with {NUM_ROWS} rows.")
