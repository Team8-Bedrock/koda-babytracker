import { SleepyRig } from "../panda/SleepyPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function SleepyFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.sleepy} mood="sleepy" Rig={SleepyRig} />;
}
