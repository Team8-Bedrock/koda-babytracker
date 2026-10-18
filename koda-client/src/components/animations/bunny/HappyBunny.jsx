import { HappyRig } from "../panda/HappyPanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function HappyBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={HappyRig} />;
}