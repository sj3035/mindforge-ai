import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Clock, Target, Zap } from "lucide-react";
import type { GoalInput, Priority } from "@/types/agent";

interface GoalFormProps {
  onSubmit: (input: GoalInput) => void;
  isLoading: boolean;
}

export function GoalForm({ onSubmit, isLoading }: GoalFormProps) {
  const [goal, setGoal] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [timeAvailable, setTimeAvailable] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    
    onSubmit({
      goal: goal.trim(),
      priority,
      timeAvailable: timeAvailable.trim() || undefined,
    });
  };

  const priorityConfig = {
    low: { color: "text-muted-foreground", icon: "○" },
    medium: { color: "text-warning", icon: "◐" },
    high: { color: "text-destructive", icon: "●" },
    critical: { color: "text-destructive", icon: "◉" },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="goal" className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-primary" />
          Your Goal
        </Label>
        <Textarea
          id="goal"
          placeholder="Describe your personal or academic goal in detail... (e.g., 'I want to learn machine learning fundamentals in the next 3 months')"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="min-h-[120px] resize-none bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority" className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            Priority Level
          </Label>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value as Priority)}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-secondary/50 border-border/50 focus:border-primary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="low">
                <span className="flex items-center gap-2">
                  <span className={priorityConfig.low.color}>{priorityConfig.low.icon}</span>
                  Low Priority
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center gap-2">
                  <span className={priorityConfig.medium.color}>{priorityConfig.medium.icon}</span>
                  Medium Priority
                </span>
              </SelectItem>
              <SelectItem value="high">
                <span className="flex items-center gap-2">
                  <span className={priorityConfig.high.color}>{priorityConfig.high.icon}</span>
                  High Priority
                </span>
              </SelectItem>
              <SelectItem value="critical">
                <span className="flex items-center gap-2">
                  <span className={priorityConfig.critical.color}>{priorityConfig.critical.icon}</span>
                  Critical
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            Time Available
            <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="time"
            placeholder="e.g., 2 hours/day, weekends only"
            value={timeAvailable}
            onChange={(e) => setTimeAvailable(e.target.value)}
            className="bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors placeholder:text-muted-foreground/50"
            disabled={isLoading}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={!goal.trim() || isLoading}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-6 button-shadow transition-all duration-200 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Agent Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Analyze Goal
          </span>
        )}
      </Button>
    </form>
  );
}
