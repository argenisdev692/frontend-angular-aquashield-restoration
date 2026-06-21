import { Directive, ElementRef, OnDestroy, OnInit, inject, output } from '@angular/core';
import { NgControl } from '@angular/forms';
import { GoogleMapsLoaderService } from '../services/google-maps-loader.service';

/** Structured address emitted when a place is picked from the suggestions. */
export interface PlaceSelection {
  /** Street line (`street_number route`), falling back to the formatted address. */
  address: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
}

function pick(
  components: google.maps.places.AddressComponent[],
  type: string,
  useShort = false,
): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return '';
  return useShort ? match.short_name : match.long_name;
}

/**
 * Attaches Google Places Autocomplete to a street-address input. On selection
 * it emits a structured {@link PlaceSelection} (city/state/zip/country +
 * lat/long) so the host form can autofill the dependent fields, and writes the
 * street line back into the bound control.
 *
 * Reuses the shared {@link GoogleMapsLoaderService}; degrades silently (emits
 * `mapsErrored`) when no API key / the SDK fails to load.
 */
@Directive({
  selector: '[appAddressAutocomplete]',
})
export class AddressAutocompleteDirective implements OnInit, OnDestroy {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly loader = inject(GoogleMapsLoaderService);
  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  readonly placeSelected = output<PlaceSelection>();
  readonly mapsLoadingChange = output<boolean>();
  readonly mapsErrored = output<string | null>();

  private autocomplete: google.maps.places.Autocomplete | null = null;
  private listener: google.maps.MapsEventListener | null = null;

  async ngOnInit(): Promise<void> {
    this.mapsLoadingChange.emit(true);
    const loaded = await this.loader.load();
    this.mapsLoadingChange.emit(false);

    if (!loaded) {
      this.mapsErrored.emit('Google Maps unavailable. Address autocomplete is disabled.');
      return;
    }
    this.mapsErrored.emit(null);

    // Defer until the input is in the DOM (deferred blocks, *@if, etc.).
    requestAnimationFrame(() => this.attach());
  }

  ngOnDestroy(): void {
    this.detach();
  }

  private attach(): void {
    const input = this.el.nativeElement;
    if (!input) return;

    this.autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      fields: ['formatted_address', 'address_components', 'geometry'],
    });

    this.listener = this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete!.getPlace();
      const components = place.address_components ?? [];

      const streetNumber = pick(components, 'street_number');
      const route = pick(components, 'route');
      const street = [streetNumber, route].filter(Boolean).join(' ').trim();

      const city =
        pick(components, 'locality') ||
        pick(components, 'postal_town') ||
        pick(components, 'sublocality_level_1') ||
        pick(components, 'administrative_area_level_2');

      const selection: PlaceSelection = {
        address: street || place.formatted_address || input.value,
        city,
        state: pick(components, 'administrative_area_level_1', true),
        zipcode: pick(components, 'postal_code'),
        country: pick(components, 'country'),
        latitude: place.geometry?.location?.lat() ?? null,
        longitude: place.geometry?.location?.lng() ?? null,
        formattedAddress: place.formatted_address ?? input.value,
      };

      // Sync the bound control to the street line (Google wrote the full
      // formatted address straight into the DOM input, bypassing Angular).
      this.ngControl?.control?.setValue(selection.address);

      this.placeSelected.emit(selection);
    });
  }

  private detach(): void {
    if (this.listener) {
      google.maps.event.removeListener(this.listener);
      this.listener = null;
    }
    if (this.autocomplete) {
      google.maps.event.clearInstanceListeners(this.el.nativeElement);
      this.autocomplete = null;
    }
  }
}
