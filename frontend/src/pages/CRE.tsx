import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SelectChangeEvent } from "@mui/material/Select";
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
  Snackbar,
  Alert,
} from "@mui/material";
import axios from "axios";
import Header from "../components/Header";

// ===== Existing constants =====
// (Ensure these arrays/objects exist or adjust as needed.)
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
  "Single-Family": 2.76797217,
  "Multi-Family": 1.13998781,
  Retail: 0.81092195,
  Office: 1.20790535,
  Other: 2.22592975,
  Hotel: 1.71163097,
  Condo: 3.24368739,
  Industrial: 1.71280577,
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

const getBinValue = (
    value: number,
    bins: { max: number; value: number }[]
  ): number => {
    const bin = bins.find((b) => value < b.max);
    return bin ? bin.value : 0;
  };
const qualitativeOptions = [1, 2, 3, 4, 5, 6];

// ===== New Dynamic Qualitative Inputs =====
const qualitativeInputsByPropertyType: Record<
  string,
  { brg: string[]; frg: string[] }
> = {
  "Single-Family": {
    brg: ["Market Rent", "Guarantor Net Worth"],
    frg: ["Liquidity"],
  },
  "Multi-Family": {
    brg: ["Number of Units", "Market Rent", "Access to Capital Markets"],
    frg: ["Liquidity"],
  },
  Retail: {
    brg: ["Lease Expiration", "Tenant Rating", "Access to Capital Markets"],
    frg: ["Collateral Value"],
  },
  Office: {
    brg: ["Lease Expiration", "Tenant Rating", "Number of Units"],
    frg: ["Collateral Value"],
  },
  Other: {
    brg: ["Economic Outlook", "Guarantor Net Worth", "Market Rent"],
    frg: ["Liquidity"],
  },
  Hotel: {
    brg: ["Number of Units", "Market Rent", "Access to Capital Markets"],
    frg: ["Liquidity"],
  },
  Condo: {
    brg: ["Number of Units", "Market Rent", "Access to Capital Markets"],
    frg: ["Liquidity"],
  },
  Industrial: {
    brg: ["Lease Expiration", "Tenant Rating", "Access to Capital Markets"],
    frg: ["Collateral Value"],
  },
};

// Helper to return all qualitative inputs (BRG and FRG) for a property type
const getQualitativeInputs = (propertyType: string): string[] => {
  if (!propertyType) return [];
  return [
    ...(qualitativeInputsByPropertyType[propertyType]?.brg || []),
    ...(qualitativeInputsByPropertyType[propertyType]?.frg || []),
  ];
};




// Helper to compute dynamic weights for BRG inputs (evenly distributed)
const getQualitativeWeights = (propertyType: string): Record<string, number> => {
  if (!propertyType) return {};
  const weights: Record<string, number> = {};
  const brgInputs = qualitativeInputsByPropertyType[propertyType]?.brg || [];
  const brgWeight = brgInputs.length > 0 ? 1 / brgInputs.length : 0;
  brgInputs.forEach((input) => {
    weights[input] = brgWeight;
  });
  return weights;
};

