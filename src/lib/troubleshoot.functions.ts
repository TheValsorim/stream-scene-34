import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTroubleshootingSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        device: z.string().max(100),
        browser: z.string().max(100),
        problem: z.string().min(5).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The AI helper isn't set up yet." };
    const { suggestFix } = await import("./troubleshoot.server");
    try {
      const steps = await suggestFix(
        `Device: ${data.device || "unknown"}\nBrowser: ${data.browser || "unknown"}\nProblem: ${data.problem}`,
        apiKey,
      );
      if (!steps.trim()) return { ok: false as const, error: "No suggestion could be generated." };
      return { ok: true as const, steps };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 429) return { ok: false as const, error: "Too many requests — try again in a minute." };
      if (status === 402)
        return { ok: false as const, error: "AI credits are used up. Add credits to keep using the helper." };
      return { ok: false as const, error: "The AI helper is unavailable right now. Please try again later." };
    }
  });
