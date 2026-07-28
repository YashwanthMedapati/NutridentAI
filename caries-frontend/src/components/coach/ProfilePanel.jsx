import React from "react";

export function ProfilePanel({ profile, setProfile }) {
  return (
    <div className="profile-panel">
      <h3 className="profile-title">Your Profile</h3>
      <div className="profile-grid">
        {[
          { label: "Age",           name: "age",         placeholder: "e.g. 28",  type: "number" },
          { label: "Height (cm)",   name: "height",      placeholder: "e.g. 170", type: "number" },
          { label: "Weight (kg)",   name: "weight",      placeholder: "e.g. 70",  type: "number" },
          { label: "Goal (kg)",     name: "goal_weight", placeholder: "e.g. 65",  type: "number" },
          { label: "Goal Date",     name: "goal_date",   placeholder: "",         type: "date" },
        ].map(({ label, name, placeholder, type }) => (
          <div className="field" key={name}>
            <label className="field-label">{label}</label>
            <input type={type} placeholder={placeholder}
              value={profile[name] || ""}
              onChange={e => setProfile(p => ({ ...p, [name]: e.target.value }))} />
          </div>
        ))}
        <div className="field">
          <label className="field-label">Gender</label>
          <select value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}>
            <option value="1">Male</option>
            <option value="2">Female</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Physical Activity</label>
          <select value={profile.activity_level || "sedentary"} onChange={e => setProfile(p => ({ ...p, activity_level: e.target.value }))}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light activity</option>
            <option value="moderate">Moderate activity</option>
            <option value="active">Active</option>
            <option value="athlete">Very active</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Goal</label>
          <select value={profile.goal_type} onChange={e => setProfile(p => ({ ...p, goal_type: e.target.value }))}>
            <option value="lose">Lose Weight</option>
            <option value="maintain">Maintain</option>
            <option value="gain">Gain Weight</option>
          </select>
        </div>
      </div>
    </div>
  );
}
