import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { dark, toggle } = useTheme();
  const { user, isSupabaseConfigured } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const logoSrc = dark ? "/assets/nutrident-logo.png" : "/assets/nutrident-logo-light-glow.png";

  const primaryLinks = [
    { to: "/", label: "Home", end: true },
    { to: "/food", label: "Analyze Food" },
    { to: "/nutrition", label: "Daily Log" },
    { to: "/analytics", label: "Analytics" },
    { to: "/explain", label: "Why This Score" },
    { to: "/coach", label: "Coach" },
    { to: "/assess", label: "Risk Assessment" },
  ];

  const secondaryLinks = [
    { to: "/results", label: "Previous Results" },
    { to: "/tips", label: "Tips" },
    { to: "/about", label: "About" },
    { to: "/privacy", label: "Privacy" },
    { to: "/auth", label: user ? "Account" : "Sign In" },
    { to: "/settings", label: "Settings" },
  ];

  const renderLink = ({ to, label, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      onClick={() => setMenuOpen(false)}
    >
      {label}
    </NavLink>
  );

  return (
    <div className="header-stack">
      <div className="top-bar">
        <div className="top-bar-inner">
          <NavLink to="/" className="top-brand">
            <img className="top-brand-logo" src={logoSrc} alt="NutriDent AI" />
            <span className="sr-only">NutriDent AI</span>
          </NavLink>
          <div className="top-actions">
            {isSupabaseConfigured && (
              <span className="cloud-status">{user ? "Cloud sync on" : "Cloud sync off"}</span>
            )}
            <button className="theme-toggle" onClick={toggle} title="Toggle theme">
              <span className="theme-icon" aria-hidden="true">{dark ? "☀️" : "🌙"}</span>
              <span className="theme-label">{dark ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="nav-bar">
        <div className="nav-bar-inner">
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            {primaryLinks.map(renderLink)}
            <details className="nav-more">
              <summary className="nav-link nav-more-trigger">More</summary>
              <div className="nav-more-menu">
                {secondaryLinks.map(renderLink)}
              </div>
            </details>
          </div>
          <button className="hamburger" onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>
    </div>
  );
}
