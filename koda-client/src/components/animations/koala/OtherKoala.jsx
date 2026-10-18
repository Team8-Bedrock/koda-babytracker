import { OtherRig } from "../panda/OtherPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function OtherKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.idle} mood="other" Rig={OtherRig} />;
}
