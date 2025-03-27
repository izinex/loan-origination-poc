from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import snowflake.connector
import uuid
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()
    
# Enable CORS (Allow frontend to communicate with FastAPI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow requests from React frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Snowflake connection function
def get_snowflake_connection():
    return snowflake.connector.connect(
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        warehouse="COMPUTE_WH",
        database="DRR",
        schema="DRRSCHEMA"
    )

# Loan Application Data Model
class LoanApplication(BaseModel):
    propertyType: str
    loanType: str
    dscr: float
    occupancy: float
    ltv: float
    leaseExpiration: int
    tenantRating: int
    accessToCapitalMarkets: int
    liquidity: int

    # BRG Fields
    quantitative_brg: float
    adjustment_score_brg: float
    q_adjusted_brg: float
    weighted_brg: float    # New field added for the weighted BRG
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

# API route to save loan application to Snowflake
@app.post("/submit-loan")
def submit_loan(data: LoanApplication):
    try:
        conn = get_snowflake_connection()
        cur = conn.cursor()
        
        # Generate a unique ID for each loan
        loan_id = str(uuid.uuid4())

        # Insert data into Snowflake, including the new weighted_brg field.
        cur.execute("""
            INSERT INTO DRR.DRRSCHEMA.LoanApplications (
                id, propertyType, loanType, dscr, occupancy, ltv,
                leaseExpiration, tenantRating, accessToCapitalMarkets, liquidity,
                quantitative_brg, adjustment_score_brg, q_adjusted_brg, weighted_brg, final_brg,
                quantitative_frg, adjustment_score_frg, q_adjusted_frg, final_frg,
                overrideEnabled, override_brg, override_frg, justification
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s
            )
        """, (
            loan_id, data.propertyType, data.loanType, data.dscr, data.occupancy, data.ltv,
            data.leaseExpiration, data.tenantRating, data.accessToCapitalMarkets, data.liquidity,
            data.quantitative_brg, data.adjustment_score_brg, data.q_adjusted_brg, data.weighted_brg, data.final_brg,
            data.quantitative_frg, data.adjustment_score_frg, data.q_adjusted_frg, data.final_frg,
            data.overrideEnabled, data.override_brg if data.override_brg is not None else None,
            data.override_frg if data.override_frg is not None else None,
            data.justification if data.justification else None
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {"message": "Loan application submitted successfully", "loan_id": loan_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))