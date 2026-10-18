import { HungryRig } from "../panda/HungryPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function HungryBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={HungryRig} />;
}