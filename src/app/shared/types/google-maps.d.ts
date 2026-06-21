declare namespace google {
  namespace maps {
    namespace places {
      interface AutocompleteOptions {
        types?: string[];
        fields?: string[];
        componentRestrictions?: { country: string | string[] };
      }
      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }
      class Autocomplete {
        constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
        addListener(eventName: string, handler: () => void): MapsEventListener;
        getPlace(): PlaceResult;
      }
      interface PlaceResult {
        formatted_address?: string;
        address_components?: AddressComponent[];
        name?: string;
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
        };
      }
    }
    interface MapsEventListener {
      remove(): void;
    }
    namespace event {
      function removeListener(listener: MapsEventListener): void;
      function clearInstanceListeners(instance: object): void;
    }
  }
}
