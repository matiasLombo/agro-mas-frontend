import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/user.model';
import { Province, Department, Settlement } from '../../core/models/location.model';

@Component({
  selector: 'app-edit-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './edit-profile-modal.component.html',
  styleUrl: './edit-profile-modal.component.scss'
})
export class EditProfileModalComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  isLoading = false;
  isInitialLoading = true;

  // Location data
  provinces: Province[] = [];
  departments: Department[] = [];
  settlements: Settlement[] = [];
  selectedProvinceId: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private locationService: LocationService,
    private toastService: ToastService,
    public dialogRef: MatDialogRef<EditProfileModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      phone: [''],
      address: [''],
      province: [''],
      department: [{ value: '', disabled: true }],
      city: [{ value: '', disabled: true }]
    });
  }

  ngOnInit(): void {
    this.loadProvinces();
    this.loadUserData();
  }

  private loadUserData(): void {
    // Simulate loading delay for better UX
    setTimeout(() => {
      this.currentUser = this.authService.currentUser;
      if (this.currentUser) {
        this.populateForm();
        this.setLocationData();
      }
      this.isInitialLoading = false;
    }, 500); // Reduced from 800ms
  }

  private populateForm(): void {
    if (!this.currentUser) return;

    this.profileForm.patchValue({
      first_name: this.currentUser.first_name || '',
      last_name: this.currentUser.last_name || '',
      phone: this.currentUser.phone || '',
      address: this.currentUser.address || ''
    });
  }

  private setLocationData(): void {
    if (!this.currentUser) return;

    // Wait for provinces to be loaded, then set location data
    const checkProvincesLoaded = () => {
      if (this.provinces.length > 0) {
        this.setUserLocationData();
      } else {
        // Retry after a short delay if provinces aren't loaded yet
        setTimeout(checkProvincesLoaded, 100);
      }
    };

    checkProvincesLoaded();
  }

  private setUserLocationData(): void {
    if (!this.currentUser) return;

    // Set province if it exists
    if (this.currentUser.province) {
      const provinceName = this.currentUser.province;
      this.profileForm.patchValue({ province: provinceName });
      this.selectedProvinceId = provinceName;

      // Enable and load departments
      this.profileForm.get('department')?.enable();
      this.loadDepartments(provinceName, () => {
        // Set department if it exists
        if (this.currentUser?.department) {
          // Find department in loaded departments
          const foundDepartment = this.departments.find(d => d.nombre === this.currentUser?.department);

          if (foundDepartment) {
            // Use control setValue after enabling the field
            const departmentControl = this.profileForm.get('department');
            if (departmentControl) {
              departmentControl.setValue(foundDepartment.nombre);
            }
          }

          // Load settlements filtered by province and department
          this.loadSettlements(provinceName, this.currentUser.department, () => {
            // Set city if it exists
            if (this.currentUser?.city) {
              this.profileForm.patchValue({ city: this.currentUser.city });
            }
          });
        } else {
          // No department - load all settlements for the province
          this.loadSettlements(provinceName, undefined, () => {
            // Set city if it exists (without department filter)
            if (this.currentUser?.city) {
              this.profileForm.patchValue({ city: this.currentUser.city });
            }
          });
        }

        // Enable city selector
        this.profileForm.get('city')?.enable();
      });
    }
  }

  loadProvinces(): void {
    this.locationService.getProvinces({ max: 50 }).subscribe({
      next: (response) => {
        this.provinces = response.provincias;
      },
      error: (error) => {
        console.error('Error loading provinces:', error);
        this.toastService.showError('Fallo al cargar las provincias.', 'Error de conexión');
      }
    });
  }

  loadDepartments(provinceName: string, callback?: () => void): void {
    if (provinceName) {
      this.locationService.getDepartments({ provincia: provinceName, max: 100 }).subscribe({
        next: (response) => {
          this.departments = response.departamentos || [];
          // Execute callback after departments are loaded
          if (callback) {
            callback();
          }
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        }
      });
    }
  }

  loadSettlements(provinceName: string, departmentName?: string, callback?: () => void): void {
    if (provinceName) {
      const params: any = { provincia: provinceName, max: 200 };
      if (departmentName) {
        params.departamento = departmentName;
      }

      this.locationService.getSettlements(params).subscribe({
        next: (response) => {
          this.settlements = response.asentamientos;
          // Execute callback after settlements are loaded
          if (callback) {
            callback();
          }
        },
        error: (error) => {
          console.error('Error loading settlements:', error);
        }
      });
    }
  }

  onProvinceChange(event: any): void {
    const provinceName = event.value;
    this.selectedProvinceId = provinceName;

    // Reset dependent fields
    this.departments = [];
    this.settlements = [];
    this.profileForm.patchValue({ department: '', city: '' });

    if (provinceName) {
      // Enable department selector and load departments
      this.profileForm.get('department')?.enable();
      this.loadDepartments(provinceName);

      // Load settlements for the province (without department filter initially)
      this.loadSettlements(provinceName);
      this.profileForm.get('city')?.enable();
    } else {
      // Disable both department and city selectors
      this.profileForm.get('department')?.disable();
      this.profileForm.get('city')?.disable();
    }
  }

  onDepartmentChange(event: any): void {
    const departmentName = event.value;

    // Reset settlements
    this.settlements = [];
    this.profileForm.patchValue({ city: '' });

    if (departmentName && this.selectedProvinceId) {
      // Load settlements filtered by both province and department
      this.loadSettlements(this.selectedProvinceId, departmentName);
    } else if (this.selectedProvinceId) {
      // Load settlements for the province only (no department filter)
      this.loadSettlements(this.selectedProvinceId);
    }
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.profileForm.valid && !this.isLoading) {
      this.isLoading = true;

      // Include disabled fields in the payload
      const updatedProfile = {
        ...this.profileForm.value,
        ...this.profileForm.getRawValue() // This includes disabled fields
      };

      console.log('Form value:', this.profileForm.value);
      console.log('Form raw value:', this.profileForm.getRawValue());
      console.log('Department control state:', {
        value: this.profileForm.get('department')?.value,
        enabled: this.profileForm.get('department')?.enabled,
        valid: this.profileForm.get('department')?.valid
      });
      console.log('Final payload being sent:', updatedProfile);

      // Call the actual AuthService updateProfile method
      this.authService.updateProfile(updatedProfile).subscribe({
        next: (updatedUser) => {
          this.isLoading = false;

          // Show success toast
          this.toastService.showSuccess('Tu perfil fue actualizado correctamente.', 'Éxito!');

          // Close modal with updated data
          this.dialogRef.close({
            updated: true,
            data: updatedUser
          });
        },
        error: (error) => {
          this.isLoading = false;

          // Show error toast with specific message
          const errorMessage = error?.message || 'No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.';
          this.toastService.showError(errorMessage, 'Error');

          console.error('Error updating profile:', error);
        }
      });
    }
  }
}
