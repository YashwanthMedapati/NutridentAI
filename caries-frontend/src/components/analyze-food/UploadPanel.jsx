import React from "react";
import { Spinner } from "../UI";

export function UploadPanel({ imagePreview, fileRef, onFileChange, onDrop, onAnalyze, loading }) {
  return (
    <>
      <div
        className={`upload-zone large-zone ${imagePreview ? "has-preview" : ""}`}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {imagePreview
          ? <img src={imagePreview} alt="food" className="preview-img" />
          : (
            <div className="upload-placeholder">
              <span className="upload-icon-lg">📷</span>
              <span className="upload-text">Click or drag to upload a food photo</span>
              <span className="upload-hint">JPG, PNG, HEIC supported</span>
            </div>
          )
        }
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
      {imagePreview && (
        <button className="btn-primary mt-12 w-full" onClick={onAnalyze} disabled={loading}>
          {loading ? <><Spinner /> Analyzing image…</> : "Analyze Photo"}
        </button>
      )}
    </>
  );
}
