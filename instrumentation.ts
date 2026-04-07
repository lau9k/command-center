import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // Probe whether the get_dashboard_summary RPC exists.
    // Result is stored in process.env so the home-stats route can read it.
    try {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const supabase = createServiceClient();
      const { data, error } = await supabase.rpc("probe_rpc_exists", {
        fn_name: "get_dashboard_summary",
      });

      if (error) {
        process.env.__DASHBOARD_RPC_STATUS = "missing";
        console.warn(
          `[startup] RPC get_dashboard_summary status: missing (probe error: ${error.message})`,
        );
      } else {
        const exists = Boolean(data);
        process.env.__DASHBOARD_RPC_STATUS = exists ? "exists" : "missing";
        console.log(
          `[startup] RPC get_dashboard_summary status: ${exists ? "exists" : "missing"}`,
        );
      }
    } catch (err) {
      process.env.__DASHBOARD_RPC_STATUS = "missing";
      console.warn(
        `[startup] RPC get_dashboard_summary status: missing (${(err as Error).message})`,
      );
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
