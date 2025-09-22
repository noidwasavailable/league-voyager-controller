type EasyNameBoard = "left" | "right";
type EasyNameX = "thumb" | number;
type EasyNameY = number;

export type EasyName = `${EasyNameBoard}-${EasyNameX}-${EasyNameY}`;

export type SetRgbOptions = {
  led: number | EasyName;
  color: `#${string}`;
};
