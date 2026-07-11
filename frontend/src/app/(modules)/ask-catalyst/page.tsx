"use client";

import { useState } from "react";
import { SendHorizontal, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { askExamples } from "@/lib/catalyst-demo-data";
import { apiClient } from "@/services/api-client";

interface Message {
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
}

export default function AskCatalystPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask about agent behavior, conflicts, traces, or version changes. I will answer with grounded data when the backend can supply it.",
      grounded: true
    }
  ]);
  const [loading, setLoading] = useState(false);

  async function submitQuery(value: string) {
    const nextQuestion = value.trim();
    if (!nextQuestion) {
      return;
    }
    setMessages((current) => [...current, { role: "user", content: nextQuestion }]);
    setQuestion("");
    setLoading(true);
    try {
      const response = await apiClient.post<{ answer: string; grounded: boolean; citations: string[] }>("/ask", {
        question: nextQuestion
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.answer, grounded: response.grounded }
      ]);
    } catch (e) {
      console.error(e);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Failed to reach the Catalyst backend. Please verify the backend service is running.",
          grounded: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      
      {/* Title Header */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2 text-text">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <span className="font-semibold text-lg">Ask Catalyst</span>
        </div>
        <p className="mt-2 text-sm text-subtle leading-relaxed">
          Grounded chat backed by live backend data, powered by Groq. Answers cite real agent IDs, conflict records, and trace runs from your configuration.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        
        {/* Chat Box */}
        <div className="rounded-2xl border border-border bg-surface flex flex-col justify-between overflow-hidden shadow-sm">
          
          <div className="max-h-[30rem] min-h-[18rem] space-y-4 overflow-y-auto p-5 custom-scrollbar bg-canvas/30">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? "ml-auto bg-[color:rgba(232,121,43,0.16)] border border-[var(--color-orange,#E8792B)]/20 text-text"
                      : "bg-canvas/70 border border-border text-text"
                  }`}
                >
                  <p>{message.content}</p>
                  
                  {/* Visual grounded status badges */}
                  {!isUser && message.grounded === false && (
                    <div className="mt-2.5 flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[9px] font-bold text-amber-300 uppercase tracking-wider select-none">
                        <AlertCircle className="h-3 w-3" />
                        Safe Fallback
                      </span>
                    </div>
                  )}
                  {!isUser && message.grounded === true && index > 0 && (
                    <div className="mt-2.5 flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-bold text-emerald-300 uppercase tracking-wider select-none">
                        <CheckCircle className="h-3 w-3" />
                        Grounded Response
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            
            {loading && (
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-canvas/70 border border-border text-subtle italic flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                <span>Catalyst is thinking...</span>
              </div>
            )}
          </div>

          {/* Form Input */}
          <div className="border-t border-border p-4 bg-canvas/20">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-border bg-canvas/80 p-3 text-sm text-text outline-none focus:ring-1 focus:ring-slate-500 transition"
              placeholder="Ask about conflicts, traces, or specific agents..."
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => submitQuery(question)}
                disabled={loading || !question.trim()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-[color:rgba(232,121,43,0.16)] px-4 py-2 text-sm font-semibold text-text hover:bg-[color:rgba(232,121,43,0.22)] transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <SendHorizontal className="h-4 w-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Example Queries */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-text uppercase tracking-wider text-[11px] text-subtle">
            Example queries
          </h2>
          <div className="space-y-2">
            {askExamples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuestion(example)}
                className="block w-full rounded-xl border border-border bg-canvas/50 px-4 py-3 text-left text-xs text-text hover:bg-canvas/80 hover:border-slate-500 transition font-medium"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
