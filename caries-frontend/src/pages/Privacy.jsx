import React from "react";

export default function Privacy() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Privacy & Safety</h1>
        <p className="page-sub">How NutriDent AI handles food, weight, and dental-risk information.</p>
      </div>

      <div className="about-grid">
        <div className="about-section">
          <h2 className="about-heading">Local Data Storage</h2>
          <p>Food logs, weight logs, profile values, coach targets, and previous results are stored in this browser using local storage by default.</p>
          <p>If Supabase is configured and you sign in, food and weight logs can sync to your account. Local browser data can still remain on the device until you delete it.</p>
        </div>

        <div className="about-section">
          <h2 className="about-heading">External APIs</h2>
          <p>Food search first checks NutriDent's local Indian dish dataset, then uses USDA FoodData Central when needed. Barcode scans use Open Food Facts. Photo analysis uses Google Vision API through the backend. Uploaded food images are sent to the backend for analysis and then to the configured Vision API provider.</p>
          <p>Do not upload images that contain faces, documents, or sensitive personal information.</p>
        </div>

        <div className="about-section">
          <h2 className="about-heading">Medical Disclaimer</h2>
          <p>NutriDent AI is educational and research-oriented. It is not a clinical diagnosis, medical device, nutrition prescription, or replacement for a dentist, physician, or registered dietitian.</p>
          <p>Vision, portion, calorie, and risk estimates can be wrong. Review detected ingredients and portion weight before logging food or making decisions from the result.</p>
        </div>

        <div className="about-section">
          <h2 className="about-heading">Export And Delete</h2>
          <p>Use Settings to export a JSON copy of your NutriDent data, import a previous export, or delete local app data from the current browser.</p>
          <p>For production cloud data, keep Supabase Row Level Security enabled and provide account-level deletion for server-stored records.</p>
        </div>
      </div>
    </div>
  );
}
