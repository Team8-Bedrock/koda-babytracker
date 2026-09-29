// Static list of selectable child avatars/characters, each with its model path, habitat theme, and 
// selection-screen background gradient.

export const DEFAULT_MODEL = "/models/characters/bear.glb";

export const AVATARS = [
  {
    id: "bear",
    habitat: "Hollow Woods",
    habitatClass: "habitat-bear",
    model: "/models/characters/bear/bear.glb",
    bg: "linear-gradient(180deg, #a8845a 0%, #7a9b5c 100%)",
    customHabitat: "bear",
  },
  {
    id: "frog",
    habitat: "Frog Land",
    habitatClass: "habitat-frog",
    model: "/models/characters/frog/frog.glb",
    bg: "linear-gradient(180deg, #4a9fd4 0%, #2ecc71 100%)",
    customHabitat: "frog",
  },
  {
    id: "bunny",
    habitat: "Meadow Burrow",
    habitatClass: "habitat-bunny",
    model: "/models/characters/bunny/bunny.glb",
    bg: "linear-gradient(180deg, #f7c6d9 0%, #f5efe0 100%)",
    customHabitat: "bunny",
  },
  {
    id: "panda",
    habitat: "Bamboo Grove",
    habitatClass: "habitat-panda",
    model: "/models/characters/panda/panda.glb",
    bg: "linear-gradient(180deg, #a8b8a0 0%, #eef7e8 100%)",
    customHabitat: "panda",
  },
  {
    id: "koala",
    habitat: "Eucalyptus Canopy",
    habitatClass: "habitat-koala",
    model: "/models/characters/koala/koala.glb",
    bg: "linear-gradient(180deg, #8fa8b0 0%, #d9cfc0 100%)",
    customHabitat: "koala",
  },
  {
    id: "fox",
    habitat: "Fox Den",
    habitatClass: "habitat-fox",
    model: "/models/characters/fox/fox.glb",
    bg: "linear-gradient(180deg, #e8935a 0%, #f5efe0 100%)",
    customHabitat: "fox",
  },
];

export const getAvatarById = (id) => AVATARS.find((a) => a.id === id) || null;
