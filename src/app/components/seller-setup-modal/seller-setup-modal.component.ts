import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SellerService, SellerProfileRequest } from '../../services/seller.service';
import { AuthService } from '../../core/services/auth.service';
import { provinces } from '../../core/data/argentina.data';
import { LocationService } from '../../core/services/location.service';
import { Province, Department, Settlement } from '../../core/models/location.model';
import { Observable, of, switchMap, tap } from 'rxjs';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-seller-setup-modal',
  templateUrl: './seller-setup-modal.component.html',
  styleUrls: ['./seller-setup-modal.component.scss']
})
export class SellerSetupModalComponent implements OnInit {
  sellerForm: FormGroup;
  personalInfoForm: FormGroup;
  provinces: Province[] = [];
  departments: Department[] = [];
  settlements: Settlement[] = [];
  
  // Step management
  currentStep: number = 1;
  totalSteps: number = 2;
  needsPersonalInfo: boolean = false;
  
  // Loading states
  isSubmitting = false;
  isLoading = true;
  isLoadingLocations = false;
  isFirstTimeSetup = true;

  constructor(
    private fb: FormBuilder,
    private sellerService: SellerService,
    private authService: AuthService,
    private locationService: LocationService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<SellerSetupModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.sellerForm = this.createForm();
    this.personalInfoForm = this.createPersonalInfoForm();
  }

