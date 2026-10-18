import { ComfortRig } from "../panda/PetPanda";
import { PawPetRig, PawRefuseRig, getPalmTexture } from "../panda/PawPet";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

const KOALA_PALM = { fur: "#a7aab3", edge: "#7d808a", pad: "#3f3a3d", padEdge: "rgba(25, 22, 25, 0.55)", tuft: "#eef0f4" };

export default function PetKoala({ pet, onDone, refuse = false, comfort = false, ...props }) {
  const hand = getPalmTexture(KOALA_PALM);
  if (refuse) {
    return <KoalaMood {...props} modelUrl={KOALA_MODELS.angry} mood="refuse" Rig={PawRefuseRig} rigProps={{ pet, onDone, hand }} />;
  }
  if (comfort) {
    return <KoalaMood {...props} modelUrl={KOALA_MODELS.crying} mood="comfort" Rig={ComfortRig} rigProps={{ pet, onDone, hand }} />;
  }
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="pet" Rig={PawPetRig} rigProps={{ pet, onDone, hand }} />;
}
