import "./globals.css";
import { Stepper } from "@/components/stepper";

export const metadata = {
  title: "Customer 360 - Configuration Wizard",
  description: "Setup and configure the Customer 360 Intelligence application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
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
              <div className="text-sm text-gray-500">
                Powered by Snowflake
              </div>
            </div>
          </header>

          <Stepper />

          <main className="max-w-4xl mx-auto py-8 px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
