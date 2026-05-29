import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AddressPrediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
  latitude?: number;
  longitude?: number;
  // Full address details parsed from the search response — no second round-trip needed
  details?: AddressDetails;
}

export interface AddressDetails {
  houseNameNumber: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  country: string;
  zipPostalCode: string;
  latitude?: number;
  longitude?: number;
}

// Nominatim address fields vary heavily by country.
// India uses town/village/municipality instead of city; state_district instead of county.
interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  hamlet?: string;
  town?: string;
  city?: string;
  municipality?: string;
  city_district?: string;
  district?: string;
  county?: string;
  taluk?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
  country?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: NominatimAddress;
  lat: string;
  lon: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private readonly API_URL = `${environment.apiUrl}/address`;

  constructor(private http: HttpClient) {}

  getAddressPredictions(input: string): Observable<AddressPrediction[]> {
    if (!input || input.length < 3) {
      return of([]);
    }

    return this.http.get<NominatimResult[]>(`${this.API_URL}/search`, {
      params: { query: input, countryCode: 'in' }
    }).pipe(
      map(results => {
        if (!results || results.length === 0) return [];
        return results.slice(0, 10).map(result => ({
          description: result.display_name,
          placeId: result.place_id.toString(),
          mainText: this.extractMainText(result),
          secondaryText: this.extractSecondaryText(result),
          latitude: result.lat ? parseFloat(result.lat) : undefined,
          longitude: result.lon ? parseFloat(result.lon) : undefined,
          details: this.parseNominatimAddress(result),
        }));
      }),
      catchError(() => of([]))
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<{ city: string; state: string; country: string }> {
    return this.http.get<any>('https://nominatim.openstreetmap.org/reverse', {
      params: { lat: lat.toString(), lon: lng.toString(), format: 'json' }
    }).pipe(
      map(result => {
        const a: NominatimAddress = result?.address || {};
        const city = a.city || a.town || a.municipality || a.village || a.suburb || a.hamlet || '';
        return { city, state: a.state || a.state_district || '', country: a.country || '' };
      }),
      catchError(() => of({ city: '', state: '', country: '' }))
    );
  }

  getAddressDetails(placeId: string): Observable<AddressDetails> {
    return this.http.get<NominatimResult | NominatimResult[]>(`${this.API_URL}/details`, {
      params: { placeId }
    }).pipe(
      map(result => {
        const r = Array.isArray(result) ? result[0] : result;
        return r ? this.parseNominatimAddress(r) : this.getEmptyAddressDetails();
      }),
      catchError(() => of(this.getEmptyAddressDetails()))
    );
  }

  private extractMainText(result: NominatimResult): string {
    const a = result.address;
    if (a.house_number && a.road) return `${a.house_number} ${a.road}`;
    if (a.road) return a.road;
    // Specific sub-area names take priority over broad city/town names so that
    // e.g. "Pattom" shows instead of "Thiruvananthapuram"
    return a.neighbourhood || a.suburb || a.village || a.hamlet
        || a.town || a.city || a.municipality
        || result.display_name.split(',')[0];
  }

  private extractSecondaryText(result: NominatimResult): string {
    const a = result.address;
    // When mainText is a sub-area, show the parent city in secondary so the
    // user sees e.g. "Pattom / Thiruvananthapuram, Kerala 695004"
    const isSubArea = !!(a.neighbourhood || a.suburb || a.village || a.hamlet);
    const city = isSubArea
      ? (a.city || a.town || a.municipality || a.district || a.state_district)
      : (a.city || a.town || a.municipality || a.village || a.suburb);
    const parts: string[] = [];
    if (city) parts.push(city);
    if (a.state) parts.push(a.state);
    if (a.postcode) parts.push(a.postcode);
    return parts.join(', ');
  }

  private parseNominatimAddress(result: NominatimResult): AddressDetails {
    const a = result.address;
    const lat = result.lat ? parseFloat(result.lat) : undefined;
    const lon = result.lon ? parseFloat(result.lon) : undefined;

    // Nominatim uses different fields for settlement names depending on country/place type.
    // Priority: city > town > municipality > village > hamlet > suburb > neighbourhood >
    //           city_district > county > state_district
    const city = a.city || a.town || a.municipality || a.village || a.hamlet
               || a.suburb || a.neighbourhood || a.city_district
               || a.county || a.state_district || '';

    return {
      houseNameNumber: a.house_number || '',
      street1: a.road || '',
      street2: a.suburb || a.neighbourhood || '',
      city,
      state: a.state || a.state_district || '',
      country: a.country || a.country_code?.toUpperCase() || '',
      zipPostalCode: a.postcode || '',
      latitude: lat !== undefined && !isNaN(lat) ? lat : undefined,
      longitude: lon !== undefined && !isNaN(lon) ? lon : undefined,
    };
  }

  private getEmptyAddressDetails(): AddressDetails {
    return { houseNameNumber: '', street1: '', street2: '', city: '', state: '', country: '', zipPostalCode: '' };
  }
}
