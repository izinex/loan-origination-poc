import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import BusinessPage from "./pages/BusinessPage";
import CRE from "./pages/CRE"; // Import the new CRE page
import { Container } from "@mui/material";

const App: React.FC = () => {
  return (
    <Router>
      <Container>
        <Routes>
          {/* Home Page */}
          <Route path="/" element={<Home />} />

          {/* Commercial Real Estate (CRE) Page */}
          <Route path="/CRE" element={<CRE />} />

          {/* Dynamic Business Pages */}
          <Route path="/:businessType" element={<BusinessPage />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;