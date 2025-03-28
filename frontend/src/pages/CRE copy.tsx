import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Snackbar, Alert } from "@mui/material";
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Grid,
  Box,
  Button,
  Switch,
  FormControlLabel,
} from "@mui/material";
import axios from "axios"; // API request handling
import Header from "../components/Header";

const propertyTypes = [
  "Single-Family",
  "Multi-Family",
  "Retail",
  "Office",
  "Other",
  "Hotel",
  "Condo",
  "Industrial",
];

const loanTypes = [
  "Mortgage",
  "Permanent",
  "Interim",
  "Construction",
  "Bridge",
  "Line of Credit",
  "Revolver",
];

const dscrBins = [
  { max: 1.2369855, value: 2.32498757 },
  { max: 1.35681152, value: 2.10004291 },
  { max: 1.44827282, value: 1.80353039 },
  { max: 1.55134183, value: 1.57848138 },
  { max: Infinity, value: 1.31712093 },
];

const occupancyBins = [
  { max: 93.55830581, value: 2.15293931 },
  { max: 95.32196263, value: 2.04642977 },
  { max: 97.89075, value: 1.62917375 },
  { max: Infinity, value: 1.43304207 },
];

const propertyTypeBins: Record<string, number> = {
  Retail: 0.81092195,
  Office: 1.20790535,
  Other: 2.22592975,
  "Multi-Family": 1.13998781,
  Hotel: 1.71163097,
  Condo: 3.24368739,
  Industrial: 1.71280577,
  "Single-Family": 2.76797217,
};

const ltvBins = [
  { max: 30, value: 4 },
  { max: 66, value: 5 },
  { max: Infinity, value: 6 },
];

const qualitativeAdjustment: Record<number, number> = {
  1: -2,
  2: -1.2,
  3: -0.4,
  4: 0.4,
  5: 1.2,
  6: 2,
};
const qualitativeWeights: Record<string, number> = {
  "Lease Expiration": 0.4,
  "Tenant Rating": 0.35,
  "Access to Capital Markets": 0.25,
};

const qualitativeInputs = [
  "Lease Expiration",
  "Tenant Rating",
  "Access to Capital Markets",
  "Liquidity",
];
const qualitativeOptions = [1, 2, 3, 4, 5, 6];

