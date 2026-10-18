import { SleepingRig } from "../panda/SleepingPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function SleepingFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.sleeping} mood="sleeping" Rig={SleepingRig} />;
}
