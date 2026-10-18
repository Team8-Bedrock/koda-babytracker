import { OtherRig } from "../panda/OtherPanda";
import { FrogMood, FROG_IDLE_MODEL } from "./frogRig";

export default function OtherFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="other" Rig={OtherRig} />;
}
