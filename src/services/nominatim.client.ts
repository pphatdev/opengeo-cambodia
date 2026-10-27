import axios, { AxiosInstance } from 'axios';
import { config } from '../config.js';
import type { NominatimRawItem } from '../types/geocode.js';

export class NominatimClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.nominatim.baseUrl,
      timeout: config.nominatim.timeoutMs,
      headers: {
        'User-Agent': config.nominatim.userAgent,
        'Accept': 'application/json',
        'Accept-Language': 'km,en;q=0.8',
      },
    });
  }

  /**
   * Reverse geocode GPS latitude and longitude
   */
  public async reverse(lat: number, lon: number): Promise<NominatimRawItem | null> {
    try {
      const response = await this.client.get<NominatimRawItem>('/reverse', {
        params: {
          lat,
          lon,
          format: 'jsonv2',
          addressdetails: 1,
          zoom: 18,
          'accept-language': 'km,en',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[NominatimClient] Reverse geocode error:', error.response?.status, error.message);
      } else {
        console.error('[NominatimClient] Unknown error:', error);
      }
      return null;
    }
  }

  /**
   * Free-text address search bounded to Cambodia
   */
  public async search(query: string, limit = 10): Promise<NominatimRawItem[]> {
    try {
      const response = await this.client.get<NominatimRawItem[]>('/search', {
        params: {
          q: query,
          format: 'jsonv2',
          addressdetails: 1,
          countrycodes: 'kh',
          limit,
          'accept-language': 'km,en',
        },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[NominatimClient] Search geocode error:', error.response?.status, error.message);
      } else {
        console.error('[NominatimClient] Unknown error:', error);
      }
      return [];
    }
  }
}
