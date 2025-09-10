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
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
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
    MatOptionModule
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
    public dialogRef: MatDialogRef<EditProfileModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      phone: [''],
      address: [''],
      province: [''],
      department: [{value: '', disabled: true}],
      city: [{value: '', disabled: true}]
    });
  }

  ngOnInit(): void {
    this.loadProvinces();
    
    // Load current user data and populate form
    setTimeout(() => {
      this.currentUser = this.authService.currentUser;
      if (this.currentUser) {
        // Populate basic form fields
        this.profileForm.patchValue({
          first_name: this.currentUser.first_name || '',
          last_name: this.currentUser.last_name || '',
          phone: this.currentUser.phone || '',
          address: this.currentUser.address || ''
        });
        
        // Handle location data separately after provinces are loaded
        this.setLocationData();
      }
      this.isInitialLoading = false;
    }, 800);
  }

  private setLocationData(): void {
    if (!this.currentUser) return;
    
    // Wait for provinces to be loaded, then set location data
    const checkProvincesLoaded = () => {
      if (this.provinces.length > 0) {
        // Set province if it exists
        if (this.currentUser?.province) {
          const provinceName = this.currentUser.province;
          this.profileForm.patchValue({
            province: provinceName
          });
          this.selectedProvinceId = provinceName;
          
          // Enable department selector and load departments
          this.profileForm.get('department')?.enable();
          this.loadDepartments(provinceName, () => {
            // After departments are loaded, check if user has a department
            if (this.currentUser?.department) {
              this.profileForm.patchValue({
                department: this.currentUser.department
              });
              
              // Load settlements filtered by province and department
              this.profileForm.get('city')?.enable();
              this.loadSettlements(provinceName, this.currentUser.department, () => {
                if (this.currentUser?.city) {
                  this.profileForm.patchValue({
                    city: this.currentUser.city
                  });
                }
              });
            } else {
              // No department saved, but if we have a city, try to find its department first
              this.profileForm.get('city')?.enable();
              if (this.currentUser?.city) {
                // Try to find the department that contains this city
                this.findDepartmentForCity(provinceName, this.currentUser.city);
              } else {
                // No city either, just load all settlements for the province
                this.loadSettlements(provinceName, undefined);
              }
            }
          });
        }
      } else {
        // Retry after a short delay if provinces aren't loaded yet
        setTimeout(checkProvincesLoaded, 100);
      }
    };
    
    checkProvincesLoaded();
  }

  loadProvinces(): void {
    this.locationService.getProvinces().subscribe({
      next: (response) => {
        this.provinces = response.provincias;
      },
      error: (error) => {
        console.error('Error loading provinces:', error);
      }
    });
  }

  loadDepartments(provinceName: string, callback?: () => void): void {
    if (provinceName) {
      this.locationService.getDepartments({ provincia: provinceName }).subscribe({
        next: (response) => {
          this.departments = response.departamentos;
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
      const params: any = { provincia: provinceName };
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

  private findDepartmentForCity(provinceName: string, cityName: string): void {
    // Search through each department to find which one contains this city
    if (this.departments.length === 0) {
      // If departments aren't loaded yet, just load all settlements
      this.loadSettlements(provinceName, undefined, () => {
        this.profileForm.patchValue({ city: cityName });
      });
      return;
    }

    let foundDepartment = false;
    let departmentIndex = 0;

    const checkNextDepartment = () => {
      if (departmentIndex >= this.departments.length) {
        // Didn't find the city in any department, load all settlements
        this.loadSettlements(provinceName, undefined, () => {
          this.profileForm.patchValue({ city: cityName });
        });
        return;
      }

      const department = this.departments[departmentIndex];
      this.loadSettlements(provinceName, department.nombre, () => {
        // Check if our city is in the loaded settlements
        const cityFound = this.settlements.find(s => s.nombre === cityName);
        if (cityFound && !foundDepartment) {
          foundDepartment = true;
          // Found the department! Set it and the city
          this.profileForm.patchValue({
            department: department.nombre,
            city: cityName
          });
        } else {
          // Not found in this department, try next
          departmentIndex++;
          setTimeout(checkNextDepartment, 200);
        }
      });
    };

    checkNextDepartment();
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

      console.log('Updating profile:', updatedProfile);
      
      // Call the actual AuthService updateProfile method
      this.authService.updateProfile(updatedProfile).subscribe({
        next: (updatedUser) => {
          this.isLoading = false;
          
          // Close modal with updated data
          this.dialogRef.close({
            updated: true,
            data: updatedUser
          });
          
          // Show success message
          console.log('Perfil actualizado exitosamente');
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error updating profile:', error);
          // Could show error message to user here
        }
      });
    }
  }
}
