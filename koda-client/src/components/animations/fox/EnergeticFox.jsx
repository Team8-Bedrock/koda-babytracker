import { EnergeticRig } from "../panda/EnergeticPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function EnergeticFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="energetic" Rig={EnergeticRig} />;
}
