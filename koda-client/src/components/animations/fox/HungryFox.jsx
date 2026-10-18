import { HungryRig } from "../panda/HungryPanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function HungryFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.hungry} mood="hungry" Rig={HungryRig} />;
}
