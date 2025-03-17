import React from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import { Container, Typography } from "@mui/material";

const businessTitles: { [key: string]: string } = {
  CRE: "Commercial Real Estate - CRE",
  SNS: "Sponsor Specialty Finance - S&S",
  ABL: "Asset Based Lending - ABL",
  MM: "Middle Market - MM",
  EF: "Equipment Finance - EF",
};

const BusinessPage: React.FC = () => {
  const { businessType } = useParams<{ businessType: string }>();

  return (
    <>
      <Header title={businessTitles[businessType || "CRE"] || "Loan Origination - DRR"} />
      <Container>
        <Typography variant="h4" sx={{ mt: 5, color: "#003087" }}>
          Welcome to {businessTitles[businessType || "CRE"]}
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          Here, you will manage loan origination for {businessTitles[businessType || "CRE"]}.
        </Typography>
      </Container>
    </>
  );
};

export default BusinessPage;