const CRE: React.FC = () => {
  const navigate = useNavigate(); // Hook for navigation

  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedLoanType, setSelectedLoanType] = useState("");
  const [dscr, setDscr] = useState<number | "">("");
  const [occupancy, setOccupancy] = useState<number | "">("");
  const [ltv, setLtv] = useState<number | "">("");
  const [qualitativeValues, setQualitativeValues] = useState<Record<string, number>>({});
  const [override, setOverride] = useState<boolean>(false);
  const [overrideBRG, setOverrideBRG] = useState<number | "">("");
  const [overrideFRG, setOverrideFRG] = useState<number | "">("");
  const [justification, setJustification] = useState<string>("");

  // New states for API feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

  // New error states for numeric validations
  const [dscrError, setDscrError] = useState("");
  const [occupancyError, setOccupancyError] = useState("");
  const [ltvError, setLtvError] = useState("");

  const getBinValue = (
    value: number,
    bins: { max: number; value: number }[]
  ) => bins.find((bin) => value < bin.max)?.value || 0;

  const computeBRG = (): number | null => {
    if (!selectedProperty || dscr === "" || occupancy === "") return null;

    const dscrScore = getBinValue(dscr as number, dscrBins);
    const occupancyScore = getBinValue(occupancy as number, occupancyBins);
    const propertyTypeScore = propertyTypeBins[selectedProperty] || 0;
    const quantitativeBRG = dscrScore + occupancyScore + propertyTypeScore;

    let adjustmentScore = 0;
    for (const key of Object.keys(qualitativeWeights)) {
      if (qualitativeValues[key] !== undefined) {
        const rating = qualitativeValues[key];
        adjustmentScore += (qualitativeAdjustment[rating] || 0) * qualitativeWeights[key];
      }
    }
    const qualitativeAdjustedBRG = quantitativeBRG + adjustmentScore;
    return Math.round(quantitativeBRG * 0.7 + qualitativeAdjustedBRG * 0.3);
  };

  const computeFRG = (): number | null => {
    if (ltv === "") return null;

    const quantitativeFRG = getBinValue(ltv as number, ltvBins);

    let adjustmentScore = 0;
    if (qualitativeValues["Liquidity"] !== undefined) {
      const rating = qualitativeValues["Liquidity"];
      adjustmentScore = qualitativeAdjustment[rating] || 0;
    }
    const qualitativeAdjustedFRG = quantitativeFRG + adjustmentScore;
    return Math.round(quantitativeFRG * 0.7 + qualitativeAdjustedFRG * 0.3);
  };

  const handleOverrideChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOverride(event.target.checked);
    if (!event.target.checked) {
      setOverrideBRG("");
      setOverrideFRG("");
      setJustification("");
    } else {
      // Initialize with computed values
      const calculatedBRG = computeBRG();
      const calculatedFRG = computeFRG();
      if (calculatedBRG !== null) setOverrideBRG(calculatedBRG);
      if (calculatedFRG !== null) setOverrideFRG(calculatedFRG);
    }
  };

  const displayBRG =
    override && overrideBRG !== "" ? overrideBRG : computeBRG();
  const displayFRG =
    override && overrideFRG !== "" ? overrideFRG : computeFRG();

  // Check for missing fields (this does not include the numeric range errors)
  const getMissingFields = () => {
    const missing: string[] = [];
    if (!selectedProperty) missing.push("Property Type");
    if (!selectedLoanType) missing.push("Loan Type");
    if (dscr === "") missing.push("DSCR");
    if (occupancy === "") missing.push("Occupancy Rate (%)");
    if (ltv === "") missing.push("LTV (%)");
    qualitativeInputs.forEach((input) => {
      if (qualitativeValues[input] === undefined) {
        missing.push(input);
      }
    });
    if (override) {
      if (overrideBRG === "") missing.push("Override BRG");
      if (overrideFRG === "") missing.push("Override FRG");
      if (!justification) missing.push("Justification for Override");
    }
    return missing;
  };

  const missingFields = getMissingFields();
  const isFormValid =
    missingFields.length === 0 &&
    !dscrError &&
    !occupancyError &&
    !ltvError;
  // New function to handle form submission
  const handleSubmit = async () => {
    if (!isFormValid) return;

    // Calculate BRG and FRG values
    const calculatedBRG = computeBRG();
    const calculatedFRG = computeFRG();
    
    // Prepare data for API submission
    const loanData = {
      propertyType: selectedProperty,
      loanType: selectedLoanType,
      dscr: Number(dscr),
      occupancy: Number(occupancy),
      ltv: Number(ltv),
      leaseExpiration: qualitativeValues["Lease Expiration"] || 0,
      tenantRating: qualitativeValues["Tenant Rating"] || 0,
      accessToCapitalMarkets: qualitativeValues["Access to Capital Markets"] || 0,
      liquidity: qualitativeValues["Liquidity"] || 0,
      
      // BRG Fields
      quantitative_brg: calculatedBRG || 0,
      adjustment_score_brg: 0, // This would need to be calculated or stored separately
      q_adjusted_brg: calculatedBRG || 0, // This would need more detailed calculation
      final_brg: override && overrideBRG !== "" ? Number(overrideBRG) : calculatedBRG || 0,
      
      // FRG Fields
      quantitative_frg: calculatedFRG || 0,
      adjustment_score_frg: 0, // This would need to be calculated or stored separately
      q_adjusted_frg: calculatedFRG || 0, // This would need more detailed calculation
      final_frg: override && overrideFRG !== "" ? Number(overrideFRG) : calculatedFRG || 0,
      
      // Override Fields
      overrideEnabled: override,
      override_brg: override ? Number(overrideBRG) : null,
      override_frg: override ? Number(overrideFRG) : null,
      justification: override ? justification : null
    };

    try {
      setIsSubmitting(true);
      // Send data to the API
      const response = await axios.post("http://localhost:8000/submit-loan", loanData);
      
      // Handle successful response
      setSnackbarMessage("Loan application approved and saved successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      
      // Optional: Navigate to a confirmation page or clear form
      // navigate("/confirmation", { state: { loanId: response.data.loan_id } });
      
    } catch (error) {
      // Handle error
      setSnackbarMessage("Error saving loan application. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      console.error("Error submitting loan application:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  return (
    <>
      {/* Header now navigates back to home when clicked */}
      <Header title="Commercial Real Estate (CRE)" onTitleClick={() => navigate("/")} />

      <Container sx={{ mt: 10 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            color: "#003087",
            textAlign: "center",
            mb: 3,
          }}
        >
          Dual Risk Rating - Commercial Real Estate (CRE)
        </Typography>

        <Grid container spacing={4} sx={{ justifyContent: "center", mb: 3 }}>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Property Type</InputLabel>
              <Select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                label="Property Type"
              >
                {propertyTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Loan Type</InputLabel>
              <Select
                value={selectedLoanType}
                onChange={(e) => setSelectedLoanType(e.target.value)}
                label="Loan Type"
              >
                {loanTypes.map((loan) => (
                  <MenuItem key={loan} value={loan}>
                    {loan}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {selectedProperty && selectedLoanType && (
          <>
            <Grid container spacing={4} sx={{ mt: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="DSCR"
                  type="number"
                  fullWidth
                  sx={{ mb: 2 }}
                  error={Boolean(dscrError)}
                  helperText={dscrError}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) {
                      setDscr("");
                      setDscrError("");
                    } else if (value < 0) {
                      setDscr(value);
                      setDscrError("Invalid entry please enter a number greater than or equal to 0.");
                    } else {
                      setDscr(value);
                      setDscrError("");
                    }
                  }}
                />
                <TextField
                  label="Occupancy Rate (%)"
                  type="number"
                  fullWidth
                  sx={{ mb: 2 }}
                  error={Boolean(occupancyError)}
                  helperText={occupancyError}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) {
                      setOccupancy("");
                      setOccupancyError("");
                    } else if (value < 0 || value > 100) {
                      setOccupancy(value);
                      setOccupancyError("Invalid entry please enter a number between 0 and 100.");
                    } else {
                      setOccupancy(value);
                      setOccupancyError("");
                    }
                  }}
                />
                <TextField
                  label="LTV (%)"
                  type="number"
                  fullWidth
                  sx={{ mb: 2 }}
                  error={Boolean(ltvError)}
                  helperText={ltvError}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (isNaN(value)) {
                      setLtv("");
                      setLtvError("");
                    } else if (value < 0) {
                      setLtv(value);
                      setLtvError("Invalid entry please enter a number greater than or equal to 0.");
                    } else {
                      setLtv(value);
                      setLtvError("");
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                {qualitativeInputs.map((input) => (
                  <FormControl key={input} fullWidth sx={{ mb: 2 }} variant="outlined">
                    <InputLabel>{input}</InputLabel>
                    <Select
                      value={qualitativeValues[input] || ""}
                      onChange={(e) =>
                        setQualitativeValues((prev) => ({
                          ...prev,
                          [input]: parseInt(e.target.value as string),
                        }))
                      }
                      label={input}
                      displayEmpty
                      sx={{ textAlign: "left" }}
                    >
                      {qualitativeOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Grid>
            </Grid>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                mt: 4,
              }}
            >
              <Box
                sx={{
                  bgcolor: "#449DF8",
                  color: "black",
                  padding: "25px 50px",
                  textAlign: "center",
                  fontWeight: "bold",
                  borderRadius: "15px",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                  width: "220px",
                  height: "120px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1, fontSize: "1.5rem" }}>
                  BRG
                </Typography>
                <Typography sx={{ fontSize: "3.5rem", fontWeight: "bold", lineHeight: "1" }}>
                  {displayBRG}
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor: "#F89F44",
                  color: "black",
                  padding: "25px 50px",
                  textAlign: "center",
                  fontWeight: "bold",
                  borderRadius: "15px",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                  width: "220px",
                  height: "120px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1, fontSize: "1.5rem" }}>
                  FRG
                </Typography>
                <Typography sx={{ fontSize: "3.5rem", fontWeight: "bold", lineHeight: "1" }}>
                  {displayFRG}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={override}
                    onChange={handleOverrideChange}
                    color="primary"
                  />
                }
                label="Override"
                sx={{ fontWeight: "bold" }}
              />
            </Box>

            {override && (
              <Grid container spacing={4} sx={{ mt: 1, justifyContent: "center" }}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Override BRG"
                    type="number"
                    fullWidth
                    value={overrideBRG}
                    onChange={(e) =>
                      setOverrideBRG(parseFloat(e.target.value) || "")
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Override FRG"
                    type="number"
                    fullWidth
                    value={overrideFRG}
                    onChange={(e) =>
                      setOverrideFRG(parseFloat(e.target.value) || "")
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Justification for Override"
                    multiline
                    rows={4}
                    fullWidth
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Provide a detailed justification for overriding the calculated values."
                    required={override}
                  />
                </Grid>
              </Grid>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 4 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={!isFormValid || isSubmitting}
                onClick={handleSubmit}
                sx={{
                  bgcolor: "#003087",
                  color: "white",
                  padding: "15px 50px", // Increased padding for a larger button
                  fontWeight: "bold",
                  borderRadius: "8px",
                  minWidth: "250px",
                  "&:hover": {
                    bgcolor: "#002266",
                  },
                }}
              >
                {isSubmitting ? "Submitting..." : "Approve"}
              </Button>
              {!isFormValid && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Please fill in the following: {missingFields.join(", ")}
                </Typography>
              )}
            </Box>
          </>
        )}
      </Container>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  
  );
  
};

export default CRE;