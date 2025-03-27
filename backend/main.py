from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import snowflake.connector
import uuid
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_snowflake_connection():
    return snowflake.connector.connect(
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        warehouse="COMPUTE_WH",
        database="DRR",
        schema="DRRSCHEMA"
    )

# Updated LoanApplication model with new fields for borrower and loanId,
# plus the additional qualitative metric fields.
class LoanApplication(BaseModel):
    lineOfBusiness: str
    propertyType: str
    loanType: str
    dscr: float
    occupancy: float
    ltv: float
    borrower: str | None = None
    loanId: str | None = None

    # Qualitative rating fields (optional)
    LeaseExpiration: int | None = None
    TenantRating: int | None = None
    AccessToCapitalMarkets: int | None = None
    Liquidity: int | None = None
    MarketRent: int | None = None
    GuarantorNetWorth: int | None = None
    NumberOfUnits: int | None = None
    EconomicOutlook: int | None = None
    CollateralValue: int | None = None

    # New qualitative metric value fields (optional)
    LeaseExpiration_Value: float | None = None
    TenantRating_Value: float | None = None
    AccessToCapitalMarkets_Value: float | None = None
    Liquidity_Value: float | None = None
    MarketRent_Value: float | None = None
    GuarantorNetWorth_Value: float | None = None
    NumberOfUnits_Value: float | None = None
    EconomicOutlook_Value: float | None = None
    CollateralValue_Value: float | None = None

    # BRG Fields
    quantitative_brg: float
    adjustment_score_brg: float
    q_adjusted_brg: float
    weighted_brg: float
    final_brg: float

    # FRG Fields
    quantitative_frg: float
    adjustment_score_frg: float
    q_adjusted_frg: float
    final_frg: float

    # Override Fields
    overrideEnabled: bool
    override_brg: float | None = None
    override_frg: float | None = None
    justification: str | None = None

@app.post("/submit-loan")
def submit_loan(data: LoanApplication):
    try:
        conn = get_snowflake_connection()
        cur = conn.cursor()

        loan_id = str(uuid.uuid4())
        submitted_at = datetime.now()

        # Build dictionary of all non-null fields from the incoming data.
        # This will automatically include borrower and loanId if provided.
        all_fields = {k: v for k, v in data.dict().items() if v is not None}
        # Add the submitted timestamp.
        all_fields["SUBMITTED_AT"] = submitted_at

        # Build the SQL query dynamically.
        # Prepend "ID" to the keys from all_fields.
        fields = ", ".join(["ID"] + list(all_fields.keys()))
        # Create placeholders (%s) for each value.
        placeholders = ", ".join(["%s"] * (len(all_fields) + 1))

        query = f"""
            INSERT INTO DRR.DRRSCHEMA.LoanApplications (
                {fields}
            ) VALUES (
                {placeholders}
            )
        """

        values = [loan_id] + list(all_fields.values())

        cur.execute(query, values)
        conn.commit()
        cur.close()
        conn.close()

        return {"message": "Loan application submitted successfully", "loan_id": loan_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))