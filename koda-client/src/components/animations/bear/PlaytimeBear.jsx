import { PlaytimeRig } from "../panda/PlaytimePanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";

export default function PlaytimeBear(props) {
  return <BearMood {...props} modelUrl={BEAR_IDLE_MODEL} Rig={PlaytimeRig} />;
}
