import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  useRegions,
  useProvinces,
  useCitiesMunicipalities,
  useBarangays,
  isRegionWithoutProvinces,
  type AddressLocation,
} from "@/hooks/use-address"

// --- Searchable Location Combobox ---

interface LocationComboboxProps {
  label: string
  placeholder?: string
  value: string
  displayValue: string
  onChange: (code: string, name: string) => void
  options: AddressLocation[]
  isLoading: boolean
  disabled?: boolean
  required?: boolean
}

function LocationCombobox({
  label,
  placeholder,
  value,
  displayValue,
  onChange,
  options,
  isLoading,
  disabled = false,
  required = false,
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-[#0b1f3a]">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              "w-full justify-between font-normal h-9",
              !value && "text-muted-foreground"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading...
              </span>
            ) : value ? (
              <span className="truncate">{displayValue}</span>
            ) : (
              placeholder || `Select ${label.toLowerCase()}...`
            )}
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading..." : "No results found."}
              </CommandEmpty>
              <CommandGroup>
                {options.map((item) => (
                    <CommandItem
                      key={item.code}
                      value={item.name}
                      onSelect={() => {
                        onChange(item.code, item.name)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === item.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {item.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

// --- Main Cascading Address Selector ---

export interface AddressValues {
  regionCode: string
  regionName: string
  provinceCode: string
  provinceName: string
  cityMunicipalityCode: string
  cityMunicipalityName: string
  barangayCode: string
  barangayName: string
  houseStreet: string
  zipCode: string
}

interface CascadingAddressSelectorProps {
  values: AddressValues
  onChange: (values: AddressValues) => void
  required?: boolean
  disabled?: boolean
  compact?: boolean
}

const emptyAddress: AddressValues = {
  regionCode: "",
  regionName: "",
  provinceCode: "",
  provinceName: "",
  cityMunicipalityCode: "",
  cityMunicipalityName: "",
  barangayCode: "",
  barangayName: "",
  houseStreet: "",
  zipCode: "",
}

export function CascadingAddressSelector({
  values,
  onChange,
  required = false,
  disabled = false,
  compact = false,
}: CascadingAddressSelectorProps) {
  const { data: regions = [], isLoading: regionsLoading } = useRegions()
  const { data: provinces = [], isLoading: provincesLoading } = useProvinces(
    values.regionCode || undefined
  )
  const { data: cities = [], isLoading: citiesLoading } = useCitiesMunicipalities(
    values.provinceCode || undefined,
    values.regionCode || undefined
  )
  const { data: barangays = [], isLoading: barangaysLoading } = useBarangays(
    values.cityMunicipalityCode || undefined
  )

  const huc = isRegionWithoutProvinces(values.regionCode || undefined)

  const handleRegionChange = (code: string, name: string) => {
    onChange({
      ...emptyAddress,
      houseStreet: values.houseStreet,
      zipCode: values.zipCode,
      regionCode: code,
      regionName: name,
    })
  }

  const handleProvinceChange = (code: string, name: string) => {
    onChange({
      ...values,
      provinceCode: code,
      provinceName: name,
      cityMunicipalityCode: "",
      cityMunicipalityName: "",
      barangayCode: "",
      barangayName: "",
    })
  }

  const handleCityChange = (code: string, name: string) => {
    onChange({
      ...values,
      cityMunicipalityCode: code,
      cityMunicipalityName: name,
      barangayCode: "",
      barangayName: "",
    })
  }

  const handleBarangayChange = (code: string, name: string) => {
    onChange({
      ...values,
      barangayCode: code,
      barangayName: name,
    })
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", compact ? "" : "lg:grid-cols-4")}>
      {/* House / Street / Purok */}
      <div className={cn("space-y-1.5", compact ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-3")}>
        <Label className="text-sm font-medium text-[#0b1f3a]">House No. / Street / Purok</Label>
        <Input
          placeholder="e.g. 123 Main St., Purok 5"
          value={values.houseStreet}
          disabled={disabled}
          onChange={(e) => onChange({ ...values, houseStreet: e.target.value })}
        />
      </div>

      {/* ZIP Code */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-[#0b1f3a]">ZIP Code</Label>
        <Input
          placeholder="e.g. 4114"
          value={values.zipCode}
          disabled={disabled}
          onChange={(e) => onChange({ ...values, zipCode: e.target.value })}
        />
      </div>

      <LocationCombobox
        label="Region"
        value={values.regionCode}
        displayValue={values.regionName}
        onChange={handleRegionChange}
        options={regions}
        isLoading={regionsLoading}
        disabled={disabled}
        required={required}
      />
      <LocationCombobox
        label="Province"
        value={values.provinceCode}
        displayValue={values.provinceName}
        onChange={handleProvinceChange}
        options={provinces}
        isLoading={provincesLoading}
        disabled={disabled || !values.regionCode || huc}
        required={required && !huc}
      />
      <LocationCombobox
        label="City / Municipality"
        value={values.cityMunicipalityCode}
        displayValue={values.cityMunicipalityName}
        onChange={handleCityChange}
        options={cities}
        isLoading={citiesLoading}
        disabled={disabled || (huc ? !values.regionCode : !values.provinceCode)}
        required={required}
      />
      <LocationCombobox
        label="Barangay"
        value={values.barangayCode}
        displayValue={values.barangayName}
        onChange={handleBarangayChange}
        options={barangays}
        isLoading={barangaysLoading}
        disabled={disabled || !values.cityMunicipalityCode}
        required={required}
      />
    </div>
  )
}

export { emptyAddress }
