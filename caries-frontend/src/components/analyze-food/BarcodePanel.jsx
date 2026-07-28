import React from "react";
import { Alert, Spinner } from "../UI";

export function BarcodePanel({
  cameraError,
  cameraOpen,
  scannedCode,
  loading,
  onLookupScanned,
  onResumeScanning,
  onCloseCamera,
  onOpenCamera,
  barcodeText,
  setBarcodeText,
  onManualLookup,
}) {
  return (
    <div className="barcode-active">

      {/* Header */}
      <div className="barcode-header">
        <span className="barcode-header-icon">📦</span>
        <div>
          <h3 className="barcode-header-title">Barcode / QR Lookup</h3>
          <p className="barcode-header-sub">
            Scan a product barcode with your camera, or type it manually.
            Powered by Open Food Facts — free, no sign-up needed.
          </p>
        </div>
      </div>

      {/* Camera permission error */}
      {cameraError && <Alert type="error">{cameraError}</Alert>}

      {/* ── LIVE CAMERA SCANNER ── */}
      {cameraOpen ? (
        <div className="camera-scanner">
          {/* html5-qrcode renders the video feed into this div by ID */}
          <div id="nutrident-barcode-scanner" className="camera-viewfinder" />

          {/* Detected code — confirm or retry */}
          {scannedCode ? (
            <div className="camera-detected">
              <span className="camera-detected-label">✅ Detected:</span>
              <span className="camera-detected-code">{scannedCode}</span>
              <div className="camera-detected-actions">
                <button className="btn-primary" onClick={() => onLookupScanned(scannedCode)} disabled={loading}>
                  {loading ? <><Spinner /> Looking up…</> : "Look Up Product"}
                </button>
                <button className="btn-ghost" onClick={onResumeScanning}>
                  Scan Again
                </button>
              </div>
            </div>
          ) : (
            <p className="camera-scanning-msg">
              <Spinner /> Point at a barcode or QR code…
            </p>
          )}

          <button className="camera-close-btn" onClick={onCloseCamera}>
            ✕ Close Camera
          </button>
        </div>
      ) : (
        /* Camera open button (shown when scanner is not active) */
        <button className="btn-camera" onClick={onOpenCamera} disabled={loading}>
          <span className="btn-camera-icon">📷</span>
          Scan Barcode with Camera
        </button>
      )}

      {/* Divider */}
      <div className="barcode-divider"><span>or enter barcode manually</span></div>

      {/* Manual entry */}
      <div className="barcode-entry-row">
        <div className="barcode-icon-wrap">
          <div className="barcode-lines-sm">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="barcode-line-sm"
                style={{ height: `${16 + (i % 3) * 6}px` }} />
            ))}
          </div>
        </div>
        <input
          className="search-big-input"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 5000112637922"
          value={barcodeText}
          onChange={e => setBarcodeText(e.target.value.replace(/\D/g, ""))}
          onKeyDown={e => e.key === "Enter" && onManualLookup()}
          maxLength={14}
        />
        <button className="btn-primary" onClick={() => onManualLookup()} disabled={loading}>
          {loading ? <><Spinner /> Looking up…</> : "Look Up"}
        </button>
      </div>

      <p className="barcode-format-hint">
        EAN-13, EAN-8, UPC-A, UPC-E &nbsp;·&nbsp; Numbers only, no spaces or dashes
      </p>

    </div>
  );
}
