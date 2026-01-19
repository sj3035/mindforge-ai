import { useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { GoalForm } from "@/components/GoalForm";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { ResultDisplay } from "@/components/ResultDisplay";
import { analyzeGoal } from "@/lib/api";
import type { GoalInput, AgentResponse, AgentError } from "@/types/agent";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<AgentError | null>(null);
  const [lastInput, setLastInput] = useState<GoalInput | null>(null);

  const handleSubmit = async (input: GoalInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setLastInput(input);

    try {
      const response = await analyzeGoal(input);
      setResult(response);
    } catch (err) {
      setError(err as AgentError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastInput) {
      handleSubmit(lastInput);
    }
  };

  const handleNewGoal = () => {
    setResult(null);
    setError(null);
    setLastInput(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="border-b border-border/50 bg-gradient-to-b from-secondary/20 to-transparent">
        <div className="container max-w-4xl py-8 px-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center glow-effect">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="gradient-text">MindForge</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-md">
            Your personal AI planning agent. Transform goals into structured, actionable plans with intelligent analysis.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl py-8 px-4">
        {!result && !isLoading && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2 mb-8">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                <Sparkles className="h-3 w-3 text-primary" />
                Powered by AI Agent
              </div>
              <h2 className="text-xl font-semibold text-foreground">What's your goal?</h2>
              <p className="text-muted-foreground text-sm">
                Enter your personal or academic goal and let MindForge create a comprehensive action plan.
              </p>
            </div>
            
            <div className="bg-card/50 border border-border/50 rounded-xl p-6 card-shadow">
              <GoalForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        )}

        {isLoading && <LoadingState />}

        {error && !isLoading && (
          <ErrorDisplay error={error} onRetry={handleRetry} />
        )}

        {result && !isLoading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Your Action Plan</h2>
              <button
                onClick={handleNewGoal}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <Sparkles className="h-4 w-4" />
                New Goal
              </button>
            </div>
            <ResultDisplay result={result} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container max-w-4xl px-4">
          <p className="text-xs text-muted-foreground text-center">
            MindForge – Personal AI Planning Agent • Built with Generative AI
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
