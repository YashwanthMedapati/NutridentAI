import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CoachProvider } from "./context/CoachContext";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Home from "./pages/Home";
import AnalyzeFood from "./pages/AnalyzeFood";
import Assess from "./pages/Assess";
import Nutrition from "./pages/Nutrition";
import Coach from "./pages/Coach";
import BehaviorAnalytics from "./pages/BehaviorAnalytics";
import Explainability from "./pages/Explainability";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import { About, Tips, PreviousResults, Privacy } from "./pages/OtherPages";
import "./App.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <AppProvider>
        <CoachProvider>
          <BrowserRouter>
            <div className="app-shell">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/"          element={<Home />} />
                  <Route path="/food"      element={<AnalyzeFood />} />
                  <Route path="/assess"    element={<Assess />} />
                  <Route path="/nutrition" element={<Nutrition />} />
                  <Route path="/coach"     element={<Coach />} />
                  <Route path="/analytics" element={<BehaviorAnalytics />} />
                  <Route path="/charts"    element={<BehaviorAnalytics />} />
                  <Route path="/explain"   element={<Explainability />} />
                  <Route path="/results"   element={<PreviousResults />} />
                  <Route path="/tips"      element={<Tips />} />
                  <Route path="/about"     element={<About />} />
                  <Route path="/privacy"   element={<Privacy />} />
                  <Route path="/auth"      element={<Auth />} />
                  <Route path="/settings"  element={<Settings />} />
                </Routes>
              </main>
              <footer className="footer">
                <div className="footer-inner">
                  <span className="footer-brand-mark">
                    <img className="footer-logo theme-logo-dark" src="/assets/nutrident-logo.png" alt="NutriDent AI" />
                    <img className="footer-logo theme-logo-light" src="/assets/nutrident-logo-light.png" alt="NutriDent AI" />
                  </span>
                  <span>For educational and research use only / Not a substitute for clinical dental diagnosis</span>
                </div>
              </footer>
            </div>
          </BrowserRouter>
        </CoachProvider>
      </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
