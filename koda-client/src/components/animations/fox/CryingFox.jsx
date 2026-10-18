import { CryingRig } from "../panda/CryingPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function CryingFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.crying} mood="crying" Rig={CryingRig} />;
}
