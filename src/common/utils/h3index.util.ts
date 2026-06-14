import { latLngToCell, gridDisk, cellToLatLng } from 'h3-js';

const encodeH3 = (lat: number, lng: number, resolution: number): string =>
  latLngToCell(lat, lng, resolution);

const getSearchCells = (h3Index: string, radius = 1): string[] =>
  gridDisk(h3Index, radius); // radius 1 = center + 6 neighbors = 7 cells

const decodeH3 = (h3Index: string) => {
  const [lat, lng] = cellToLatLng(h3Index);
  return { lat, lng };
};

export const H3IndexUtil = { encodeH3, getSearchCells, decodeH3 };