// ===== Component Start =====
const CRE: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const lineOfBusiness = location.state?.lineOfBusiness || "CRE";

  // Quantitative inputs
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedLoanType, setSelectedLoanType] = useState("");
  const [dscr, setDscr] = useState<number | "">("");
  const [occupancy, setOccupancy] = useState<number | "">("");
  const [ltv, setLtv] = useState<number | "">("");

  // Dynamic qualitative inputs (key: rating)
  const [qualitativeValues, setQualitativeValues] = useState<Record<string, number>>({});
  const [qualitativeMetrics, setQualitativeMetrics] = useState<Record<string, string>>({});

  // Override and feedback states
  const [override, setOverride] = useState<boolean>(false);
  const [overrideBRG, setOverrideBRG] = useState<number | "">("");
  const [overrideFRG, setOverrideFRG] = useState<number | "">("");
  const [justification, setJustification] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [dscrError, setDscrError] = useState("");
  const [occupancyError, setOccupancyError] = useState("");
  const [ltvError, setLtvError] = useState("");

  // Compute BRG dynamically
  const computeBRG = (): number | null => {
    if (!selectedProperty || dscr === "" || occupancy === "") return null;
    const dscrScore = getBinValue(Number(dscr), dscrBins);
    const occupancyScore = getBinValue(Number(occupancy), occupancyBins);
    const propertyTypeScore = propertyTypeBins[selectedProperty] || 0;
    const quantitativeBRG = dscrScore + occupancyScore + propertyTypeScore;

    let adjustmentScore = 0;
    const weights = getQualitativeWeights(selectedProperty);
    const brgInputs = qualitativeInputsByPropertyType[selectedProperty]?.brg || [];
    for (const key of brgInputs) {
      if (qualitativeValues[key] !== undefined) {
        adjustmentScore += (qualitativeAdjustment[qualitativeValues[key]] || 0) * weights[key];
      }
    }
    const qualitativeAdjustedBRG = quantitativeBRG + adjustmentScore;
    return Math.round(quantitativeBRG * 0.7 + qualitativeAdjustedBRG * 0.3);
  };

  // Compute FRG dynamically
  const computeFRG = (): number | null => {
    if (ltv === "") return null;
    const quantitativeFRG = getBinValue(Number(ltv), ltvBins);
    let adjustmentScore = 0;
    const frgInput = qualitativeInputsByPropertyType[selectedProperty]?.frg[0] || "";
    if (frgInput && qualitativeValues[frgInput] !== undefined) {
      adjustmentScore = qualitativeAdjustment[qualitativeValues[frgInput]] || 0;
    }
    const qualitativeAdjustedFRG = quantitativeFRG + adjustmentScore;
    return Math.round(quantitativeFRG * 0.7 + qualitativeAdjustedFRG * 0.3);
  };

  // Check for missing fields (including dynamic qualitative inputs)
  const getMissingFields = () => {
    const missing: string[] = [];
    if (!selectedProperty) missing.push("Property Type");
    if (!selectedLoanType) missing.push("Loan Type");
    if (dscr === "") missing.push("DSCR");
    if (occupancy === "") missing.push("Occupancy Rate (%)");
    if (ltv === "") missing.push("LTV (%)");

    const inputs = getQualitativeInputs(selectedProperty);
    inputs.forEach((input) => {
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
  const isFormValid = missingFields.length === 0 && !dscrError && !occupancyError && !ltvError;

  const handleOverrideChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOverride(event.target.checked);
    if (!event.target.checked) {
      setOverrideBRG("");
      setOverrideFRG("");
      setJustification("");
    } else {
      const calculatedBRG = computeBRG();
      const calculatedFRG = computeFRG();
      if (calculatedBRG !== null) setOverrideBRG(calculatedBRG);
      if (calculatedFRG !== null) setOverrideFRG(calculatedFRG);
    }
  };

  const displayBRG = override && overrideBRG !== "" ? overrideBRG : computeBRG();
  const displayFRG = override && overrideFRG !== "" ? overrideFRG : computeFRG();

  const handleSubmit = async () => {
    if (!isFormValid) return;

    // Quantitative computation
    const dscrScore = getBinValue(Number(dscr), dscrBins);
    const occupancyScore = getBinValue(Number(occupancy), occupancyBins);
    const propertyTypeScore = propertyTypeBins[selectedProperty] || 0;
    const quantitativeBRG = dscrScore + occupancyScore + propertyTypeScore;

    let adjustmentScoreBRG = 0;
    const weights = getQualitativeWeights(selectedProperty);
    const brgInputs = qualitativeInputsByPropertyType[selectedProperty]?.brg || [];
    brgInputs.forEach((key) => {
      if (qualitativeValues[key] !== undefined) {
        adjustmentScoreBRG += (qualitativeAdjustment[qualitativeValues[key]] || 0) * (weights[key] || 0);
      }
    });
    const qAdjustedBRG = quantitativeBRG + adjustmentScoreBRG;
    const weightedBRG = Math.round(quantitativeBRG * 0.7 + qAdjustedBRG * 0.3);

    const quantitativeFRG = getBinValue(Number(ltv), ltvBins);
    const frgInput = qualitativeInputsByPropertyType[selectedProperty]?.frg[0] || "";
    const adjustmentScoreFRG =
      frgInput && qualitativeValues[frgInput] !== undefined
        ? qualitativeAdjustment[qualitativeValues[frgInput]] || 0
        : 0;
    const finalBRG =
      override && overrideBRG !== ""
        ? Number(overrideBRG)
        : Math.round(quantitativeBRG * 0.7 + qAdjustedBRG * 0.3);
    const finalFRG =
      override && overrideFRG !== ""
        ? Number(overrideFRG)
        : Math.round(quantitativeFRG * 0.7 + (quantitativeFRG + adjustmentScoreFRG) * 0.3);

   // Build dynamic qualitative data for ratings
  const qualitativeData: Record<string, number> = {};
  getQualitativeInputs(selectedProperty).forEach((input) => {
    qualitativeData[input.replace(/\s+/g, "")] = qualitativeValues[input] || 0;
  });

  // Build dynamic qualitative data for metric values; append '_Value' to keys
  const qualitativeMetricsData: Record<string, number | null> = {};
  getQualitativeInputs(selectedProperty).forEach((input) => {
    const metricVal = qualitativeMetrics[input];
    qualitativeMetricsData[`${input.replace(/\s+/g, "")}_Value`] =
      metricVal ? parseFloat(metricVal) : null;
  });

  // Prepare full payload including both rating and metric values
  const loanData = {
    lineOfBusiness: lineOfBusiness,
    propertyType: selectedProperty,
    loanType: selectedLoanType,
    dscr: Number(dscr),
    occupancy: Number(occupancy),
    ltv: Number(ltv),
    ...qualitativeData,
    ...qualitativeMetricsData,
    quantitative_brg: quantitativeBRG,
    adjustment_score_brg: adjustmentScoreBRG,
    q_adjusted_brg: qAdjustedBRG,
    weighted_brg: weightedBRG,
    final_brg: finalBRG,
    quantitative_frg: quantitativeFRG,
    adjustment_score_frg: adjustmentScoreFRG,
    q_adjusted_frg: quantitativeFRG + adjustmentScoreFRG,
    final_frg: finalFRG,
    overrideEnabled: override,
    override_brg: override ? Number(overrideBRG) : null,
    override_frg: override ? Number(overrideFRG) : null,
    justification: override ? justification : null,
  };

    try {
      setIsSubmitting(true);
      const response = await axios.post("http://localhost:8000/submit-loan", loanData);
      setSnackbarMessage("Loan application approved and saved successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
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
      <Header title="Commercial Real Estate (CRE)" onTitleClick={() => navigate("/")} />
      <Container sx={{ mt: 10 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#003087", textAlign: "center", mb: 3 }}>
          Dual Risk Rating - Commercial Real Estate (CRE)
        </Typography>
        <Grid container spacing={4} sx={{ justifyContent: "center", mb: 3 }}>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Property Type</InputLabel>
              <Select
                value={selectedProperty}
                onChange={(e) => {
                  setSelectedProperty(e.target.value);
                  setQualitativeValues({});
                  setQualitativeMetrics({});
                }}
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
                onChange={(e) => {
                  setSelectedLoanType(e.target.value);
                  setQualitativeValues({});
                  setQualitativeMetrics({});
                }}
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

        {/* Only show quantitative and qualitative inputs if both selections are made */}
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
                      setDscrError("Invalid entry; enter a number ≥ 0.");
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
                      setOccupancyError("Enter a number between 0 and 100.");
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
                      setLtvError("Enter a number ≥ 0.");
                    } else {
                      setLtv(value);
                      setLtvError("");
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                {getQualitativeInputs(selectedProperty).map((input) => (
                  <Box
                    key={input}
                    sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                  >
                    <FormControl fullWidth variant="outlined">
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
                    <TextField
                      label={`${input} Value`}
                      variant="outlined"
                      size="medium"
                      sx={{ width: "300px" }}
                      value={qualitativeMetrics[input] || ""}
                      onChange={(e) =>
                        setQualitativeMetrics((prev) => ({
                          ...prev,
                          [input]: e.target.value,
                        }))
                      }
                    />
                  </Box>
                ))}
              </Grid>
            </Grid>
            {/* Rest of your rendering for computed values and override fields remains unchanged */}
          </>
        )}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 6, mt: 4 }}>
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
            control={<Switch checked={override} onChange={handleOverrideChange} color="primary" />}
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
                onChange={(e) => setOverrideBRG(parseFloat(e.target.value) || "")}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Override FRG"
                type="number"
                fullWidth
                value={overrideFRG}
                onChange={(e) => setOverrideFRG(parseFloat(e.target.value) || "")}
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
              padding: "15px 50px",
              fontWeight: "bold",
              borderRadius: "8px",
              minWidth: "250px",
              "&:hover": { bgcolor: "#002266" },
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
      </Container>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CRE;