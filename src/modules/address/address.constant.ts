import { AddressDto } from '@/common/dto/sharedDtoSchema';
import { H3IndexUtil } from '@/common/utils/h3index.util';
import { Prisma } from '@prisma/client';

export const LocationOmit = {
  h3IndexLevel5: true,
  h3IndexLevel6: true,
  h3IndexLevel7: true,
  h3IndexLevel8: true,

  s2CellIdLevel5: true,
  s2CellIdLevel6: true,
  s2CellIdLevel7: true,
  s2CellIdLevel8: true,

  geoHashLevel5: true,
  geoHashLevel6: true,
  geoHashLevel7: true,
  geoHashLevel8: true,
} as const satisfies Prisma.LocationSelect;

export const SavedLocationDefaultInclude = {
  location: {
    omit: LocationOmit,
  },
} as const satisfies Prisma.SavedLocationInclude;

export const LocationSearchableFields = [
  'addressLine1',
  'addressLine2',
  'remarks',
  'city',
  'country',
  'zipCode',
] as const satisfies ReadonlyArray<keyof Prisma.LocationWhereInput>;

export function resolveLocation(dto: AddressDto): Prisma.LocationCreateInput {
  const {
    latitude,
    longitude,
    addressLine1,
    addressLine2,
    city,
    country,
    state,
    note,
    remarks,
    zipCode,
  } = dto;

  return {
    latitude,
    longitude,
    addressLine1,
    addressLine2,
    city,
    country,
    state,
    note,
    remarks,
    zipCode,

    h3IndexLevel5: H3IndexUtil.encodeH3(latitude, longitude, 5),
    h3IndexLevel6: H3IndexUtil.encodeH3(latitude, longitude, 6),
    h3IndexLevel7: H3IndexUtil.encodeH3(latitude, longitude, 7),
    h3IndexLevel8: H3IndexUtil.encodeH3(latitude, longitude, 8),
  };
}
