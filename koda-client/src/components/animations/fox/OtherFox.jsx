import { OtherRig } from "../panda/OtherPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function OtherFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="other" Rig={OtherRig} />;
}
