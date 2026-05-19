import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CoachProvider } from "./context/CoachContext";
import Header from "./components/Header";
import Home from "./pages/Home";
import AnalyzeFood from "./pages/AnalyzeFood";
import Assess from "./pages/Assess";
import Nutrition from "./pages/Nutrition";
import Coach from "./pages/Coach";
import { Charts, About, Tips, PreviousResults } from "./pages/OtherPages";
import "./App.css";

export default function App() {
  return (
    <ThemeProvider>
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
                  <Route path="/charts"    element={<Charts />} />
                  <Route path="/results"   element={<PreviousResults />} />
                  <Route path="/tips"      element={<Tips />} />
                  <Route path="/about"     element={<About />} />
                </Routes>
              </main>
              <footer className="footer">
                <div className="footer-inner">
                  <span className="footer-brand">🦷 NutriDent AI</span>
                  <span>For educational and research use only · Not a substitute for clinical dental diagnosis</span>
                </div>
              </footer>
            </div>
          </BrowserRouter>
        </CoachProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
