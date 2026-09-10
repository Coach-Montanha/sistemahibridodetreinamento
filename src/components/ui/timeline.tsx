import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const Timeline = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "relative flex flex-col gap-6 pl-2 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-0.5 before:bg-border/70",
      className
    )}
    {...props}
  />
));
Timeline.displayName = "Timeline";

const TimelineItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("group relative flex items-start gap-4 text-left", className)}
    {...props}
  />
));
TimelineItem.displayName = "TimelineItem";

const timelinePointVariants = cva(
  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold shadow-xs ring-4 ring-background transition-transform duration-200 group-hover:scale-105",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-muted-foreground",
        primary: "border-primary/40 bg-primary/10 text-primary",
        success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        destructive: "border-destructive/40 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface TimelinePointProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelinePointVariants> {}

const TimelinePoint = React.forwardRef<HTMLDivElement, TimelinePointProps>(
  ({ className, variant, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(timelinePointVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
);
TimelinePoint.displayName = "TimelinePoint";

const TimelineContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-1 min-w-0 flex-col gap-1 rounded-lg border border-border/50 bg-card/60 p-3 sm:p-4 shadow-xs transition-colors group-hover:border-border/80 group-hover:bg-card",
      className
    )}
    {...props}
  />
));
TimelineContent.displayName = "TimelineContent";

const TimelineTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn(
      "flex items-center gap-2 font-semibold text-sm tracking-tight text-foreground flex-wrap",
      className
    )}
    {...props}
  />
));
TimelineTitle.displayName = "TimelineTitle";

const TimelineTime = React.forwardRef<
  HTMLTimeElement,
  React.TimeHTMLAttributes<HTMLTimeElement>
>(({ className, ...props }, ref) => (
  <time
    ref={ref}
    className={cn("text-xs font-mono text-muted-foreground shrink-0", className)}
    {...props}
  />
));
TimelineTime.displayName = "TimelineTime";

const TimelineDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted-foreground leading-relaxed break-words", className)}
    {...props}
  />
));
TimelineDescription.displayName = "TimelineDescription";

export {
  Timeline,
  TimelineItem,
  TimelinePoint,
  TimelineContent,
  TimelineTitle,
  TimelineTime,
  TimelineDescription,
};
