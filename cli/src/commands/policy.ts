import { Command } from "commander";
import { BN } from "@coral-xyz/anchor";
import {
  X402WardenClient,
  findAgentAccountPda,
  policyTemplateToSetPolicyParams,
} from "@x402warden/sdk";
import type { SetPolicyParams } from "@x402warden/sdk";
import { loadConfig } from "../config";
import { success, error } from "../output";
import { readPolicyTemplateFile } from "../policy-template-io";

function paramsToJson(params: SetPolicyParams): Record<string, unknown> {
  return {
    maxPerCall: params.maxPerCall.toString(),
    maxPerPeriod: params.maxPerPeriod.toString(),
    periodSeconds: params.periodSeconds.toString(),
    disputeWindowSeconds: params.disputeWindowSeconds,
    allowlistEnabled: params.allowlistEnabled,
    autoSettleEnabled: params.autoSettleEnabled,
  };
}

function optionWasProvided(command: Command, name: string): boolean {
  const source = command.getOptionValueSource(name);
  return source != null && source !== "default";
}

function buildParamsFromOptions(opts: any, command: Command): SetPolicyParams {
  if (opts.template) {
    const template = readPolicyTemplateFile(opts.template);
    const params = policyTemplateToSetPolicyParams(template);

    if (opts.maxPerCall != null) params.maxPerCall = new BN(opts.maxPerCall);
    if (opts.maxPerPeriod != null) params.maxPerPeriod = new BN(opts.maxPerPeriod);
    if (optionWasProvided(command, "periodSeconds") && opts.periodSeconds != null) {
      params.periodSeconds = new BN(opts.periodSeconds);
    }
    if (optionWasProvided(command, "disputeWindow") && opts.disputeWindow != null) {
      params.disputeWindowSeconds = parseInt(opts.disputeWindow, 10);
    }
    if (optionWasProvided(command, "allowlist")) {
      params.allowlistEnabled = Boolean(opts.allowlist);
    }
    if (optionWasProvided(command, "autoSettle")) {
      params.autoSettleEnabled = Boolean(opts.autoSettle);
    }

    return params;
  }

  if (opts.maxPerCall == null || opts.maxPerPeriod == null) {
    throw new Error(
      "Provide --template or both --max-per-call and --max-per-period"
    );
  }

  return {
    maxPerCall: new BN(opts.maxPerCall),
    maxPerPeriod: new BN(opts.maxPerPeriod),
    periodSeconds: new BN(opts.periodSeconds ?? "86400"),
    disputeWindowSeconds: parseInt(opts.disputeWindow ?? "300", 10),
    allowlistEnabled: Boolean(opts.allowlist),
    autoSettleEnabled: opts.autoSettle,
  };
}

export const policyCommand = new Command("policy")
  .description("Set spending policy for an agent")
  .option("--agent-id <id>", "Agent ID override")
  .option("--template <path>", "Policy template JSON/YAML file")
  .option("--max-per-call <amount>", "Max USDC per call (micro-USDC)")
  .option("--max-per-period <amount>", "Max USDC per period (micro-USDC)")
  .option("--period-seconds <seconds>", "Policy period in seconds", "86400")
  .option("--dispute-window <seconds>", "Dispute window in seconds", "300")
  .option("--allowlist", "Enable merchant allowlist", false)
  .option("--no-allowlist", "Disable merchant allowlist")
  .option("--auto-settle", "Enable auto-settle", true)
  .option("--no-auto-settle", "Disable auto-settle")
  .option("--dry-run", "Print resolved policy params without sending a transaction", false)
  .action(async (opts, command: Command) => {
    try {
      const params = buildParamsFromOptions(opts, command);

      if (opts.dryRun) {
        return success({
          dryRun: true,
          params: paramsToJson(params),
          note:
            "Dry run only. Policy templates may include merchant entries, but this command applies only PolicyAccount fields.",
        });
      }

      const agentIdOverride = opts.agentId != null ? parseInt(opts.agentId, 10) : undefined;
      const config = loadConfig(agentIdOverride);

      const client = new X402WardenClient({
        connection: config.connection,
        wallet: config.wallet,
        programId: config.programId,
      });

      const [agentPda] = findAgentAccountPda(
        config.wallet.publicKey,
        config.agentId,
        config.programId
      );

      const txSignature = await client.setPolicy(agentPda, params);

      return success({
        txSignature,
        params: paramsToJson(params),
        note: opts.template
          ? "Template merchant entries are not applied by set_policy; use allowlist commands for merchant entries."
          : undefined,
      });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
