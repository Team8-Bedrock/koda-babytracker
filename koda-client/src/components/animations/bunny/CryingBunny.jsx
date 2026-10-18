import { CryingRig } from "../panda/CryingPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function CryingBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={CryingRig} />;
}