import React, { useState } from "react";
import { Container, Typography, MenuItem, Select, FormControl, InputLabel, Box } from "@mui/material";
import Header from "../components/Header";
import { useNavigate, useLocation } from "react-router-dom";
import { SelectChangeEvent } from "@mui/material/Select";

const Home: React.FC = () => {
  const [business, setBusiness] = useState("");
  const navigate = useNavigate();

  const handleBusinessChange = (event: SelectChangeEvent<string>) => {
    const selectedBusiness = event.target.value;
    setBusiness(selectedBusiness);
    if (selectedBusiness === "CRE") {
      navigate("/cre", { state: { lineOfBusiness: selectedBusiness } });
    }
    // Additional navigation for other lines can be added here.
  };

  return (
    <>
      <Header title="Loan Origination - DRR" />
      <Container sx={{ mt: 10, textAlign: "center" }}>
        <Typography variant="h4" sx={{ color: "#003087", fontWeight: "bold", mb: 2 }}>
          Dual Risk Rating
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Select Your Line of Business
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <FormControl sx={{ minWidth: 300 }} variant="outlined">
            <InputLabel id="business-label">Select Business</InputLabel>
            <Select
              labelId="business-label"
              value={business}
              onChange={handleBusinessChange}
              label="Select Business"
            >
              <MenuItem value="CRE">Commercial Real Estate (CRE)</MenuItem>
              <MenuItem value="SNS">Sponsor Specialty Finance (S&S)</MenuItem>
              <MenuItem value="ABL">Asset Based Lending (ABL)</MenuItem>
              <MenuItem value="MM">Middle Market (MM)</MenuItem>
              <MenuItem value="EF">Equipment Finance (EF)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Container>
    </>
  );
};

export default Home;