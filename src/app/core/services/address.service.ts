import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AddressPrediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface AddressDetails {
  houseNameNumber: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  country: string;
  zipPostalCode: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  // Use backend API endpoint instead of direct Nominatim to avoid CORS issues
  private readonly API_URL = `${environment.apiUrl}/address`;

  constructor(private http: HttpClient) {}

  /**
   * Get address predictions based on input using backend proxy to Nominatim
   * The backend handles CORS by making server-to-server requests
   * Free, no API key required
   */
  getAddressPredictions(input: string): Observable<AddressPrediction[]> {
    if (!input || input.length < 6) {
      return of([]);
    }

    return this.http.get<NominatimResult[]>(`${this.API_URL}/search`, {
      params: {
        query: input,
        countryCode: 'us' // Restrict to US, change as needed
      }
    }).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      map(results => {
        if (!results || results.length === 0) {
          return [];
        }

        return results.slice(0, 10).map(result => ({
          description: result.display_name,
          placeId: result.place_id.toString(),
          mainText: this.extractMainText(result),
          secondaryText: this.extractSecondaryText(result)
        }));
      }),
      catchError(error => {
        console.warn('Error fetching address predictions:', error);
        return of([]);
      })
    );
  }

  /**
   * Get detailed address information from place ID
   */
  getAddressDetails(placeId: string): Observable<AddressDetails> {
    return this.http.get<NominatimResult>(`${this.API_URL}/details`, {
      params: {
        placeId: placeId
      }
    }).pipe(
      map(result => this.parseNominatimAddress(result)),
      catchError(error => {
        console.warn('Error fetching address details:', error);
        return of(this.getEmptyAddressDetails());
      })
    );
  }

  /**
   * Extract main text from Nominatim result
   */
  private extractMainText(result: NominatimResult): string {
    const { house_number, road } = result.address;
    if (house_number && road) {
      return `${house_number} ${road}`;
    }
    return road || house_number || result.display_name.split(',')[0];
  }

  /**
   * Extract secondary text (city, state) from Nominatim result
   */
  private extractSecondaryText(result: NominatimResult): string {
    const { city, suburb, state, postcode } = result.address;
    const parts = [];
    if (city || suburb) {
      parts.push(city || suburb);
    }
    if (state) {
      parts.push(state);
    }
    if (postcode) {
      parts.push(postcode);
    }
    return parts.join(', ');
  }

  /**
   * Parse Nominatim address components into AddressDetails
   */
  private parseNominatimAddress(result: NominatimResult): AddressDetails {
    const { house_number, road, suburb, city, state, postcode, country_code } = result.address;

    return {
      houseNameNumber: house_number || '',
      street1: road || '',
      street2: suburb || '',
      city: city || '',
      state: state || '',
      country: country_code?.toUpperCase() || '',
      zipPostalCode: postcode || ''
    };
  }

  /**
   * Get empty address details object
   */
  private getEmptyAddressDetails(): AddressDetails {
    return {
      houseNameNumber: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      country: '',
      zipPostalCode: ''
    };
  }
}
