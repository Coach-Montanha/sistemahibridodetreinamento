import * as React from "react";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "complete" | "current" | "upcoming" | "error";

export interface StepItem {
  id?: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  optional?: boolean;
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepItem[];
  activeStep: number;
  onStepClick?: (stepIndex: number) => void;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "circles" | "bullets" | "simple";
  clickable?: boolean;
}

export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      steps,
      activeStep,
      onStepClick,
      orientation = "horizontal",
      variant = "default",
      clickable = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <nav
        ref={ref}
        aria-label="Progresso das etapas"
        className={cn(
          "w-full",
          orientation === "vertical" ? "flex flex-col space-y-4" : "block",
          className
        )}
        {...props}
      >
        <ol
          className={cn(
            "flex items-center",
            orientation === "vertical"
              ? "flex-col items-start gap-4"
              : "flex-row justify-between gap-2 overflow-x-auto pb-2 no-scrollbar"
          )}
        >
          {steps.map((step, index) => {
            const isCompleted = activeStep > index;
            const isCurrent = activeStep === index;
            const isUpcoming = activeStep < index;
            const isClickable = clickable && (isCompleted || isCurrent || index === activeStep + 1);

            return (
              <li
                key={step.id || index}
                className={cn(
                  "flex-1 relative flex items-center min-w-0",
                  orientation === "vertical" ? "w-full" : "items-center"
                )}
              >
                <div
                  role={clickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={() => {
                    if (isClickable && onStepClick) {
                      onStepClick(index);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (isClickable && onStepClick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onStepClick(index);
                    }
                  }}
                  className={cn(
                    "group flex items-center gap-3 w-full text-left transition-colors rounded-lg p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isClickable ? "cursor-pointer hover:bg-muted/40" : "cursor-default opacity-70"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {/* Indicator / Circle */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ring-offset-background",
                      isCompleted &&
                        "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                      isCurrent &&
                        "border-2 border-primary bg-background text-primary font-bold shadow-sm ring-2 ring-primary/30 ring-offset-2",
                      isUpcoming &&
                        "border border-muted-foreground/30 bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : step.icon ? (
                      <step.icon className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Title and Description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs sm:text-sm font-medium leading-none truncate transition-colors",
                          isCurrent
                            ? "text-primary font-bold"
                            : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </span>
                      {step.optional && (
                        <span className="text-[10px] text-muted-foreground/80 font-normal">
                          (Opcional)
                        </span>
                      )}
                    </div>
                    {step.description && (
                      <p
                        className={cn(
                          "text-[11px] truncate mt-0.5 transition-colors hidden sm:block",
                          isCurrent ? "text-muted-foreground" : "text-muted-foreground/60"
                        )}
                      >
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connecting separator line between steps */}
                {index < steps.length - 1 && orientation === "horizontal" && (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "hidden md:block h-0.5 flex-1 mx-2 rounded-full transition-colors duration-200",
                      isCompleted ? "bg-primary" : "bg-border/60"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);
Stepper.displayName = "Stepper";
