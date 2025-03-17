import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { TextField, MenuItem, Button, Container, Typography, Switch, FormControlLabel } from "@mui/material";
import axios from "axios";

const LoanForm = () => {
  const { handleSubmit, control, watch } = useForm();
  const loanType = watch("loanType");
  const dscr = watch("dscr") || 0;
  const ltv = watch("ltv") || 0;

  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideBRG, setOverrideBRG] = useState("");
  const [overrideFRG, setOverrideFRG] = useState("");
  const [justification, setJustification] = useState("");
  const [responseMessage, setResponseMessage] = useState("");

  // BRG Calculation
  const calculateBRG = () => {
    if (loanType === "CRE") {
      if (dscr >= 1.5) return "Low Risk (BRG 1)";
      if (dscr >= 1.2) return "Moderate Risk (BRG 2)";
      return "High Risk (BRG 3)";
    }
    return "N/A";
  };

  // FRG Calculation
  const calculateFRG = () => {
    if (loanType === "CRE") {
      if (ltv <= 60) return "Low Risk (FRG 1)";
      if (ltv <= 80) return "Moderate Risk (FRG 2)";
      return "High Risk (FRG 3)";
    }
    return "N/A";
  };

  // Submit Data to FastAPI
  const onSubmit = async (data: any) => {
    const finalBRG = overrideEnabled && overrideBRG ? overrideBRG : calculateBRG();
    const finalFRG = overrideEnabled && overrideFRG ? overrideFRG : calculateFRG();

    const payload = {
      loanType: data.loanType,
      dscr: data.dscr,
      ltv: data.ltv,
      brg: finalBRG,
      frg: finalFRG,
      overrideEnabled: overrideEnabled,
      overrideBRG: overrideEnabled ? overrideBRG : null,
      overrideFRG: overrideEnabled ? overrideFRG : null,
      justification: overrideEnabled ? justification : null
    };

    try {
      const response = await axios.post("http://127.0.0.1:8000/submit-loan", payload);
      setResponseMessage(`Success! Loan ID: ${response.data.loan_id}`);
    } catch (error) {
      setResponseMessage("Error submitting loan application. Please try again.");
      console.error("Submission error:", error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h5" gutterBottom>
        Loan Application
      </Typography>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="loanType"
          control={control}
          defaultValue=""
          render={({ field }) => (
            <TextField {...field} select fullWidth label="Loan Type" margin="normal">
              <MenuItem value="CRE">Commercial Real Estate (CRE)</MenuItem>
              <MenuItem value="Auto">Auto Loan</MenuItem>
              <MenuItem value="Personal">Personal Loan</MenuItem>
            </TextField>
          )}
        />

        {loanType === "CRE" && (
          <>
            <Controller
              name="dscr"
              control={control}
              defaultValue=""
              render={({ field }) => <TextField {...field} fullWidth label="DSCR" margin="normal" type="number" />}
            />
            <Controller
              name="ltv"
              control={control}
              defaultValue=""
              render={({ field }) => <TextField {...field} fullWidth label="LTV" margin="normal" type="number" />}
            />
          </>
        )}

        <Typography variant="h6" color="primary">
          BRG Score: {overrideEnabled ? overrideBRG : calculateBRG()}
        </Typography>
        <Typography variant="h6" color="secondary">
          FRG Score: {overrideEnabled ? overrideFRG : calculateFRG()}
        </Typography>

        <FormControlLabel
          control={
            <Switch 
              checked={overrideEnabled} 
              onChange={() => setOverrideEnabled(!overrideEnabled)} 
            />
          }
          label="Override BRG/FRG Score"
        />

        {overrideEnabled && (
          <>
            <TextField fullWidth label="Override BRG Score" margin="normal" value={overrideBRG} onChange={(e) => setOverrideBRG(e.target.value)} />
            <TextField fullWidth label="Override FRG Score" margin="normal" value={overrideFRG} onChange={(e) => setOverrideFRG(e.target.value)} />
            <TextField fullWidth label="Justification for Override" margin="normal" multiline rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} />
          </>
        )}

        <Button type="submit" variant="contained" color="primary" fullWidth>
          Submit
        </Button>

        {responseMessage && (
          <Typography variant="body1" color="secondary" style={{ marginTop: "20px" }}>
            {responseMessage}
          </Typography>
        )}
      </form>
    </Container>
  );
};

export default LoanForm;