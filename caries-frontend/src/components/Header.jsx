import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: "/",        label: "Home",              end: true },
    { to: "/food",    label: "Analyze Food" },
    { to: "/assess",  label: "Risk Assessment" },
    { to: "/coach",   label: "NutriDent Coach" },  // ← new
    { to: "/charts",  label: "Charts" },
    { to: "/results", label: "Previous Results" },
    { to: "/tips",    label: "Tips" },
    { to: "/about",   label: "About" },
  ];

  return (
    <div className="header-stack">
      {/* TOP BAR */}
      <div className="top-bar">
        <div className="top-bar-inner">
          <NavLink to="/" className="top-brand">
            <span className="top-brand-icon">🦷</span>
            <div className="top-brand-text">
              <span className="top-brand-name">NutriDent AI</span>
              <span className="top-brand-tag">Dental Caries · Nutrition Intelligence</span>
            </div>
          </NavLink>
          <button className="theme-toggle" onClick={toggle} title="Toggle theme">
            {dark ? "☀️" : "🌙"}
            <span className="theme-label">{dark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>

      {/* NAV BAR */}
      <nav className="nav-bar">
        <div className="nav-bar-inner">
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            {links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>
    </div>
  );
}
