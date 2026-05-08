import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

describe("x402warden", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  it("placeholder", async () => {
    assert.ok(true);
  });
});
