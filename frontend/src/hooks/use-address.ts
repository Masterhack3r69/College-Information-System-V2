import psgc from "@/data/psgc-2026-1q.json"

export interface AddressLocation {
  code: string
  name: string
}

type PsgcRow = [code: string, name: string, type: string, parentCode: string]

const rows = psgc.locations as PsgcRow[]
const cityTypes = new Set([
  "municipality",
  "component_city",
  "highly_urbanized_city",
  "independent_component_city",
  "submunicipality",
  "special_geographic_area",
])

const regions: AddressLocation[] = []
const provincesByRegion = new Map<string, AddressLocation[]>()
const citiesByParent = new Map<string, AddressLocation[]>()
const barangaysByCity = new Map<string, AddressLocation[]>()

function addToIndex(index: Map<string, AddressLocation[]>, parentCode: string, location: AddressLocation) {
  const locations = index.get(parentCode)
  if (locations) locations.push(location)
  else index.set(parentCode, [location])
}

for (const [code, name, type, parentCode] of rows) {
  const location = { code, name }
  if (type === "region") regions.push(location)
  else if (type === "province") addToIndex(provincesByRegion, parentCode, location)
  else if (cityTypes.has(type)) addToIndex(citiesByParent, parentCode, location)
  else if (type === "barangay") addToIndex(barangaysByCity, parentCode, location)
}

const sortLocations = (locations: AddressLocation[]) => locations.sort((a, b) => a.name.localeCompare(b.name))
sortLocations(regions)
for (const index of [provincesByRegion, citiesByParent, barangaysByCity]) {
  for (const locations of index.values()) sortLocations(locations)
}

// Regions whose cities/municipalities are direct children in the PSGC hierarchy.
const REGIONS_WITHOUT_PROVINCES = new Set(
  regions.filter((region) => !provincesByRegion.has(region.code)).map((region) => region.code)
)

export function isRegionWithoutProvinces(regionCode: string | undefined): boolean {
  return !!regionCode && REGIONS_WITHOUT_PROVINCES.has(regionCode)
}

export function useRegions() {
  return { data: regions, isLoading: false }
}

export function useProvinces(regionCode: string | undefined) {
  return { data: regionCode ? provincesByRegion.get(regionCode) ?? [] : [], isLoading: false }
}

export function useCitiesMunicipalities(provinceCode: string | undefined, regionCode: string | undefined) {
  if (isRegionWithoutProvinces(regionCode)) {
    return { data: regionCode ? citiesByParent.get(regionCode) ?? [] : [], isLoading: false }
  }
  const provincialCities = provinceCode ? citiesByParent.get(provinceCode) ?? [] : []
  const independentCities = regionCode ? citiesByParent.get(regionCode) ?? [] : []
  return { data: [...provincialCities, ...independentCities].sort((a, b) => a.name.localeCompare(b.name)), isLoading: false }
}

export function useBarangays(cityMunicipalityCode: string | undefined) {
  return { data: cityMunicipalityCode ? barangaysByCity.get(cityMunicipalityCode) ?? [] : [], isLoading: false }
}

export const PSGC_VERSION = psgc.version
