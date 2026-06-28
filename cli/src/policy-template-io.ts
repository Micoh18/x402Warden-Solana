import * as fs from "fs";
import * as path from "path";
import YAML from "yaml";
import {
  validatePolicyTemplateV1,
  type PolicyTemplateV1,
} from "@x402warden/sdk";

export type PolicyTemplateFormat = "json" | "yaml";

export function inferPolicyTemplateFormat(filePath?: string): PolicyTemplateFormat {
  const ext = filePath ? path.extname(filePath).toLowerCase() : "";
  return ext === ".yaml" || ext === ".yml" ? "yaml" : "json";
}

export function readPolicyTemplateFile(filePath: string): PolicyTemplateV1 {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed =
    inferPolicyTemplateFormat(filePath) === "yaml"
      ? YAML.parse(raw)
      : JSON.parse(raw);
  return validatePolicyTemplateV1(parsed);
}

export function formatPolicyTemplate(
  template: PolicyTemplateV1,
  format: PolicyTemplateFormat
): string {
  const normalized = validatePolicyTemplateV1(template);
  if (format === "yaml") {
    return YAML.stringify(normalized);
  }
  return JSON.stringify(normalized, null, 2);
}

export function writePolicyTemplateFile(
  filePath: string,
  template: PolicyTemplateV1,
  format: PolicyTemplateFormat = inferPolicyTemplateFormat(filePath)
): void {
  fs.writeFileSync(filePath, `${formatPolicyTemplate(template, format)}\n`, "utf-8");
}
