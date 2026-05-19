import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="brand-icon">🦷</span>
          <span className="brand-name">NutriDent AI</span>
        </NavLink>

        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} end>
            Dashboard
          </NavLink>

          <NavLink to="/assess" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Risk Assessment
          </NavLink>

          <NavLink to="/nutrition" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Nutrition Tracker
          </NavLink>
        </div>
      </div>
    </nav>
  );
}