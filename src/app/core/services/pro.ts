import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { Pro, ProBankDetails, UpdateBankDetailsRequest } from '../models/pro.model';
import { ApiResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class ProService {
  constructor(private api: ApiService) {}

  getPro(proId: number): Observable<ApiResponse<Pro>> {
    return this.api.get<Pro>(`pros/${proId}`);
  }

  updatePro(proData: any): Observable<ApiResponse<Pro>> {
    return this.api.put<Pro>(`pros/${proData.id}`, proData);
  }

  getBankDetails(proId: number): Observable<ProBankDetails> {
    return this.api.get<ProBankDetails>(`pros/${proId}/bank-details`) as Observable<ProBankDetails>;
  }

  updateBankDetails(proId: number, req: UpdateBankDetailsRequest): Observable<any> {
    return this.api.put<any>(`pros/${proId}/bank-details`, req);
  }
}
