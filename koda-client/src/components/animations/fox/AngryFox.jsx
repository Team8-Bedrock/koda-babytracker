import { AngryRig } from "../panda/AngryPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function AngryFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.angry} mood="angry" Rig={AngryRig} />;
}
