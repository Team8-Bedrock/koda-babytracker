import { QuietRig } from "../panda/QuietPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function QuietBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={QuietRig} />;
}