import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Owns the camera/scanner lifecycle for the barcode tab: permission probing,
// starting/stopping html5-qrcode against the viewfinder div, and the
// scanned-code confirm/retry state. The actual barcode lookup (API call)
// stays with the caller since it shares loading/result state with the
// upload and search tabs.
export function useBarcodeScanner() {
  const [barcodeText, setBarcodeText] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scannedCode, setScannedCode] = useState(null); // code captured, awaiting confirm

  const scannerRef = useRef(null); // holds the Html5Qrcode instance

  // Start scanner when cameraOpen becomes true
  useEffect(() => {
    if (!cameraOpen) return;

    // The div with this id must be in the DOM when the effect runs
    const SCANNER_DIV_ID = "nutrident-barcode-scanner";
    const scanner = new Html5Qrcode(SCANNER_DIV_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" }, // use rear camera on mobile
        { fps: 10, qrbox: { width: 260, height: 120 } },
        (decodedText) => {
          // Pause scanning immediately after first successful read
          scanner.pause();
          setScannedCode(decodedText);
        },
        () => { /* ignore "not found" frames — fires every frame */ }
      )
      .catch((err) => {
        const msg = typeof err === "string" ? err : err?.message || "Camera error";
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
          setCameraError("Camera permission denied. Allow camera access in your browser and try again.");
        } else {
          setCameraError("Camera not available on this device or browser.");
        }
        setCameraOpen(false);
      });

    // Cleanup: stop scanner when camera is closed or component unmounts
    return () => {
      scanner.stop().catch(() => {});
    };
  }, [cameraOpen]);

  // Open — quick permission probe first
  const openCamera = async () => {
    setCameraError(null);
    setScannedCode(null);
    setBarcodeText("");
    try {
      // Just check permission without keeping the stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraOpen(true);
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser settings and try again."
          : "Camera not available on this device or browser."
      );
    }
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setScannedCode(null);
  };

  const resumeScanning = () => {
    setScannedCode(null);
    scannerRef.current?.resume();
  };

  return {
    barcodeText,
    setBarcodeText,
    cameraOpen,
    cameraError,
    setCameraError,
    scannedCode,
    openCamera,
    closeCamera,
    resumeScanning,
  };
}
