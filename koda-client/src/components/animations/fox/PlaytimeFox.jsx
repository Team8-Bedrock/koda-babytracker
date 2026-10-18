import { PlaytimeRig } from "../panda/PlaytimePanda";
import { FoxMood, FOX_MODELS } from "./foxRig";

export default function PlaytimeFox(props) {
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="playtime" Rig={PlaytimeRig} />;
}
