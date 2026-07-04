"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_CODES,
  formatPhoneE164,
  splitInternationalPhone,
  type CountryCode,
} from "@/lib/phone-numbers";
import { cn } from "@/lib/utils";

export function PhoneNumberInput({
  id,
  name,
  label = "Telephone WhatsApp",
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const isControlled = value !== undefined;
  const initial = splitInternationalPhone(value);
  const [uncontrolledPhone, setUncontrolledPhone] = useState(initial);
  const currentPhone = isControlled ? splitInternationalPhone(value) : uncontrolledPhone;
  const countryCode = currentPhone.countryCode as CountryCode;
  const nationalNumber = currentPhone.nationalNumber;
  const selectedCountry = PHONE_COUNTRY_CODES.find((country) => country.value === countryCode);
  const phoneValue = formatPhoneE164(countryCode, nationalNumber);

  function updatePhone(nextCountryCode: CountryCode, nextNationalNumber: string) {
    const nextPhone = { countryCode: nextCountryCode, nationalNumber: nextNationalNumber };
    if (!isControlled) setUncontrolledPhone(nextPhone);
    onChange?.(formatPhoneE164(nextPhone.countryCode, nextPhone.nationalNumber));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {name ? <input type="hidden" name={name} value={phoneValue} /> : null}
      <div className="grid grid-cols-[8.5rem_1fr] gap-2">
        <Select
          value={countryCode}
          onValueChange={(nextValue) => updatePhone(nextValue as CountryCode, nationalNumber)}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder={DEFAULT_PHONE_COUNTRY} />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRY_CODES.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.value} · {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          value={nationalNumber}
          onChange={(event) => updatePhone(countryCode, event.target.value)}
          placeholder={placeholder ?? selectedCountry?.example ?? "Numero"}
          className="h-11"
        />
      </div>
    </div>
  );
}
