import { refuseWriterBakeoffLive, writerBakeoffAuthorization } from "@/modules/factory/item-model/writer-bakeoff";

/**
 * Benchmark execution stays closed this round. Production executeCognitiveTrap is not called.
 */
export async function runWriterBakeoff(authorization: string = writerBakeoffAuthorization) {
  return refuseWriterBakeoffLive(authorization);
}
