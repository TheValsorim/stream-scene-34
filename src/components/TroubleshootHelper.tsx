import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getTroubleshootingSteps } from "@/lib/troubleshoot.functions";

function detect() {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android phone"
        : /Mac/.test(ua)
          ? "Mac computer"
          : /Windows/.test(ua)
            ? "Windows computer"
            : "Computer";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /CriOS|Chrome\//.test(ua)
      ? "Chrome"
      : /FxiOS|Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return { device, browser };
}

export function TroubleshootHelper() {
  const ask = useServerFn(getTroubleshootingSteps);
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState("");
  const [browser, setBrowser] = useState("");
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = detect();
    setDevice(d.device);
    setBrowser(d.browser);
  }, []);

  async function submit() {
    setLoading(true);
    setError(null);
    setSteps(null);
    try {
      const res = await ask({ data: { device, browser, problem } });
      if (res.ok) setSteps(res.steps);
      else setError(res.error);
    } catch {
      setError("The AI helper is unavailable right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 text-left"
      >
        <LifeBuoy className="size-5 text-accent" />
        <div>
          <h2 className="font-semibold">Having trouble with your stream?</h2>
          <p className="text-sm text-muted-foreground">
            Describe the problem and get AI-powered steps to fix it.
          </p>
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Device" maxLength={100} />
            <Input value={browser} onChange={(e) => setBrowser(e.target.value)} placeholder="Browser" maxLength={100} />
          </div>
          <Textarea
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="E.g. Preview goes black after a few minutes, viewers hear no sound…"
            rows={4}
            maxLength={2000}
          />
          <Button onClick={submit} disabled={loading || problem.trim().length < 5}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Thinking…" : "Get fix steps"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {steps && (
            <div className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-relaxed">{steps}</div>
          )}
        </div>
      )}
    </section>
  );
}
