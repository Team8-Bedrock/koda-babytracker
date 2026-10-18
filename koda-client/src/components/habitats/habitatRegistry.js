// Maps each avatar's customHabitat key to its 3D habitat component (this is for the avatar selection page)
import { lazy } from "react";

export const HABITAT_COMPONENTS = {
  bear: lazy(() => import("./BearHabitat3D")),
  bunny: lazy(() => import("./BunnyHabitat3D")),
  fox: lazy(() => import("./FoxHabitat3D")),
  frog: lazy(() => import("./FrogHabitat3D")),
  koala: lazy(() => import("./KoalaHabitat3D")),
  panda: lazy(() => import("./PandaHabitat3D")),
};
