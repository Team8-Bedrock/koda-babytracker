import { PlaytimeRig } from "../panda/PlaytimePanda";
import { BunnyMood, BUNNY_IDLE_MODEL } from "./bunnyRig";

export default function PlaytimeBunny(props) {
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={PlaytimeRig} />;
}