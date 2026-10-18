import { HappyRig } from "../panda/HappyPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function HappyFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="happy" Rig={HappyRig} />;
}