  ngOnInit(): void {
    // Check if personal info is complete first
    this.checkPersonalInfoCompletion();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      business_name: ['', [Validators.required, Validators.minLength(2)]],
      cuit: ['', [Validators.required, this.cuitValidator]],
      cbu: ['', [Validators.required, this.cbuValidator]],
      cbu_alias: [''],
      bank_name: [''],
      renspa: ['', [Validators.required, this.renspaValidator]],
      establishment_name: [''],
      establishment_location: [''],
      business_type: ['']
    });
  }

  private createPersonalInfoForm(): FormGroup {
    return this.fb.group({
      phone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      province: ['', [Validators.required]],
      department: ['', [Validators.required]],
      city: ['', [Validators.required]]
    });
  }

  private checkPersonalInfoCompletion(): void {
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.snackBar.open('Error: No se pudo obtener información del usuario', 'Cerrar');
      this.dialogRef.close(false);
      return;
    }

    // Check if essential personal info is missing
    const missingInfo = {
      phone: !currentUser.phone || currentUser.phone.trim() === '',
      address: !currentUser.address || currentUser.address.trim() === '',
      province: !currentUser.province || currentUser.province.trim() === '',
      city: !currentUser.city || currentUser.city.trim() === ''
    };

    this.needsPersonalInfo = Object.values(missingInfo).some(Boolean);
    
    if (this.needsPersonalInfo) {
      this.currentStep = 0;
      this.totalSteps = 3;
      this.loadLocations().then(() => {
        this.populatePersonalInfoForm(currentUser, missingInfo);
        this.isLoading = false;
      });
    } else {
      this.currentStep = 1;
      this.totalSteps = 2;
      this.loadExistingProfile();
    }
  }

  private async loadLocations(): Promise<void> {
    try {
      const response = await this.locationService.getProvinces().toPromise();
      this.provinces = response?.provincias || [];
    } catch (error) {
      console.error('Error loading provinces:', error);
    }
  }

  private populatePersonalInfoForm(currentUser: User, missingInfo: any): void {
    this.personalInfoForm.patchValue({
      phone: currentUser.phone || '',
      address: currentUser.address || '',
      province: currentUser.province || '',
      department: currentUser.department || '',
      city: currentUser.city || ''
    });

    // Only require fields that are actually missing
    Object.keys(missingInfo).forEach(field => {
      const control = this.personalInfoForm.get(field);
      if (missingInfo[field] && control) {
        control.setValidators([Validators.required]);
        control.updateValueAndValidity();
      }
    });

    // Load departments and settlements if province is selected
    if (currentUser.province) {
      this.onProvinceChange(currentUser.province);
    }
  }

  private loadExistingProfile(): void {
    this.sellerService.getSellerProfile().subscribe({
      next: (response) => {
        if (response.profile) {
          this.isFirstTimeSetup = false;
          this.sellerForm.patchValue({
            business_name: response.profile.business_name || '',
            cuit: this.formatCuitForDisplay(response.profile.cuit || ''),
            cbu: response.profile.cbu || '',
            cbu_alias: response.profile.cbu_alias || '',
            bank_name: response.profile.bank_name || '',
            renspa: response.profile.renspa || '',
            establishment_name: response.profile.establishment_name || '',
            establishment_location: response.profile.establishment_location || '',
            business_type: response.profile.business_type || ''
          });
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.log('No existing profile found, starting fresh');
        this.isLoading = false;
      }
    });
  }

  private formatCuitForDisplay(cuit: string): string {
    if (!cuit) return '';
    
    // Remove any non-digit characters
    const digits = cuit.replace(/\D/g, '');
    
    // Format as XX-XXXXXXXX-X if we have 11 digits
    if (digits.length === 11) {
      return `${digits.substring(0, 2)}-${digits.substring(2, 10)}-${digits.substring(10, 11)}`;
    }
    
    // Return as is if not 11 digits
    return digits;
  }

  onSubmit(): void {
    if (this.currentStep === 0) {
      this.submitPersonalInfo();
    } else {
      this.submitSellerProfile();
    }
  }

  private submitPersonalInfo(): void {
    if (this.personalInfoForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const profileData = this.personalInfoForm.value;
      
      this.authService.updateProfile(profileData).subscribe({
        next: (updatedUser) => {
          this.snackBar.open('Información personal actualizada', 'Cerrar', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.isSubmitting = false;
          this.nextStep();
        },
        error: (error) => {
          this.isSubmitting = false;
          this.snackBar.open('Error al actualizar información personal', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  private submitSellerProfile(): void {
    if (this.sellerForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      const currentUser = this.authService.currentUser;
      if (!currentUser) {
        this.snackBar.open('Error: No se pudo obtener información del usuario', 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.isSubmitting = false;
        return;
      }

      // Clean formatted values before sending to backend
      const formValues = { ...this.sellerForm.value };
      
      // Remove formatting from CUIT, CBU, and RENSPA
      if (formValues.cuit) {
        formValues.cuit = formValues.cuit.replace(/\D/g, ''); // Keep only digits
      }
      if (formValues.cbu) {
        formValues.cbu = formValues.cbu.replace(/\D/g, ''); // Keep only digits
      }
      if (formValues.renspa) {
        formValues.renspa = formValues.renspa.replace(/\D/g, ''); // Keep only digits
      }

      const profileData: SellerProfileRequest = {
        ...formValues,
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        city: currentUser.city || '',
        province: currentUser.province || ''
      };
      
      this.sellerService.upgradeToSeller(profileData).subscribe({
        next: (response) => {
          const message = this.isFirstTimeSetup 
            ? '🎉 ¡Perfil de vendedor configurado correctamente!'
            : 'Información actualizada correctamente';
            
          this.snackBar.open(message, 'Cerrar', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isSubmitting = false;
          let errorMessage = 'Error al configurar el perfil de vendedor';
          
          if (error.error?.code === 'CUIT_EXISTS') {
            errorMessage = 'Este CUIT ya está registrado por otro usuario';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.snackBar.open(errorMessage, 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // Navigation methods
  nextStep(): void {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      if (this.currentStep === 1 && this.needsPersonalInfo) {
        this.loadExistingProfile();
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  // Location handling
  onProvinceChange(provinceId: string): void {
    this.isLoadingLocations = true;
    this.departments = [];
    this.settlements = [];
    
    if (provinceId) {
      this.locationService.getDepartments({ provincia: provinceId }).subscribe({
        next: (response) => {
          this.departments = response.departamentos || [];
          this.isLoadingLocations = false;
        },
        error: () => {
          this.isLoadingLocations = false;
        }
      });
    } else {
      this.isLoadingLocations = false;
    }
  }

  onDepartmentChange(departmentId: string): void {
    this.isLoadingLocations = true;
    this.settlements = [];
    
    if (departmentId) {
      this.locationService.getSettlements({ departamento: departmentId }).subscribe({
        next: (response) => {
          this.settlements = response.asentamientos || [];
          this.isLoadingLocations = false;
        },
        error: () => {
          this.isLoadingLocations = false;
        }
      });
    } else {
      this.isLoadingLocations = false;
    }
  }


  private getFieldDisplayName(fieldName: string): string {
    const displayNames: {[key: string]: string} = {
      'business_name': 'Nombre comercial',
      'cuit': 'CUIT',
      'cbu': 'CBU/CVU',
      'renspa': 'Código RENSPA',
      'phone': 'Teléfono',
      'address': 'Dirección',
      'province': 'Provincia',
      'department': 'Departamento',
      'city': 'Ciudad/Asentamiento'
    };
    return displayNames[fieldName] || fieldName;
  }

  get canProceed(): boolean {
    if (this.currentStep === 0) {
      return this.personalInfoForm.valid;
    }
    return this.sellerForm.valid;
  }

  // Custom validators
  private cuitValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Remove any non-digit characters
    const digits = control.value.toString().replace(/\D/g, '');
    
    // Solo validar que tenga exactamente 11 dígitos
    if (digits.length !== 11) {
      return { cuitLength: { message: 'El CUIT debe tener exactamente 11 dígitos' } };
    }
    
    return null;
  }
  
  private cbuValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // Remove any non-digit characters
    const digits = control.value.toString().replace(/\D/g, '');
    
    if (digits.length !== 22) {
      return { cbuLength: { message: 'El CBU/CVU debe tener 22 dígitos' } };
    }
    
    return null;
  }
  
  private renspaValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // RENSPA format: 123456789012 (12 digits)
    const digits = control.value.toString().replace(/\D/g, '');
    
    if (digits.length < 10 || digits.length > 15) {
      return { renspaLength: { message: 'El código RENSPA debe tener entre 10 y 15 dígitos' } };
    }
    
    return null;
  }
  
  // Input formatting methods
  onCuitInput(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Limit to 11 digits max
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    
    // Format as XX-XXXXXXXX-X only when there are enough digits
    let formattedValue = value;
    if (value.length >= 3) {
      formattedValue = value.substring(0, 2) + '-';
      if (value.length >= 11) {
        formattedValue += value.substring(2, 10) + '-' + value.substring(10, 11);
      } else {
        formattedValue += value.substring(2);
      }
    }
    
    this.sellerForm.patchValue({ cuit: formattedValue }, { emitEvent: false });
    event.target.value = formattedValue;
  }
  
  onCbuInput(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length <= 22) {
      // Format as XXXX XXXX XXXX XXXX XXXX XX
      value = value.match(/.{1,4}/g)?.join(' ') || value;
      if (value.length > 27) { // 22 digits + 5 spaces = 27 chars max
        value = value.substring(0, 27);
      }
      
      this.sellerForm.patchValue({ cbu: value }, { emitEvent: false });
      event.target.value = value;
    }
  }
  
  onRenspaInput(event: any): void {
    let value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    
    if (value.length <= 15) {
      // Format as XXXX.XXXX.XXXX.XXX or similar
      if (value.length > 4) {
        value = value.substring(0, 4) + '.' + value.substring(4);
      }
      if (value.length > 9) {
        value = value.substring(0, 9) + '.' + value.substring(9);
      }
      if (value.length > 14) {
        value = value.substring(0, 14) + '.' + value.substring(14);
      }
      
      this.sellerForm.patchValue({ renspa: value }, { emitEvent: false });
      event.target.value = value;
    }
  }

  // Override getFieldError to handle new validation messages
  getFieldError(fieldName: string, formName: 'seller' | 'personal' = 'seller'): string {
    const form = formName === 'seller' ? this.sellerForm : this.personalInfoForm;
    const field = form.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} es requerido`;
      }
      if (field.errors['minLength']) {
        return `${this.getFieldDisplayName(fieldName)} es muy corto`;
      }
      if (field.errors['cuitLength']) {
        return field.errors['cuitLength'].message;
      }
      if (field.errors['cbuLength']) {
        return field.errors['cbuLength'].message;
      }
      if (field.errors['renspaLength']) {
        return field.errors['renspaLength'].message;
      }
    }
    return '';
  }

}