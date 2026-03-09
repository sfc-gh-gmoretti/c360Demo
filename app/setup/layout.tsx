import Link from "next/link";
import { Stepper } from "@/components/setup/stepper";
import { ArrowLeft } from "lucide-react";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-[#29B5E8] to-[#0ea5e9] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Customer 360</h1>
              <p className="text-xs text-gray-500">Configuration Wizard</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </header>

      <Stepper />

      <main className="max-w-4xl mx-auto py-8 px-6">{children}</main>
    </div>
  );
}
