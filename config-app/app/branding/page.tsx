"use client";

import { useState, useRef } from "react";
import { Upload, X, Palette, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BrandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [config, setConfig] = useState({
    companyName: "",
    companyNameFull: "",
    primaryColor: "#29B5E8",
    secondaryColor: "#0EA5E9",
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("config", JSON.stringify(config));
      if (fileInputRef.current?.files?.[0]) {
        formData.append("logo", fileInputRef.current.files[0]);
      }

      const res = await fetch("/api/save-config", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        router.push("/snowflake");
      }
    } catch (err) {
      console.error("Error saving config:", err);
    } finally {
      setSaving(false);
    }
  };

  const isValid = config.companyName.trim() !== "";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Step 1: Configure Branding
        </h2>
        <p className="text-gray-600 mt-1">
          Customize the app with your company&apos;s identity
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Company Details</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Company Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ACME"
                  value={config.companyName}
                  onChange={(e) =>
                    setConfig({ ...config, companyName: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Full Company Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ACME Financial Services"
                  value={config.companyNameFull}
                  onChange={(e) =>
                    setConfig({ ...config, companyNameFull: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Logo</h3>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-[#29B5E8] transition-colors"
            >
              {logoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-20 object-contain"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLogoPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click to upload logo</p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG up to 2MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-[#29B5E8]" />
              Brand Colors
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, primaryColor: e.target.value })
                    }
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, primaryColor: e.target.value })
                    }
                    className="input flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="label">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, secondaryColor: e.target.value })
                    }
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondaryColor}
                    onChange={(e) =>
                      setConfig({ ...config, secondaryColor: e.target.value })
                    }
                    className="input flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-4">Live Preview</h3>

            <div
              className="rounded-lg overflow-hidden border border-gray-200"
              style={{ backgroundColor: "#f8fafc" }}
            >
              <div
                className="px-4 py-3 flex items-center gap-3"
                style={{ backgroundColor: config.primaryColor }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-8" />
                ) : (
                  <div
                    className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: config.secondaryColor }}
                  >
                    {config.companyName.charAt(0) || "C"}
                  </div>
                )}
                <span className="text-white font-semibold">
                  {config.companyName || "Company"} Customer 360
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <div
                    className="px-3 py-1.5 rounded-full text-white text-sm"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    Chat
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-gray-200 text-gray-600 text-sm">
                    Dashboard
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-gray-200 text-gray-600 text-sm">
                    ML Simulator
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-600 text-sm">
                    Ask me anything about{" "}
                    {config.companyNameFull || config.companyName || "your"}{" "}
                    customers...
                  </p>
                </div>

                <div
                  className="rounded-lg p-3 text-white text-sm"
                  style={{ backgroundColor: config.secondaryColor }}
                >
                  <p className="font-medium">AI Assistant</p>
                  <p className="opacity-90 mt-1">
                    I found 1,523 customers in the {config.companyName || "your"}{" "}
                    database.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? "Saving..." : "Save & Continue"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
