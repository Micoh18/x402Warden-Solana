import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

export interface ProjectClientConfig {
  rpc: string | Connection;
  wallet: any;
  programId?: PublicKey;
}

export class ProjectClient {
  private connection: Connection;

  constructor(config: ProjectClientConfig) {
    this.connection =
      typeof config.rpc === "string"
        ? new Connection(config.rpc)
        : config.rpc;
  }
}
