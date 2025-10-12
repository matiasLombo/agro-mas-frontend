import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Province, Department, Municipality, Locality, Settlement, LocationResponse } from '@core/models/location.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Get all provinces
   */
  getProvinces(params?: {
    nombre?: string;
    campos?: string[];
    max?: number;
  }): Observable<{ provincias: Province[] }> {
    let httpParams = new HttpParams();

    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params?.campos && params.campos.length > 0) httpParams = httpParams.set('campos', params.campos.join(','));
    if (params?.max) httpParams = httpParams.set('max', params.max.toString());

    return this.http.get<{ provincias: Province[] }>(`${this.apiUrl}/locations/provinces`, { params: httpParams });
  }

  /**
   * Get departments by province
   */
  getDepartments(params?: {
    provincia?: string;
    nombre?: string;
    campos?: string[];
    max?: number;
  }): Observable<{ departamentos: Department[] }> {
    let httpParams = new HttpParams();

    if (params?.provincia) httpParams = httpParams.set('provincia', params.provincia);
    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params?.campos && params.campos.length > 0) httpParams = httpParams.set('campos', params.campos.join(','));
    if (params?.max) httpParams = httpParams.set('max', params.max.toString());

    return this.http.get<{ departamentos: Department[] }>(`${this.apiUrl}/locations/departments`, { params: httpParams });
  }

  /**
   * Get municipalities by province
   */
  getMunicipalities(params?: {
    provincia?: string;
    nombre?: string;
    campos?: string[];
    max?: number;
  }): Observable<{ municipios: Municipality[] }> {
    let httpParams = new HttpParams();

    if (params?.provincia) httpParams = httpParams.set('provincia', params.provincia);
    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params?.campos && params.campos.length > 0) httpParams = httpParams.set('campos', params.campos.join(','));
    if (params?.max) httpParams = httpParams.set('max', params.max.toString());

    return this.http.get<{ municipios: Municipality[] }>(`${this.apiUrl}/locations/municipalities`, { params: httpParams });
  }

  /**
   * Get localities by province and/or municipality
   */
  getLocalities(params?: {
    provincia?: string;
    municipio?: string;
    nombre?: string;
    campos?: string[];
    max?: number;
  }): Observable<{ localidades: Locality[] }> {
    let httpParams = new HttpParams();

    if (params?.provincia) httpParams = httpParams.set('provincia', params.provincia);
    if (params?.municipio) httpParams = httpParams.set('municipio', params.municipio);
    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params?.campos && params.campos.length > 0) httpParams = httpParams.set('campos', params.campos.join(','));
    if (params?.max) httpParams = httpParams.set('max', params.max.toString());

    return this.http.get<{ localidades: Locality[] }>(`${this.apiUrl}/locations/localities`, { params: httpParams });
  }

  /**
   * Get location information from coordinates
   */
  getLocationByCoordinates(lat: number, lon: number): Observable<LocationResponse> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString());

    return this.http.get<LocationResponse>(`${this.apiUrl}/locations/coordinates`, { params });
  }

  /**
   * Get settlements by province and/or department
   */
  getSettlements(params?: {
    provincia?: string;
    departamento?: string;
    nombre?: string;
    campos?: string[];
    max?: number;
  }): Observable<{ asentamientos: Settlement[] }> {
    let httpParams = new HttpParams();

    if (params?.provincia) httpParams = httpParams.set('provincia', params.provincia);
    if (params?.departamento) httpParams = httpParams.set('departamento', params.departamento);
    if (params?.nombre) httpParams = httpParams.set('nombre', params.nombre);
    if (params?.campos && params.campos.length > 0) httpParams = httpParams.set('campos', params.campos.join(','));
    if (params?.max) httpParams = httpParams.set('max', params.max.toString());

    return this.http.get<{ asentamientos: Settlement[] }>(`${this.apiUrl}/locations/settlements`, { params: httpParams });
  }

  /**
   * Normalize address or location name
   */
  normalizeAddress(direccion: string): Observable<any> {
    const params = new HttpParams().set('direccion', direccion);

    return this.http.get<any>(`${this.apiUrl}/locations/addresses`, { params });
  }

  /**
   * Get province name by ID
   */
  getProvinceById(provinceId: string): Observable<string> {
    const params = new HttpParams().set('id', provinceId);
    return this.http.get<string>(`${this.apiUrl}/locations/province`, { params });
  }

  /**
   * Get settlement info by name and province
   */
  getSettlementByName(settlementName: string, provinceId: string): Observable<Settlement | null> {
    const params = new HttpParams()
      .set('nombre', settlementName)
      .set('provincia', provinceId);
    return this.http.get<Settlement | null>(`${this.apiUrl}/locations/settlement`, { params });
  }

  /**
   * Resolve location names from codes/IDs to full location info
   */
  resolveLocationNames(provinceId: string, cityName: string): Observable<{
    provinceName: string;
    departmentName: string;
    settlementName: string;
  }> {
    const params = new HttpParams()
      .set('provinceId', provinceId)
      .set('cityName', cityName);
    return this.http.get<{
      provinceName: string;
      departmentName: string;
      settlementName: string;
    }>(`${this.apiUrl}/locations/resolve`, { params });
  }
}