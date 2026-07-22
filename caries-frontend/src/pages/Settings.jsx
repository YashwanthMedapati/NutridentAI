import React, { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/UI";

export default function Settings() {
  const { exportAppData, importAppData, clearAllAppData, foodLog, weightLog, previousResults, cloudSyncStatus } = useApp();
  const { user, isSupabaseConfigured } = useAuth();
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);
  const [confirmText, setConfirmText] = useState("");

  const downloadBackup = () => {
    const data = JSON.stringify(exportAppData(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nutrident-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importAppData(JSON.parse(text));
      setMessage({ type: "success", text: "Backup imported successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Could not import this backup." });
    } finally {
      event.target.value = "";
    }
  };

  const deleteData = () => {
    if (confirmText !== "DELETE") {
      setMessage({ type: "error", text: "Type DELETE to confirm data deletion." });
      return;
    }
    clearAllAppData();
    setConfirmText("");
    setMessage({ type: "success", text: "Local NutriDent data has been cleared." });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage account sync, backups, imports, and local data controls.</p>
      </div>

      <div className="settings-grid">
        <div className="result-card">
          <span className="result-card-label">Account & Sync</span>
          <div className="settings-status-row">
            <span>Supabase</span>
            <strong>{isSupabaseConfigured ? "Configured" : "Not configured"}</strong>
          </div>
          <div className="settings-status-row">
            <span>Account</span>
            <strong>{user?.email || "Not signed in"}</strong>
          </div>
          <div className="settings-status-row">
            <span>Sync status</span>
            <strong>{cloudSyncStatus}</strong>
          </div>
          <p className="fli-advice">The app works locally without Supabase. Sign in to sync food and weight logs once your Supabase project is configured.</p>
        </div>

        <div className="result-card">
          <span className="result-card-label">Data Summary</span>
          <div className="settings-summary-row">
            <span>Food logs</span>
            <strong>{foodLog.length}</strong>
          </div>
          <div className="settings-summary-row">
            <span>Weight entries</span>
            <strong>{weightLog.length}</strong>
          </div>
          <div className="settings-summary-row">
            <span>Assessment history</span>
            <strong>{previousResults.length}</strong>
          </div>
        </div>

        <div className="result-card">
          <span className="result-card-label">Backup & Restore</span>
          <p className="fli-advice">Export a JSON backup before clearing browser data or moving to another device.</p>
          <div className="settings-action-row">
            <button className="btn-primary" onClick={downloadBackup}>Export Backup</button>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Import Backup</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
        </div>

        <div className="result-card danger-zone">
          <span className="result-card-label">Delete Data</span>
          <p className="fli-advice">This clears local form data, food logs, weight logs, and previous results in this browser. If signed in, synced food and weight logs are also cleared.</p>
          <input
            value={confirmText}
            onChange={event => setConfirmText(event.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <button className="btn-danger" onClick={deleteData}>Delete NutriDent Data</button>
        </div>
      </div>

      {message && <Alert type={message.type}>{message.text}</Alert>}
    </div>
  );
}
