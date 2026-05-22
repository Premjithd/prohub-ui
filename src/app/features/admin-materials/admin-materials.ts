import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialService } from '../../services/material.service';
import { Material, CreateMaterialRequest, UpdateMaterialRequest } from '../../models/material.model';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/models/service-category.model';

// ── Add / Edit dialog ───────────────────────────────────────────────────────

@Component({
  selector: 'app-material-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.material ? 'Edit Material' : 'Add Material' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="mat-form">
        <mat-form-field appearance="outline">
          <mat-label>Category</mat-label>
          <mat-select formControlName="serviceCategoryId">
            <mat-option *ngFor="let c of data.categories" [value]="c.id">{{ c.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="Material name">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Brand</mat-label>
          <input matInput formControlName="brand" placeholder="Brand (optional)">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Unit Price (₹)</mat-label>
          <input matInput type="number" formControlName="unitPrice" placeholder="0.00" min="0.01" step="0.01">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Optional description"></textarea>
        </mat-form-field>

        <mat-form-field *ngIf="data.material" appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="isActive">
            <mat-option [value]="true">Active</mat-option>
            <mat-option [value]="false">Inactive</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="submit()">
        {{ data.material ? 'Save' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.mat-form { display: flex; flex-direction: column; gap: 8px; min-width: 360px; padding-top: 8px; }`]
})
export class MaterialFormDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MaterialFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { material?: Material; categories: ServiceCategory[] }
  ) {
    const m = data.material;
    this.form = this.fb.group({
      serviceCategoryId: [m?.serviceCategoryId ?? null, Validators.required],
      name: [m?.name ?? '', Validators.required],
      brand: [m?.brand ?? ''],
      unitPrice: [m?.unitPrice ?? null, [Validators.required, Validators.min(0.01)]],
      description: [m?.description ?? ''],
      ...(m ? { isActive: [m.isActive] } : {})
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }
}

// ── Main admin-materials page ───────────────────────────────────────────────

@Component({
  selector: 'app-admin-materials',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatChipsModule, MatTooltipModule,
    MatSnackBarModule, MatDialogModule
  ],
  template: `
    <div class="am-wrapper">
      <div class="am-header">
        <h1>Materials Catalogue</h1>
        <button mat-raised-button color="primary" (click)="openAdd()">
          <mat-icon>add</mat-icon> Add Material
        </button>
      </div>

      <div class="filter-row">
        <mat-chip-set>
          <mat-chip [highlighted]="filterActive === null" (click)="setFilter(null)">All</mat-chip>
          <mat-chip [highlighted]="filterActive === true" (click)="setFilter(true)">Active</mat-chip>
          <mat-chip [highlighted]="filterActive === false" (click)="setFilter(false)">Inactive</mat-chip>
        </mat-chip-set>
      </div>

      <div *ngIf="loading" class="am-loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && filtered.length === 0" class="am-empty">
        <mat-icon>inventory_2</mat-icon>
        <p>No materials found.</p>
      </div>

      <table *ngIf="!loading && filtered.length > 0" mat-table [dataSource]="filtered" class="am-table">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let m">
            <div class="mat-name">{{ m.name }}</div>
            <div class="mat-brand" *ngIf="m.brand">{{ m.brand }}</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef>Category</th>
          <td mat-cell *matCellDef="let m">{{ m.categoryName }}</td>
        </ng-container>

        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef>Unit Price</th>
          <td mat-cell *matCellDef="let m">₹{{ m.unitPrice | number:'1.2-2' }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let m">
            <span class="status-chip" [class.active]="m.isActive" [class.inactive]="!m.isActive">
              {{ m.isActive ? 'Active' : 'Inactive' }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let m">
            <button mat-icon-button matTooltip="Edit" (click)="openEdit(m)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="{{ m.isActive ? 'Deactivate' : 'Reactivate' }}"
                    (click)="toggleActive(m)">
              <mat-icon>{{ m.isActive ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .am-wrapper {
      max-width: 960px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .am-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      h1 { margin: 0; font-size: 1.75rem; }
    }

    .filter-row {
      margin-bottom: 1.25rem;
    }

    .am-loading, .am-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 0;
      color: #888;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
      p { margin: 0; }
    }

    .am-table {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.12);
    }

    .mat-name { font-weight: 500; }
    .mat-brand { font-size: 0.8rem; color: #888; }

    .status-chip {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      &.active { background: #e8f5e9; color: #2e7d32; }
      &.inactive { background: #fce4ec; color: #c62828; }
    }
  `]
})
export class AdminMaterialsComponent implements OnInit {
  columns = ['name', 'category', 'price', 'status', 'actions'];
  materials: Material[] = [];
  categories: ServiceCategory[] = [];
  loading = true;
  filterActive: boolean | null = true;

  get filtered(): Material[] {
    if (this.filterActive === null) return this.materials;
    return this.materials.filter(m => m.isActive === this.filterActive);
  }

  constructor(
    private materialService: MaterialService,
    private categoryService: ServiceCategoryService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: cats => { this.categories = cats; this.load(); }
    });
  }

  load(): void {
    this.loading = true;
    this.materialService.getMaterials(undefined, false).subscribe({
      next: mats => {
        this.materials = mats;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  setFilter(val: boolean | null): void {
    this.filterActive = val;
    this.cdr.markForCheck();
  }

  openAdd(): void {
    this.dialog.open(MaterialFormDialogComponent, {
      data: { categories: this.categories }
    }).afterClosed().subscribe((result: CreateMaterialRequest | undefined) => {
      if (!result) return;
      this.materialService.createMaterial(result).subscribe({
        next: () => { this.snack.open('Material added.', 'OK', { duration: 3000 }); this.load(); },
        error: () => this.snack.open('Failed to add material.', 'OK', { duration: 3000 })
      });
    });
  }

  openEdit(m: Material): void {
    this.dialog.open(MaterialFormDialogComponent, {
      data: { material: m, categories: this.categories }
    }).afterClosed().subscribe((result: UpdateMaterialRequest | undefined) => {
      if (!result) return;
      this.materialService.updateMaterial(m.id, result).subscribe({
        next: () => { this.snack.open('Material updated.', 'OK', { duration: 3000 }); this.load(); },
        error: () => this.snack.open('Failed to update material.', 'OK', { duration: 3000 })
      });
    });
  }

  toggleActive(m: Material): void {
    this.materialService.updateMaterial(m.id, { isActive: !m.isActive }).subscribe({
      next: () => {
        m.isActive = !m.isActive;
        this.snack.open(`Material ${m.isActive ? 'activated' : 'deactivated'}.`, 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
      error: () => this.snack.open('Update failed.', 'OK', { duration: 3000 })
    });
  }
}
