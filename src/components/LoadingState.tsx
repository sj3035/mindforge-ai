import { Brain, Sparkles, Target, ListChecks } from "lucide-react";

const steps = [
  { icon: Brain, text: "Analyzing your goal..." },
  { icon: Target, text: "Breaking down into steps..." },
  { icon: ListChecks, text: "Estimating time & risks..." },
  { icon: Sparkles, text: "Generating action plan..." },
];

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      <div className="relative">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="h-10 w-10 text-primary animate-pulse-subtle" />
        </div>
        <div className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-spin-slow" />
        <div className="absolute -inset-4 rounded-full border border-primary/10 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '4s' }} />
      </div>

      <div className="space-y-3 text-center">
        <h3 className="text-lg font-medium text-foreground">MindForge Agent Working</h3>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-muted-foreground animate-fade-in"
              style={{ animationDelay: `${index * 0.5}s` }}
            >
              <step.icon className="h-4 w-4 text-primary/60" />
              <span className="text-sm">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
