import os
import pickle
from snowflake.snowpark import Session
from snowflake.ml.registry import Registry

connection_name = os.getenv("SNOWFLAKE_CONNECTION_NAME", "SFSEEUROPE-EU_DEMO86")
session = Session.builder.config("connection_name", connection_name).create()

print("Connected to Snowflake")

reg = Registry(session=session, database_name="CUSTOMER_DEMO", schema_name="PUBLIC")

model_ref = reg.get_model("CROSS_SELL_PROPENSITY")
model_version = model_ref.version("V1")

print("Loading model from registry...")
native_model = model_version.load()
print(f"Model type: {type(native_model)}")

model_dir = "model"
os.makedirs(model_dir, exist_ok=True)

model_path = os.path.join(model_dir, "cross_sell_model.pkl")
with open(model_path, "wb") as f:
    pickle.dump(native_model, f)

print(f"Model exported to: {model_path}")

with open(model_path, "rb") as f:
    loaded_model = pickle.load(f)

import pandas as pd
test_input = pd.DataFrame({
    'AGE': [45],
    'INCOME_BRACKET_ENC': [4],
    'HOMEOWNER_STATUS_NUM': [1],
    'TOTAL_PENSION_VALUE': [150000],
    'TOTAL_PENSIONS': [2],
    'RISK_CATEGORY_ENC': [1],
    'RISK_SCORE': [5],
    'INVESTMENT_KNOWLEDGE_ENC': [2],
    'MARKETING_ENGAGEMENT_ENC': [1],
    'HAS_PENSIONS_NUM': [1],
    'HAS_ISA_NUM': [0]
})

proba = loaded_model.predict_proba(test_input)
print(f"Test prediction: {proba[0][1]:.4f}")

session.close()
print("Done!")
