import { CryingRig } from "../panda/CryingPanda";
import { FrogMood, FROG_MODELS } from "./frogRig";

export default function CryingFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_MODELS.crying} leaf="crying" Rig={CryingRig} />;
}
