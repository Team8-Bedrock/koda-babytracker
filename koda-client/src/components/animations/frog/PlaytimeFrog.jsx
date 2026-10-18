import { PlaytimeRig } from "../panda/PlaytimePanda";
import { FrogMood, FROG_IDLE_MODEL } from "./frogRig";

export default function PlaytimeFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="playtime" Rig={PlaytimeRig} />;
}
