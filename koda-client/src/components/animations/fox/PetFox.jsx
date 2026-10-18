import { ComfortRig } from "../panda/PetPanda";
import { PawPetRig, PawRefuseRig, getPalmTexture } from "../panda/PawPet";
import { FoxMood, FOX_MODELS } from "./foxRig";

const FOX_PALM = { fur: "#e07b45", edge: "#b65a2c", pad: "#3b2a24", padEdge: "rgba(25, 15, 10, 0.55)", tuft: "#fff3e4" };

export default function PetFox({ pet, onDone, refuse = false, comfort = false, ...props }) {
  const hand = getPalmTexture(FOX_PALM);
  if (refuse) {
    return <FoxMood {...props} modelUrl={FOX_MODELS.angry} mood="refuse" Rig={PawRefuseRig} rigProps={{ pet, onDone, hand }} />;
  }
  if (comfort) {
    return <FoxMood {...props} modelUrl={FOX_MODELS.crying} mood="comfort" Rig={ComfortRig} rigProps={{ pet, onDone, hand }} />;
  }
  return <FoxMood {...props} modelUrl={FOX_MODELS.idle} mood="pet" Rig={PawPetRig} rigProps={{ pet, onDone, hand }} />;
}
