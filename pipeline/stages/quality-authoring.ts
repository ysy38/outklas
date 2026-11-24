import { existsSync } from "node:fs";
import path from "node:path";
import {
  qualityAuthoringLiveAuthorized,
  qualityAuthoringOutputDir,
  qualityAuthoringVersion,
  refuseQualityAuthoring,
} from "@/modules/factory/item-model/quality-authoring";
import { factoryRootCauseFixEnabled } from "@/modules/factory/item-model/root-cause-fix";
import { recoveryDefaultEnabled } from "@/modules/factory/item-model/recovery";
import { publishToStudentBank } from "@/modules/factory/item-model/review-status";

export async function runQualityAuthoring(authorization: string, outDir = qualityAuthoringOutputDir) {
  try {
    publishToStudentBank();
  } catch {
    /* bank stays closed */
  }
  if (authorization !== qualityAuthoringVersion || !qualityAuthoringLiveAuthorized) {
    return refuseQualityAuthoring("quality authoring live run is not authorized", "authorization");
  }
  if (factoryRootCauseFixEnabled || recoveryDefaultEnabled) {
    return refuseQualityAuthoring("quality authoring refuses an enabled root-cause flag or recovery", "safety");
  }
  if (path.resolve(outDir) !== path.resolve(qualityAuthoringOutputDir)) {
    return refuseQualityAuthoring("quality authoring writes only its own directory", "output");
  }
  if (existsSync(path.join(qualityAuthoringOutputDir, "summary.json"))) {
    return refuseQualityAuthoring("a completed quality-authoring run is already stored", "completed");
  }
  return refuseQualityAuthoring("live generate is not started in this revision", "not_started");
}
