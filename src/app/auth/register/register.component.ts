import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { Province, Department, Settlement } from '../../core/models/location.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  currentStep = 1;
  totalSteps = 3;

  // Location data
  provinces: Province[] = [];
  departments: Department[] = [];
  settlements: Settlement[] = [];
  
  selectedProvinceName = '';
  selectedDepartmentName = '';
  selectedSettlementName = '';


  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private locationService: LocationService
  ) {
    this.registerForm = this.formBuilder.group({
      // Paso 1: Información básica
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.pattern(/^[+]?[0-9\s\-()]+$/)]],
      
      // Paso 2: Ubicación
      address: ['', [Validators.required, Validators.minLength(5)]],
      provinceId: ['', [Validators.required]],
      departmentId: [''],
      settlementId: ['', [Validators.required]],
      
      // Paso 3: Registro (role fijo como buyer)
      role: ['buyer']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/marketplace']);
    }
    
    // Load provinces for location selector
    this.loadProvinces();
  }


  private passwordStrengthValidator(control: any) {
    const password = control.value;
    if (!password) {
      return null; // Let required validator handle empty values
    }

    const errors: any = {};

    // Length validation (8-128 characters)
    if (password.length < 8) {
      errors.minLength = { message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (password.length > 128) {
      errors.maxLength = { message: 'La contraseña no debe exceder 128 caracteres' };
    }

    // Character type validations
    if (!/[A-Z]/.test(password)) {
      errors.missingUppercase = { message: 'La contraseña debe contener al menos una letra mayúscula' };
    }
    if (!/[a-z]/.test(password)) {
      errors.missingLowercase = { message: 'La contraseña debe contener al menos una letra minúscula' };
    }
    if (!/[0-9]/.test(password)) {
      errors.missingNumber = { message: 'La contraseña debe contener al menos un número' };
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.missingSpecial = { message: 'La contraseña debe contener al menos un carácter especial (!@#$%^&*)' };
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else if (confirmPassword?.hasError('passwordMismatch')) {
      delete confirmPassword.errors?.['passwordMismatch'];
      if (Object.keys(confirmPassword.errors || {}).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps && this.isCurrentStepValid()) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.isStep1Valid();
      case 2:
        return this.isStep2Valid();
      case 3:
        return this.isStep3Valid();
      default:
        return false;
    }
  }

  isStep1Valid(): boolean {
    const step1Fields = ['email', 'password', 'confirmPassword', 'firstName', 'lastName'];
    return step1Fields.every(field => {
      const control = this.registerForm.get(field);
      return control && control.valid;
    });
  }

  isStep2Valid(): boolean {
    const step2Fields = ['address', 'provinceId', 'settlementId'];
    return step2Fields.every(field => {
      const control = this.registerForm.get(field);
      return control && control.valid;
    }) && !!this.selectedProvinceName && !!this.selectedSettlementName;
  }

  isStep3Valid(): boolean {
    // Step 3 is always valid for simplified flow
    return true;
  }

  onSubmit(): void {
    if (this.registerForm.valid && this.currentStep === 3) {
      this.loading = true;
      this.errorMessage = '';

      const formValue = this.registerForm.value;
      
      // Validate required location data before sending
      if (!formValue.address || !formValue.provinceId || !formValue.settlementId) {
        this.errorMessage = 'Todos los campos de ubicación son obligatorios';
        this.loading = false;
        return;
      }

      if (!this.selectedProvinceName || !this.selectedSettlementName) {
        this.errorMessage = 'Por favor selecciona una provincia y localidad válidas';
        this.loading = false;
        return;
      }

      const userData = {
        email: formValue.email,
        password: formValue.password,
        first_name: formValue.firstName,
        last_name: formValue.lastName,
        phone: formValue.phone || undefined,
        address: formValue.address,
        province_id: formValue.provinceId,
        province_name: this.selectedProvinceName,
        department_id: formValue.departmentId || undefined,
        department_name: this.selectedDepartmentName || undefined,
        settlement_id: formValue.settlementId,
        settlement_name: this.selectedSettlementName,
        role: 'buyer' as const // Always buyer by default
      };

      this.authService.register(userData).subscribe({
        next: (response) => {
          this.router.navigate(['/marketplace']);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Error al registrar usuario';
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (field.errors['email']) {
        return 'Ingresa un correo electrónico válido';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
      }
      // Password strength errors
      if (field.errors['minLength']) {
        return field.errors['minLength'].message;
      }
      if (field.errors['maxLength']) {
        return field.errors['maxLength'].message;
      }
      if (field.errors['missingUppercase']) {
        return field.errors['missingUppercase'].message;
      }
      if (field.errors['missingLowercase']) {
        return field.errors['missingLowercase'].message;
      }
      if (field.errors['missingNumber']) {
        return field.errors['missingNumber'].message;
      }
      if (field.errors['missingSpecial']) {
        return field.errors['missingSpecial'].message;
      }
      if (field.errors['pattern']) {
        return 'Formato inválido';
      }
      if (field.errors['passwordMismatch']) {
        return 'Las contraseñas no coinciden';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'El correo electrónico',
      password: 'La contraseña',
      confirmPassword: 'La confirmación de contraseña',
      firstName: 'El nombre',
      lastName: 'El apellido',
      phone: 'El teléfono',
      address: 'La dirección',
      provinceId: 'La provincia',
      departmentId: 'El departamento',
      settlementId: 'La localidad/asentamiento',
      role: 'El tipo de usuario'
    };
    return labels[fieldName] || fieldName;
  }


  // Password validation helper methods
  passwordHasMinLength(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return password.length >= 8;
  }

  passwordHasMaxLength(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return password.length <= 128;
  }

  passwordHasUppercase(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[A-Z]/.test(password);
  }

  passwordHasLowercase(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[a-z]/.test(password);
  }

  passwordHasNumber(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[0-9]/.test(password);
  }

  passwordHasSpecialChar(): boolean {
    const password = this.registerForm.get('password')?.value || '';
    return /[!@#$%^&*]/.test(password);
  }

  // Location methods
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

  onProvinceChange(): void {
    const provinceId = this.registerForm.get('provinceId')?.value;
    if (provinceId) {
      const selectedProvince = this.provinces.find(p => p.id === provinceId);
      this.selectedProvinceName = selectedProvince?.nombre || '';
      
      // Reset dependent fields
      this.registerForm.get('departmentId')?.setValue('');
      this.registerForm.get('settlementId')?.setValue('');
      this.departments = [];
      this.settlements = [];
      this.selectedDepartmentName = '';
      this.selectedSettlementName = '';

      // Load departments for selected province
      this.loadDepartments(selectedProvince?.nombre || '');
      this.loadSettlements(selectedProvince?.nombre || '');
    } else {
      // Clear all dependent data when no province selected
      this.registerForm.get('departmentId')?.setValue('');
      this.registerForm.get('settlementId')?.setValue('');
      this.departments = [];
      this.settlements = [];
      this.selectedProvinceName = '';
      this.selectedDepartmentName = '';
      this.selectedSettlementName = '';
    }
  }

  onDepartmentChange(): void {
    const departmentId = this.registerForm.get('departmentId')?.value;
    if (departmentId) {
      const selectedDepartment = this.departments.find(d => d.id === departmentId);
      this.selectedDepartmentName = selectedDepartment?.nombre || '';
      
      // Reset settlement field and reload settlements filtered by department
      this.registerForm.get('settlementId')?.setValue('');
      this.selectedSettlementName = '';
      
      // Reload settlements filtered by province and department
      const provinceId = this.registerForm.get('provinceId')?.value;
      const selectedProvince = this.provinces.find(p => p.id === provinceId);
      if (selectedProvince) {
        this.loadSettlements(selectedProvince.nombre, selectedDepartment?.nombre);
      }
    } else {
      // Clear dependent fields when no department selected
      this.registerForm.get('settlementId')?.setValue('');
      this.selectedDepartmentName = '';
      this.selectedSettlementName = '';
      
      // Reload settlements without department filter
      const provinceId = this.registerForm.get('provinceId')?.value;
      const selectedProvince = this.provinces.find(p => p.id === provinceId);
      if (selectedProvince) {
        this.loadSettlements(selectedProvince.nombre);
      }
    }
  }

  onSettlementChange(): void {
    const settlementId = this.registerForm.get('settlementId')?.value;
    if (settlementId) {
      const selectedSettlement = this.settlements.find(s => s.id === settlementId);
      this.selectedSettlementName = selectedSettlement?.nombre || '';
    } else {
      // Clear settlement name when no settlement selected
      this.selectedSettlementName = '';
    }
  }

  private loadDepartments(provinceName: string): void {
    this.locationService.getDepartments({ provincia: provinceName }).subscribe({
      next: (response) => {
        this.departments = response.departamentos;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  private loadSettlements(provinceName: string, departmentName?: string): void {
    const params: any = { provincia: provinceName };
    if (departmentName) {
      params.departamento = departmentName;
    }

    this.locationService.getSettlements(params).subscribe({
      next: (response) => {
        this.settlements = response.asentamientos;
      },
      error: (error) => {
        console.error('Error loading settlements:', error);
      }
    });
  }

  getLocationSummary(): string {
    const parts = [];
    if (this.selectedSettlementName) parts.push(this.selectedSettlementName);
    if (this.selectedDepartmentName) parts.push(this.selectedDepartmentName);
    if (this.selectedProvinceName) parts.push(this.selectedProvinceName);
    return parts.join(', ') || 'No especificado';
  }
}