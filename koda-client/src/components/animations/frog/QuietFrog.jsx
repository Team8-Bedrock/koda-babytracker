import { QuietRig } from "../panda/QuietPanda";
import { FrogMood, FROG_IDLE_MODEL } from "./frogRig";

export default function QuietFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="quiet" Rig={QuietRig} />;
}
