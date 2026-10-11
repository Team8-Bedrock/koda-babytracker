import { HungryRig } from "../panda/HungryPanda";
import { BearMood } from "./bearRig";

export default function HungryBear(props) {
  return <BearMood {...props} modelUrl={"/models/characters/bear/hungry.glb"} Rig={HungryRig} />;
}
