import React from "react";
import { AppBar, Toolbar, Typography, Box } from "@mui/material";

interface HeaderProps {
  title: string;
  onTitleClick?: () => void; // <-- Added this prop
}

const Header: React.FC<HeaderProps> = ({ title, onTitleClick }) => {
  return (
    <>
      {/* Clickable Dual Risk Rating Title */}
      <Box
        onClick={onTitleClick} // <-- Makes it clickable
        sx={{
          position: "absolute",
          top: 10,
          left: 20,
          fontSize: "1.8rem",
          fontWeight: "bold",
          color: "#003087", // Webster Bank Blue
          padding: "5px 10px",
          borderRadius: "5px",
          cursor: "pointer", // <-- Shows clickable effect
        }}
      >
        Dual Risk Rating
      </Box>

      {/* Sticky Full-Width Navigation Bar */}
      <AppBar position="sticky" sx={{ bgcolor: "#003087", width: "100vw", left: 0 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
            {title}
          </Typography>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;