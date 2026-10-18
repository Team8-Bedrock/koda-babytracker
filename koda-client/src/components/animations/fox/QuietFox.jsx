import { QuietRig } from "../panda/QuietPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function QuietFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="quiet" Rig={QuietRig} />;
}
