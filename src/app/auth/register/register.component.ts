import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { cuitValidator } from '../../core/validators/cuit.validator';
import { ARGENTINA_PROVINCES, Province, City } from '../../core/data/argentina.data';

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

  provinces = ARGENTINA_PROVINCES;
  selectedProvince: Province | null = null;
  cities: City[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      // Paso 1: Información básica
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.pattern(/^[+]?[0-9\s\-()]+$/)]],
      
      // Paso 2: Tipo de usuario
      role: ['', [Validators.required]],
      
      // Paso 3: Información comercial (condicional)
      cuit: [''],
      businessName: [''],
      businessType: [''],
      province: [''],
      city: [''],
      address: ['']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/marketplace']);
    }

    this.setupConditionalValidations();
  }

  private setupConditionalValidations(): void {
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      const cuitControl = this.registerForm.get('cuit');
      const businessNameControl = this.registerForm.get('businessName');
      const businessTypeControl = this.registerForm.get('businessType');
      const provinceControl = this.registerForm.get('province');
      const cityControl = this.registerForm.get('city');

      if (role === 'seller') {
        cuitControl?.setValidators([Validators.required, cuitValidator()]);
        businessNameControl?.setValidators([Validators.required]);
        businessTypeControl?.setValidators([Validators.required]);
        provinceControl?.setValidators([Validators.required]);
        cityControl?.setValidators([Validators.required]);
      } else {
        cuitControl?.clearValidators();
        businessNameControl?.clearValidators();
        businessTypeControl?.clearValidators();
        provinceControl?.clearValidators();
        cityControl?.clearValidators();
      }

      cuitControl?.updateValueAndValidity();
      businessNameControl?.updateValueAndValidity();
      businessTypeControl?.updateValueAndValidity();
      provinceControl?.updateValueAndValidity();
      cityControl?.updateValueAndValidity();
    });

    this.registerForm.get('province')?.valueChanges.subscribe(provinceId => {
      this.selectedProvince = this.provinces.find(p => p.id === provinceId) || null;
      this.cities = this.selectedProvince?.cities || [];
      this.registerForm.get('city')?.setValue('');
    });
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
    if (this.currentStep === 1 && this.isStep1Valid()) {
      this.currentStep = 2;
    } else if (this.currentStep === 2 && this.isStep2Valid()) {
      this.currentStep = 3;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
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
    const roleControl = this.registerForm.get('role');
    return !!(roleControl && roleControl.valid);
  }

  isStep3Valid(): boolean {
    const role = this.registerForm.get('role')?.value;
    if (role === 'buyer') {
      return true;
    }
    
    const step3Fields = ['cuit', 'businessName', 'businessType', 'province', 'city'];
    return step3Fields.every(field => {
      const control = this.registerForm.get(field);
      return control && control.valid;
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid && this.currentStep === 3) {
      this.loading = true;
      this.errorMessage = '';

      const formValue = this.registerForm.value;
      const userData = {
        email: formValue.email,
        password: formValue.password,
        first_name: formValue.firstName,
        last_name: formValue.lastName,
        phone: formValue.phone || undefined,
        role: formValue.role,
        cuit: formValue.cuit || undefined,
        business_name: formValue.businessName || undefined,
        business_type: formValue.businessType || undefined,
        province: formValue.province || undefined,
        city: formValue.city || undefined,
        address: formValue.address || undefined
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
      if (field.errors['cuit']) {
        return field.errors['cuit'].message;
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
      role: 'El tipo de usuario',
      cuit: 'El CUIT',
      businessName: 'El nombre comercial',
      businessType: 'El tipo de negocio',
      province: 'La provincia',
      city: 'La ciudad',
      address: 'La dirección'
    };
    return labels[fieldName] || fieldName;
  }

  get isSeller(): boolean {
    return this.registerForm.get('role')?.value === 'seller';
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
}