'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  Upload,
  Camera,
  Sparkles,
  ScanLine,
  Building2,
  KeyRound,
  Trash2,
  Check,
  Star,
  Plus,
} from 'lucide-react';
import { db } from '@/lib/db';
import { HomepageCMS, FonepaySettings, FonepayQRItem } from '@/types';
import { scanQRFromFile, parseFonepayQrPayload } from '@/lib/fonepay-qr-parser';

export default function AdminFonepayPage() {
  const [cms, setCms] = useState<HomepageCMS>(db.getCMS());
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [autoDetectedMsg, setAutoDetectedMsg] = useState('');

  // Camera Webcam Scanning State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  const [mounted, setMounted] = useState(false);

  const [settings, setSettings] = useState<FonepaySettings>(() => {
    const loadedCms = db.getCMS();
    const existing = loadedCms.fonepaySettings || {
      qrMode: 'static',
      qrImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
      merchantName: 'DAISY HUB PVT LTD',
      merchantCode: 'DAISY8849',
      instructions: 'Scan this official Fonepay QR code using any Mobile Banking app or digital wallet to complete payment.',
      autoVerifyEnabled: true,
      apiUsername: 'demo_username',
      apiPassword: 'demo_password',
      apiKey: 'demo_secret_key',
      savedQrs: [],
    };

    if (!existing.savedQrs || existing.savedQrs.length === 0) {
      existing.savedQrs = [
        {
          id: 'qr-default-1',
          qrImageUrl: existing.qrImageUrl,
          merchantName: existing.merchantName,
          merchantCode: existing.merchantCode,
          isPrimary: true,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return existing;
  });

  useEffect(() => {
    setMounted(true);
    const loadedCms = db.getCMS();
    setCms(loadedCms);
    if (loadedCms.fonepaySettings) {
      const init = loadedCms.fonepaySettings;
      if (!init.savedQrs || init.savedQrs.length === 0) {
        init.savedQrs = [
          {
            id: 'qr-default-1',
            qrImageUrl: init.qrImageUrl,
            merchantName: init.merchantName,
            merchantCode: init.merchantCode,
            isPrimary: true,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      setSettings(init);
    }
  }, []);

  const saveSettingsToDb = (newSettings: FonepaySettings) => {
    const updatedCms = db.updateCMS({ fonepaySettings: newSettings });
    setCms(updatedCms);
    // Broadcast DB update event to storefront
    if (typeof window !== 'undefined') {
      localStorage.setItem('ace_db_fonepay_settings', JSON.stringify(newSettings));
      window.dispatchEvent(new Event('ace-db-updated'));
    }
  };

  // Handle File Upload & Automatic Merchant Code & Name Detection
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsScanning(true);
    setAutoDetectedMsg('');

    try {
      const scanRes = await scanQRFromFile(file);

      let newMerchantCode = settings.merchantCode;
      let newMerchantName = settings.merchantName;
      let detectedText = '';

      if (scanRes.parsed) {
        if (scanRes.parsed.merchantCode) {
          newMerchantCode = scanRes.parsed.merchantCode;
          detectedText += `Merchant Code: ${newMerchantCode} `;
        }
        if (scanRes.parsed.merchantName) {
          newMerchantName = scanRes.parsed.merchantName;
          detectedText += `Merchant Name: ${newMerchantName} `;
        }
      }

      const newQrItem: FonepayQRItem = {
        id: `qr-${Date.now()}`,
        qrImageUrl: scanRes.dataUrl || settings.qrImageUrl,
        merchantName: newMerchantName,
        merchantCode: newMerchantCode,
        isPrimary: true,
        createdAt: new Date().toISOString(),
      };

      const updatedSavedQrs = (settings.savedQrs || []).map((q) => ({ ...q, isPrimary: false }));
      updatedSavedQrs.unshift(newQrItem);

      const nextSettings: FonepaySettings = {
        ...settings,
        qrImageUrl: newQrItem.qrImageUrl,
        merchantCode: newMerchantCode,
        merchantName: newMerchantName,
        savedQrs: updatedSavedQrs,
      };

      setSettings(nextSettings);
      saveSettingsToDb(nextSettings);

      if (scanRes.parsed && (scanRes.parsed.merchantCode || scanRes.parsed.merchantName)) {
        setAutoDetectedMsg(`✨ QR Code Scanned & Auto-Detected! ${detectedText}`);
        setSaveSuccess('✅ Fonepay QR uploaded, Merchant Code auto-detected & set as PRIMARY live!');
      } else {
        setAutoDetectedMsg('QR Image uploaded. Confirm details below.');
        setSaveSuccess('✅ Fonepay QR photo saved & published live!');
      }
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      setSaveSuccess('QR photo uploaded!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } finally {
      setIsScanning(false);
    }
  };

  // Live Camera Scan Webcam Handler
  const startCameraScan = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const req = eval('require');
      const jsQR = req('jsqr').default || req('jsqr');

      scanIntervalRef.current = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const vid = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          if (vid.readyState === vid.HAVE_ENOUGH_DATA && ctx) {
            canvas.width = vid.videoWidth;
            canvas.height = vid.videoHeight;
            ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
            if (qrCode && qrCode.data) {
              stopCameraScan();
              const parsed = parseFonepayQrPayload(qrCode.data);

              let updatedMc = settings.merchantCode;
              let updatedMn = settings.merchantName;

              if (parsed.merchantCode) updatedMc = parsed.merchantCode;
              if (parsed.merchantName) updatedMn = parsed.merchantName;

              const capturedImgUrl = canvas.toDataURL('image/jpeg', 0.85);

              const newQrItem: FonepayQRItem = {
                id: `qr-${Date.now()}`,
                qrImageUrl: capturedImgUrl,
                merchantName: updatedMn,
                merchantCode: updatedMc,
                isPrimary: true,
                createdAt: new Date().toISOString(),
              };

              const updatedSavedQrs = (settings.savedQrs || []).map((q) => ({ ...q, isPrimary: false }));
              updatedSavedQrs.unshift(newQrItem);

              const nextSettings: FonepaySettings = {
                ...settings,
                qrImageUrl: capturedImgUrl,
                merchantCode: updatedMc,
                merchantName: updatedMn,
                savedQrs: updatedSavedQrs,
              };

              setSettings(nextSettings);
              saveSettingsToDb(nextSettings);

              setAutoDetectedMsg(`✨ Camera Scanned! Code: ${updatedMc}, Name: ${updatedMn}`);
              setSaveSuccess('✅ Fonepay QR scanned via camera & published live as PRIMARY!');
              setTimeout(() => setSaveSuccess(''), 5000);
            }
          }
        }
      }, 300);
    } catch (err: any) {
      stopCameraScan();
      alert(`Could not access device camera: ${err.message || 'Permission denied'}`);
    }
  };

  const stopCameraScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Set a saved QR item as Primary Active QR for the Storefront
  const handleSetPrimaryQr = (qrItem: FonepayQRItem) => {
    const updatedQrs = (settings.savedQrs || []).map((item) => ({
      ...item,
      isPrimary: item.id === qrItem.id,
    }));

    const nextSettings: FonepaySettings = {
      ...settings,
      qrImageUrl: qrItem.qrImageUrl,
      merchantName: qrItem.merchantName,
      merchantCode: qrItem.merchantCode,
      savedQrs: updatedQrs,
    };

    setSettings(nextSettings);
    saveSettingsToDb(nextSettings);
    setSaveSuccess(`✅ "${qrItem.merchantName}" (${qrItem.merchantCode}) set as Primary QR and updated live on website checkout!`);
    setTimeout(() => setSaveSuccess(''), 5000);
  };

  // Delete a saved QR item
  const handleDeleteQr = (id: string) => {
    const remainingQrs = (settings.savedQrs || []).filter((q) => q.id !== id);
    if (remainingQrs.length > 0 && !remainingQrs.some((q) => q.isPrimary)) {
      remainingQrs[0].isPrimary = true;
    }

    const activeItem = remainingQrs.find((q) => q.isPrimary) || remainingQrs[0];

    const nextSettings: FonepaySettings = {
      ...settings,
      qrImageUrl: activeItem ? activeItem.qrImageUrl : settings.qrImageUrl,
      merchantName: activeItem ? activeItem.merchantName : settings.merchantName,
      merchantCode: activeItem ? activeItem.merchantCode : settings.merchantCode,
      savedQrs: remainingQrs,
    };

    setSettings(nextSettings);
    saveSettingsToDb(nextSettings);
    setSaveSuccess('QR Code deleted successfully!');
    setTimeout(() => setSaveSuccess(''), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure current inputs are saved to primary item
    let updatedQrs = [...(settings.savedQrs || [])];
    const primaryIndex = updatedQrs.findIndex((q) => q.isPrimary);

    if (primaryIndex >= 0) {
      updatedQrs[primaryIndex] = {
        ...updatedQrs[primaryIndex],
        qrImageUrl: settings.qrImageUrl,
        merchantName: settings.merchantName,
        merchantCode: settings.merchantCode,
      };
    } else {
      updatedQrs.unshift({
        id: `qr-${Date.now()}`,
        qrImageUrl: settings.qrImageUrl,
        merchantName: settings.merchantName,
        merchantCode: settings.merchantCode,
        isPrimary: true,
        createdAt: new Date().toISOString(),
      });
    }

    const nextSettings: FonepaySettings = {
      ...settings,
      savedQrs: updatedQrs,
    };

    setSettings(nextSettings);
    saveSettingsToDb(nextSettings);
    setSaveSuccess('✅ Fonepay Settings & Primary QR saved live across website!');
    setTimeout(() => setSaveSuccess(''), 5000);
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-brand-border shadow-xs">
        <div>
          <h1 className="font-serif-title text-2xl md:text-3xl font-bold text-brand-dark uppercase tracking-wider flex items-center gap-3">
            <QrCode className="text-brand-gold" size={28} />
            <span>FONEPAY QR & PAYMENT SETTINGS</span>
          </h1>
          <p className="text-xs text-brand-muted mt-1">
            Manage multiple Fonepay QR codes, auto-detect Merchant Code & Name, set Primary Active QR, and configure Dynamic QR credentials.
          </p>
        </div>
        {saveSuccess && (
          <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-4 py-3 rounded-xl flex items-center gap-2 border border-emerald-300 shadow-md animate-bounce shrink-0">
            <CheckCircle2 size={18} className="text-emerald-600" /> {saveSuccess}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: CHOOSE FONEPAY QR MODE (STATIC VS DYNAMIC) */}
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
              <ScanLine size={18} className="text-brand-gold" />
              <span>1. SELECT FONEPAY QR MODE</span>
            </h2>
            <span suppressHydrationWarning className="text-[10px] font-mono text-brand-gold font-bold uppercase bg-brand-cream px-2.5 py-1 rounded border border-brand-border">
              STORE MODE: {settings.qrMode.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mode Option 1: Static Store QR */}
            <div
              onClick={() => {
                const next = { ...settings, qrMode: 'static' as const };
                setSettings(next);
                saveSettingsToDb(next);
              }}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-3 relative ${
                settings.qrMode === 'static'
                  ? 'border-brand-dark bg-brand-cream/30 shadow-md ring-2 ring-brand-dark/10'
                  : 'border-brand-border hover:border-brand-dark/50 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="qrMode"
                    value="static"
                    checked={settings.qrMode === 'static'}
                    onChange={() => {}}
                    className="w-4 h-4 accent-brand-dark cursor-pointer"
                  />
                  <span className="font-serif-title font-bold text-sm text-brand-dark uppercase">STATIC STORE QR PHOTO</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                  STATIC QR
                </span>
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                Upload your official Fonepay QR image. Merchant Code & Name are auto-detected and displayed on checkout.
              </p>
            </div>

            {/* Mode Option 2: Dynamic QR API */}
            <div
              onClick={() => {
                const next = { ...settings, qrMode: 'dynamic' as const };
                setSettings(next);
                saveSettingsToDb(next);
              }}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all space-y-3 relative ${
                settings.qrMode === 'dynamic'
                  ? 'border-brand-dark bg-brand-cream/30 shadow-md ring-2 ring-brand-dark/10'
                  : 'border-brand-border hover:border-brand-dark/50 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="qrMode"
                    value="dynamic"
                    checked={settings.qrMode === 'dynamic'}
                    onChange={() => {}}
                    className="w-4 h-4 accent-brand-dark cursor-pointer"
                  />
                  <span className="font-serif-title font-bold text-sm text-brand-dark uppercase">DYNAMIC QR API</span>
                </div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                  REST API
                </span>
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                Enter Fonepay Business username & password to dynamically generate QR codes per order.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: SAVED FONEPAY QR CODES BOX COLLECTION & PRIMARY SELECTOR */}
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
              <Star size={18} className="text-brand-gold" />
              <span>2. SAVED FONEPAY QRS (SELECT PRIMARY FOR WEBSITE)</span>
            </h2>
            <span className="text-[10px] text-brand-muted font-mono font-bold">
              {settings.savedQrs?.length || 0} SAVED QR CODES
            </span>
          </div>

          {settings.savedQrs && settings.savedQrs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {settings.savedQrs.map((qr) => (
                <div
                  key={qr.id}
                  className={`p-4 rounded-xl border-2 transition-all relative space-y-3 flex flex-col justify-between ${
                    qr.isPrimary
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-brand-border bg-white hover:border-brand-dark/40'
                  }`}
                >
                  <div className="space-y-2 text-center">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                      {qr.isPrimary ? (
                        <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <Check size={12} /> PRIMARY WEBSITE QR
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">SECONDARY</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteQr(qr.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete QR"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="relative aspect-square w-36 mx-auto bg-white rounded-lg border border-brand-border overflow-hidden p-2 shadow-xs flex items-center justify-center">
                      <img src={qr.qrImageUrl} alt={qr.merchantName} className="w-full h-full object-contain" />
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-brand-dark line-clamp-1">{qr.merchantName}</h4>
                      <p className="font-mono text-[11px] text-brand-muted font-bold">Code: {qr.merchantCode}</p>
                    </div>
                  </div>

                  {!qr.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryQr(qr)}
                      className="w-full py-2 bg-brand-dark text-white text-[11px] font-bold rounded-lg uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-xs flex items-center justify-center gap-1"
                    >
                      <Star size={12} className="text-amber-300" />
                      <span>Set as Primary QR</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-muted text-center py-4 italic">No saved QRs yet. Upload a QR below.</p>
          )}
        </div>

        {/* SECTION 3: UPLOAD / CAMERA SCAN NEW FONEPAY QR CODE */}
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border pb-3 gap-2">
            <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
              <Plus size={18} className="text-brand-gold" />
              <span>3. ADD NEW FONEPAY QR PHOTO (AUTO DETECT)</span>
            </h2>
            <span className="text-[10px] text-brand-muted font-mono font-bold">
              FILE UPLOAD • CAMERA SCAN • AUTO DETECT
            </span>
          </div>

          {autoDetectedMsg && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs">
              <Sparkles size={16} className="text-amber-600 shrink-0" />
              <span>{autoDetectedMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Live QR Image Preview */}
            <div className="md:col-span-5 space-y-3 text-center">
              <label className="text-xs font-bold text-brand-dark uppercase tracking-wider block">
                ACTIVE STORE QR PREVIEW
              </label>
              <div className="relative aspect-square w-56 mx-auto bg-white rounded-xl border-4 border-brand-dark overflow-hidden p-3 shadow-md flex items-center justify-center">
                {settings.qrImageUrl ? (
                  <img src={settings.qrImageUrl} alt="Store Fonepay QR Preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-brand-muted p-4">
                    <ImageIcon size={36} />
                    <span className="text-[10px] mt-2">No Image Uploaded</span>
                  </div>
                )}
              </div>
              {settings.merchantCode && (
                <div className="bg-brand-cream/60 p-2.5 rounded-lg border border-brand-border text-center font-mono text-xs text-brand-dark">
                  Active Code: <strong className="font-bold text-brand-dark">{settings.merchantCode}</strong>
                </div>
              )}
            </div>

            {/* Upload & Scan Controls */}
            <div className="md:col-span-7 space-y-5 text-xs">
              {/* Option A: Upload QR Image File */}
              <div className="space-y-2">
                <label className="font-bold text-brand-dark uppercase tracking-wider block">
                  UPLOAD QR PHOTO (AUTO DETECTS MERCHANT CODE & NAME)
                </label>
                <div className="border-2 border-dashed border-brand-border hover:border-brand-dark bg-brand-cream/30 p-4 rounded-xl text-center transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    id="fonepay-admin-qr-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <label
                    htmlFor="fonepay-admin-qr-file"
                    className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:bg-brand-dark/90 shadow transition-all"
                  >
                    <Upload size={16} />
                    <span>Choose QR Image File from Device</span>
                  </label>
                  <p className="text-[10px] text-brand-muted mt-2">
                    {isScanning
                      ? 'Scanning QR code pixels & detecting Merchant Code...'
                      : 'Upload QR image file. Merchant Code & Merchant Name will auto-detect instantly!'}
                  </p>
                </div>
              </div>

              {/* Option B: Live Webcam Camera Scan */}
              <div className="space-y-2 pt-2 border-t border-brand-border">
                <label className="font-bold text-brand-dark uppercase tracking-wider block">
                  OR SCAN QR VIA CAMERA
                </label>
                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={startCameraScan}
                    className="w-full py-3 bg-emerald-700 text-white font-bold text-xs rounded-lg uppercase tracking-wider hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 shadow"
                  >
                    <Camera size={16} />
                    <span>Open Camera & Scan Fonepay QR</span>
                  </button>
                ) : (
                  <div className="space-y-3 bg-slate-900 p-4 rounded-xl text-white text-center">
                    <div className="relative aspect-video max-w-sm mx-auto bg-black rounded-lg overflow-hidden border border-slate-700">
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-2 border-dashed border-emerald-400 m-8 pointer-events-none rounded animate-pulse" />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-mono font-bold animate-pulse">
                      Point camera at Fonepay QR code...
                    </p>
                    <button
                      type="button"
                      onClick={stopCameraScan}
                      className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded hover:bg-rose-700 uppercase tracking-wider"
                    >
                      Close Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Option C: Image URL Input */}
              <div className="space-y-1.5 pt-2 border-t border-brand-border">
                <label className="font-semibold text-brand-dark block">OR PASTE EXTERNAL QR IMAGE LINK / URL</label>
                <input
                  type="url"
                  value={settings.qrImageUrl}
                  onChange={(e) => {
                    const next = { ...settings, qrImageUrl: e.target.value };
                    setSettings(next);
                    saveSettingsToDb(next);
                  }}
                  placeholder="https://..."
                  className="w-full p-2.5 border border-brand-border rounded text-xs bg-white focus:outline-none focus:border-brand-dark"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: ACTIVE MERCHANT NAME & MERCHANT CODE */}
        <div className="bg-white p-6 rounded-xl border border-brand-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border pb-3">
            <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
              <Building2 size={18} className="text-brand-gold" />
              <span>4. ACTIVE MERCHANT NAME & MERCHANT CODE</span>
            </h2>
            <span className="text-[10px] text-brand-muted font-mono font-bold">AUTO-FILLED OR EDITABLE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-brand-dark block mb-1">STORE / MERCHANT NAME *</label>
              <input
                type="text"
                required
                value={settings.merchantName}
                onChange={(e) => setSettings({ ...settings, merchantName: e.target.value })}
                placeholder="e.g. DAISY HUB PVT LTD"
                className="w-full p-3 border border-brand-border rounded font-bold text-sm focus:outline-none focus:border-brand-dark bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-brand-dark block mb-1">FONEPAY MERCHANT CODE *</label>
              <input
                type="text"
                required
                value={settings.merchantCode}
                onChange={(e) => setSettings({ ...settings, merchantCode: e.target.value })}
                placeholder="e.g. DAISY8849"
                className="w-full p-3 border border-brand-border rounded font-mono font-bold text-sm focus:outline-none focus:border-brand-dark uppercase bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-brand-dark block mb-1">CUSTOMER PAYMENT INSTRUCTIONS</label>
              <input
                type="text"
                value={settings.instructions}
                onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
                placeholder="Instructions shown under QR code during checkout..."
                className="w-full p-3 border border-brand-border rounded text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: FONEPAY BUSINESS USERNAME & PASSWORD (DYNAMIC QR MODE ONLY) */}
        {settings.qrMode === 'dynamic' && (
          <div className="bg-white p-6 rounded-xl border border-brand-border shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h2 className="font-serif-title text-base font-bold text-brand-dark uppercase tracking-wider flex items-center gap-2">
                <KeyRound size={18} className="text-brand-gold" />
                <span>5. FONEPAY BUSINESS USERNAME & PASSWORD (DYNAMIC QR MODE)</span>
              </h2>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded">
                DYNAMIC QR CREDENTIALS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-brand-dark block mb-1">FONEPAY BUSINESS USERNAME *</label>
                <input
                  type="text"
                  required={settings.qrMode === 'dynamic'}
                  value={settings.apiUsername || ''}
                  onChange={(e) => setSettings({ ...settings, apiUsername: e.target.value })}
                  placeholder="e.g. fonepay_business_username"
                  className="w-full p-3 border border-brand-border rounded font-mono focus:outline-none focus:border-brand-dark bg-white font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-brand-dark block mb-1">FONEPAY BUSINESS PASSWORD *</label>
                <input
                  type="password"
                  required={settings.qrMode === 'dynamic'}
                  value={settings.apiPassword || ''}
                  onChange={(e) => setSettings({ ...settings, apiPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full p-3 border border-brand-border rounded font-mono focus:outline-none focus:border-brand-dark bg-white font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBMIT & SAVE BUTTON */}
        <button
          type="submit"
          className="w-full py-4 bg-brand-dark text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark/90 transition-all flex items-center justify-center gap-2 shadow-xl rounded-xl"
        >
          <Save size={18} />
          <span>SAVE & PUBLISH PRIMARY FONEPAY QR LIVE</span>
        </button>
      </form>
    </div>
  );
}
