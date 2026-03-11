"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle, Circle } from "lucide-react";

const steps = [
  { id: 1, name: "Branding", path: "/branding" },
  { id: 2, name: "Snowflake", path: "/snowflake" },
  { id: 3, name: "Sample Data", path: "/data" },
  { id: 4, name: "Deploy", path: "/deploy" },
  { id: 5, name: "Test", path: "/test" },
];

interface StepperProps {
  completedSteps?: number[];
  currentStep?: number;
}

export function Stepper({ completedSteps = [], currentStep }: StepperProps) {
  const pathname = usePathname();
  const activeStep = currentStep || steps.findIndex((s) => pathname.includes(s.path.split("/").pop()!)) + 1;

  return (
    <nav className="flex items-center justify-center gap-2 py-4 px-6 bg-white border-b border-gray-200">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isActive = step.id === activeStep;
        const isPast = step.id < activeStep;

        return (
          <div key={step.id} className="flex items-center">
            <Link
              href={step.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isActive
                  ? "bg-[#29B5E8] text-white"
                  : isCompleted || isPast
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5" />
              ) : isActive ? (
                <div className="h-5 w-5 flex items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                  {step.id}
                </div>
              ) : (
                <Circle className="h-5 w-5" />
              )}
              <span className="font-medium text-sm">{step.name}</span>
            </Link>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  isCompleted || isPast ? "bg-green-300" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
