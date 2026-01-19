import { 
  Brain, 
  ListOrdered, 
  Clock, 
  AlertTriangle, 
  Rocket,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgentResponse } from "@/types/agent";

interface ResultDisplayProps {
  result: AgentResponse;
}

export function ResultDisplay({ result }: ResultDisplayProps) {
  const complexityColors = {
    simple: "bg-success/10 text-success border-success/20",
    moderate: "bg-warning/10 text-warning border-warning/20",
    complex: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const severityColors = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/10 text-warning",
    high: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Goal Analysis */}
      <Card className="p-6 card-gradient border-border/50 card-shadow">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Goal Analysis</h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {result.goalAnalysis.category}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${complexityColors[result.goalAnalysis.complexity]}`}
                >
                  {result.goalAnalysis.complexity}
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {result.goalAnalysis.summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Action Steps */}
      <Card className="p-6 card-gradient border-border/50 card-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ListOrdered className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Action Steps</h3>
            <p className="text-xs text-muted-foreground">{result.actionSteps.length} steps to achieve your goal</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {result.actionSteps.map((step, index) => (
            <div 
              key={step.stepNumber}
              className="group relative pl-8 pb-4 last:pb-0 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Timeline line */}
              {index < result.actionSteps.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
              )}
              
              {/* Step number circle */}
              <div className="absolute left-0 top-0 h-6 w-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                {step.stepNumber}
              </div>
              
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/30 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-foreground text-sm">{step.title}</h4>
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 flex-shrink-0">
                    <Clock className="h-3 w-3" />
                    {step.estimatedTime}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{step.description}</p>
                {step.dependencies.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground/70">
                    <ChevronRight className="h-3 w-3" />
                    Depends on: {step.dependencies.join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Time Estimate & Risks Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Time */}
        <Card className="p-6 card-gradient border-border/50 card-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Estimated Time</p>
              <p className="text-xl font-semibold text-foreground">{result.totalEstimatedTime}</p>
            </div>
          </div>
        </Card>

        {/* Risks Summary */}
        <Card className="p-6 card-gradient border-border/50 card-shadow">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Identified Risks</p>
              <p className="text-xl font-semibold text-foreground">{result.risks.length} potential risks</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Risks Detail */}
      {result.risks.length > 0 && (
        <Card className="p-6 card-gradient border-border/50 card-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <h3 className="font-semibold text-foreground">Risk Assessment</h3>
          </div>
          
          <div className="space-y-3">
            {result.risks.map((risk, index) => (
              <div 
                key={risk.id}
                className="bg-secondary/30 rounded-lg p-4 border border-border/30 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-foreground text-sm">{risk.title}</h4>
                  <Badge className={`text-xs ${severityColors[risk.severity]}`}>
                    {risk.severity}
                  </Badge>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                  <span>{risk.mitigation}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Next Immediate Action */}
      <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 card-shadow glow-effect">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Next Immediate Action</h3>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {result.nextImmediateAction.timeframe}
              </Badge>
            </div>
            <p className="text-foreground font-medium">{result.nextImmediateAction.action}</p>
            <p className="text-sm text-muted-foreground">{result.nextImmediateAction.reasoning}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
