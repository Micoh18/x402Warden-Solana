import { Command } from "commander";
import {
  buildPolicyTemplatePreset,
  simulatePolicyPayment,
  type PolicyTemplateMerchantV1,
  type PolicyTemplatePresetName,
} from "@x402warden/sdk";
import { success, error } from "../output";
import {
  formatPolicyTemplate,
  inferPolicyTemplateFormat,
  readPolicyTemplateFile,
  writePolicyTemplateFile,
  type PolicyTemplateFormat,
} from "../policy-template-io";

const PRESETS: PolicyTemplatePresetName[] = [
  "conservative",
  "balanced",
  "exploration",
  "high_value",
];

function parseFormat(value: string | undefined, outPath?: string): PolicyTemplateFormat {
  if (!value) return inferPolicyTemplateFormat(outPath);
  if (value !== "json" && value !== "yaml") {
    throw new Error("format must be json or yaml");
  }
  return value;
}

function collectMerchant(value: string, previous: string[]): string[] {
  return previous.concat(value);
}

function parseMerchantEntry(value: string): PolicyTemplateMerchantV1 {
  const [merchant, maxPerCallOverride, category] = value.split(":");
  if (!merchant) throw new Error("merchant entry requires merchant public key");

  return {
    merchant,
    maxPerCallOverride: maxPerCallOverride || undefined,
    category: category != null && category !== "" ? parseInt(category, 10) : undefined,
  };
}

export const policyTemplateCommand = new Command("policy-template")
  .description("Export and locally simulate policy templates");

policyTemplateCommand
  .command("export")
  .description("Export a built-in policy template preset")
  .argument("[preset]", `Preset: ${PRESETS.join(", ")}`, "balanced")
  .option("--format <format>", "Output format: json or yaml")
  .option("--out <path>", "Write template to a file")
  .action((presetName: string, opts) => {
    try {
      if (!PRESETS.includes(presetName as PolicyTemplatePresetName)) {
        throw new Error(`Unknown preset '${presetName}'. Use one of: ${PRESETS.join(", ")}`);
      }

      const template = buildPolicyTemplatePreset(
        presetName as PolicyTemplatePresetName
      );
      const format = parseFormat(opts.format, opts.out);

      if (opts.out) {
        writePolicyTemplateFile(opts.out, template, format);
        return success({ preset: presetName, path: opts.out, format, template });
      }

      if (format === "yaml") {
        process.stdout.write(formatPolicyTemplate(template, "yaml"));
        process.stdout.write("\n");
        process.exit(0);
      }

      return success({ preset: presetName, template });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });

policyTemplateCommand
  .command("simulate")
  .description("Simulate a payment against a policy template without sending a transaction")
  .argument("<template>", "Policy template JSON/YAML file")
  .requiredOption("--amount <microUsdc>", "Payment amount in micro-USDC")
  .option("--merchant <pubkey>", "Merchant public key")
  .option("--spent-in-period <microUsdc>", "Current spent_in_period", "0")
  .option("--period-start <unixSeconds>", "Current period_start", "0")
  .option("--now <unixSeconds>", "Simulation time", "0")
  .option("--paused", "Simulate a paused agent", false)
  .option(
    "--merchant-entry <merchant[:maxOverride[:category]]>",
    "Additional allowlist merchant entry for this simulation; repeatable",
    collectMerchant,
    []
  )
  .action((templatePath: string, opts) => {
    try {
      const template = readPolicyTemplateFile(templatePath);
      const merchants = [
        ...(template.merchants ?? []),
        ...((opts.merchantEntry ?? []) as string[]).map(parseMerchantEntry),
      ];
      const decision = simulatePolicyPayment({
        template,
        amount: opts.amount,
        merchant: opts.merchant,
        spentInPeriod: opts.spentInPeriod,
        periodStart: opts.periodStart,
        now: opts.now,
        paused: Boolean(opts.paused),
        merchants,
      });

      return success({ template: template.name, decision });
    } catch (err: any) {
      return error(err?.message || String(err));
    }
  });
